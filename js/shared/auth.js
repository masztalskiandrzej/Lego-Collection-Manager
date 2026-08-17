/**
 * Authentication Module - Firebase Authentication (Compat Version)
 *
 * Works with file:// protocol (no ES6 modules required)
 *
 * Obsługuje:
 * - Rejestrację z 4-cyfrowym kodem weryfikacyjnym
 * - Logowanie (wymaga zweryfikowanego emaila)
 * - Weryfikację kodu
 * - Wylogowanie
 * - Śledzenie stanu autentykacji
 */

const Auth = {
    currentUser: null,
    verificationCode: null,
    pendingUser: null,
    authStateCallback: null,
    initialAuthStateDetermined: false,
    initialAuthStatePromise: null,
    _auth: null,
    _db: null,
    _functions: null,
    emailServiceEnabled: true, // Set to false to fallback to console logging

    /**
     * Inicjalizacja modułu autentykacji
     */
    init() {
        // Initialize Firebase first
        if (!window.initFirebase()) {
            return;
        }

        this._auth = window.getFirebaseAuth();
        this._db = window.getFirebaseDb();
        this._functions = window.getFirebaseFunctions ? window.getFirebaseFunctions() : null;

        // Check if Cloud Functions are available
        if (this._functions) {
        } else {
            this.emailServiceEnabled = false;
        }

        // Twórz promise dla początkowego stanu autentykacji
        this.initialAuthStatePromise = new Promise((resolve) => {
            // Nasłuchuj zmian stanu autentykacji
            this._auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.initialAuthStateDetermined = true;

                if (this.authStateCallback) {
                    this.authStateCallback(user);
                }

                if (user) {
                } else {
                }

                // Resolve promise po ustaleniu stanu
                resolve(user);
            });
        });

    },

    /**
     * Wygeneruj 4-cyfrowy kod weryfikacyjny
     * @returns {string} - 4-cyfrowy kod
     */
    generateVerificationCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },

    /**
     * Wyślij natywny link weryfikacyjny Firebase (opcja A)
     * Google wysyła maila z linkiem; po kliknięciu user.emailVerified = true.
     * @param {object} user - Zalogowany użytkownik Firebase
     */
    async sendVerificationLink(user) {
        const actionCodeSettings = {
            url: window.location.origin + '/login.html',
            handleCodeInApp: false
        };
        await user.sendEmailVerification(actionCodeSettings);
    },

    /**
     * Zarejestruj nowego użytkownika
     * @param {string} email - Email użytkownika
     * @param {string} password - Hasło (min. 6 znaków)
     * @returns {Promise<{success: boolean, code: string, user: object}>}
     */
    async register(email, password) {
        try {
            // Utwórz konto Firebase Auth
            const userCredential = await this._auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Zapisz użytkownika jako oczekującego na weryfikację
            this.pendingUser = user;

            // Zapisz profil w Firestore (flaga emailVerified podniesie się
            // po kliknięciu natywnego linku Firebase)
            await this._db.collection('users').doc(user.uid)
                .collection('profile').doc('userData').set({
                    email: user.email,
                    emailVerified: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: null
                });

            // Wyślij natywny link weryfikacyjny
            await this.sendVerificationLink(user);

            return {
                success: true,
                user: {
                    email: user.email,
                    uid: user.uid
                },
                requiresVerification: true
            };
        } catch (error) {
            throw this.handleAuthError(error);
        }
    },

    /**
     * Sprawdź, czy użytkownik kliknął link w mailu (odświeża token).
     * @returns {Promise<boolean>} - True jeśli email zweryfikowany
     */
    async checkVerification() {
        const user = this.pendingUser || this.currentUser;
        if (!user) {
            throw new Error('Brak użytkownika do weryfikacji.');
        }

        await user.reload();

        if (user.emailVerified) {
            // Podnieś flagę w Firestore (bramka dostępu do aplikacji)
            await this._db.collection('users').doc(user.uid)
                .collection('profile').doc('userData').set({
                    emailVerified: true,
                    verificationCode: null,
                    verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            this.pendingUser = null;
            return true;
        }
        return false;
    },

    /**
     * Wyślij link weryfikacyjny ponownie (Firebase sam limituje częstotliwość)
     */
    async resendVerification() {
        const user = this.pendingUser || this.currentUser;
        if (!user) {
            throw new Error('Brak użytkownika do weryfikacji.');
        }
        await this.sendVerificationLink(user);
    },

    /**
     * Zaloguj użytkownika
     * @param {string} email - Email
     * @param {string} password - Hasło
     * @returns {Promise<{success: boolean, user: object}>}
     */
    async login(email, password) {
        try {
            // Zaloguj przez Firebase Auth
            const userCredential = await this._auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Odśwież token, żeby emailVerified był aktualny (po kliknięciu linku)
            await user.reload();

            const userDocRef = this._db.collection('users').doc(user.uid)
                .collection('profile').doc('userData');
            const userDoc = await userDocRef.get();

            if (!userDoc.exists) {
                // Nowy użytkownik bez profilu - utwórz profil
                await userDocRef.set({
                    email: user.email,
                    emailVerified: user.emailVerified === true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const userData = userDoc.data();

                if (!userData.emailVerified) {
                    if (user.emailVerified) {
                        // Kliknięto link (natywnie OK) -> podnieś flagę i wpuszczaj
                        await userDocRef.set({
                            emailVerified: true,
                            verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    } else {
                        // Nieweryfikowany: wyślij link, wyloguj, poproś o powrót
                        await this.sendVerificationLink(user);
                        await this._auth.signOut();
                        return {
                            success: false,
                            requiresVerification: true,
                            email: user.email,
                            message: window.t ? window.t('auth.linkSentRelogin', { email: user.email })
                                               : 'Zweryfikuj email linkiem i zaloguj się ponownie.'
                        };
                    }
                } else {
                    // Zweryfikowany (także legacy konta sprzed migracji) -> wpuszczaj
                    await userDocRef.set({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            }

            this.currentUser = user;

            return {
                success: true,
                user: {
                    email: user.email,
                    uid: user.uid
                }
            };
        } catch (error) {
            throw this.handleAuthError(error);
        }
    },

    /**
     * Wyloguj użytkownika
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            await this._auth.signOut();
            this.currentUser = null;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Sprawdź czy użytkownik jest zalogowany
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.currentUser !== null;
    },

    /**
     * Czekaj na ustalenie początkowego stanu autentykacji
     * @returns {Promise<boolean>}
     */
    waitForAuthState() {
        if (this.initialAuthStateDetermined) {
            return Promise.resolve(this.currentUser !== null);
        }
        return this.initialAuthStatePromise.then((user) => user !== null);
    },

    /**
     * Pobierz ID aktualnego użytkownika
     * @returns {string|null}
     */
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    },

    /**
     * Pobierz email aktualnego użytkownika
     * @returns {string|null}
     */
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    },

    /**
     * Ustaw callback dla zmian stanu autentykacji
     * @param {Function} callback - Funkcja callback(user)
     */
    set onAuthStateChanged(callback) {
        this.authStateCallback = callback;
    },

    /**
     * Obsługa błędów Firebase Authentication
     * @param {Error} error - Błąd z Firebase
     * @returns {Error} - Błąd z przyjaznym komunikatem
     */
    handleAuthError(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'Ten email jest już zarejestrowany.',
            'auth/invalid-email': 'Nieprawidłowy adres email.',
            'auth/operation-not-allowed': 'Konta email/hasło nie są włączone.',
            'auth/weak-password': 'Hasło musi mieć minimum 6 znaków.',
            'auth/user-disabled': 'To konto zostało wyłączone.',
            'auth/user-not-found': 'Nie znaleziono konta z tym emailem.',
            'auth/wrong-password': 'Nieprawidłowe hasło.',
            'auth/network-request-failed': 'Błąd sieci. Sprawdź połączenie internetowe.',
            'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie później.',
            'auth/invalid-credential': 'Nieprawidłowe dane logowania.',
            'auth/missing-password': 'Wprowadź hasło.'
        };

        const message = errorMessages[error.code] || error.message;
        return new Error(message);
    }
};

// Make globally available
window.Auth = Auth;
