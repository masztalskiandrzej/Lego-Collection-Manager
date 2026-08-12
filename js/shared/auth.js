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
     * Wyślij email z kodem weryfikacyjnym przez Cloud Function
     * @param {string} email - Adres email odbiorcy
     * @param {string} code - 4-cyfrowy kod weryfikacyjny
     * @returns {Promise<{success: boolean, method: string}>}
     */
    async sendVerificationEmail(email, code) {
        // Try Cloud Function first
        if (this.emailServiceEnabled && this._functions) {
            try {
                const sendEmail = this._functions.httpsCallable('sendVerificationEmail');
                const result = await sendEmail({
                    email: email,
                    code: code,
                    language: 'pl'
                });

                if (result.data.success) {
                    return { success: true, method: 'cloud_function' };
                }
            } catch (error) {
                // Fallback to console
            }
        }

        // Fallback: Display code in console (for development or if email fails)

        return { success: true, method: 'console_fallback' };
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

            // Wygeneruj 4-cyfrowy kod
            this.verificationCode = this.generateVerificationCode();

            // Zapisz dane użytkownika w Firestore z kodem weryfikacyjnym
            await this._db.collection('users').doc(user.uid)
                .collection('profile').doc('userData').set({
                    email: user.email,
                    emailVerified: false,
                    verificationCode: this.verificationCode,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: null
                });

            // Wyślij email z kodem weryfikacyjnym
            const emailResult = await this.sendVerificationEmail(user.email, this.verificationCode);

            return {
                success: true,
                code: this.verificationCode,
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
     * Zweryfikuj 4-cyfrowy kod
     * @param {string} code - Kod wprowadzony przez użytkownika
     * @returns {Promise<boolean>} - True jeśli kod poprawny
     */
    async verifyCode(code) {
        const user = this.currentUser;

        if (!user) {
            throw new Error('Brak zalogowanego użytkownika. Zarejestruj się ponownie.');
        }

        try {
            // Pobierz dane użytkownika z Firestore
            const userDocRef = this._db.collection('users').doc(user.uid)
                .collection('profile').doc('userData');
            const userDoc = await userDocRef.get();

            if (!userDoc.exists) {
                throw new Error('Nie znaleziono danych użytkownika');
            }

            const userData = userDoc.data();

            // Sprawdź kod
            if (userData.verificationCode === code) {

                // Oznacz email jako zweryfikowany
                await userDocRef.set({
                    emailVerified: true,
                    verificationCode: null,
                    verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Wyczyść dane tymczasowe
                this.pendingUser = null;
                this.verificationCode = null;

                return true;
            } else {
                throw new Error('Nieprawidłowy kod weryfikacyjny');
            }
        } catch (error) {
            throw error;
        }
    },

    /**
     * Wyślij ponownie kod weryfikacyjny
     * @returns {Promise<string>} - Nowy kod
     */
    async resendCode() {
        if (!this.pendingUser && !this.currentUser) {
            throw new Error('Brak użytkownika do weryfikacji');
        }

        const user = this.pendingUser || this.currentUser;

        try {
            // Wygeneruj nowy kod
            this.verificationCode = this.generateVerificationCode();

            // Zaktualizuj w Firestore
            await this._db.collection('users').doc(user.uid)
                .collection('profile').doc('userData').set({
                    verificationCode: this.verificationCode,
                    codeResentAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            // Wyślij email z nowym kodem
            const emailResult = await this.sendVerificationEmail(user.email, this.verificationCode);

            return this.verificationCode;
        } catch (error) {
            throw error;
        }
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

            // Sprawdź czy email został zweryfikowany
            const userDocRef = this._db.collection('users').doc(user.uid)
                .collection('profile').doc('userData');
            const userDoc = await userDocRef.get();

            if (!userDoc.exists) {
                // Nowy użytkownik bez profilu - utwórz profil
                await userDocRef.set({
                    email: user.email,
                    emailVerified: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const userData = userDoc.data();

                // Sprawdź czy email zweryfikowany w naszym systemie
                if (!userData.emailVerified) {
                    await this._auth.signOut();
                    return {
                        success: false,
                        requiresVerification: true,
                        email: user.email,
                        message: 'Email nie został zweryfikowany. Sprawdź konsolę (F12) aby zobaczyć kod weryfikacyjny.'
                    };
                }

                // Zaktualizuj czas ostatniego logowania
                await userDocRef.set({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
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
