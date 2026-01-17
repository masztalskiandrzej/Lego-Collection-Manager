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

    /**
     * Inicjalizacja modułu autentykacji
     */
    init() {
        // Initialize Firebase first
        if (!window.initFirebase()) {
            console.error('❌ Cannot initialize Auth - Firebase not available');
            return;
        }

        this._auth = window.getFirebaseAuth();
        this._db = window.getFirebaseDb();

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
                    console.log('👤 Użytkownik zalogowany:', user.email);
                } else {
                    console.log('👤 Użytkownik wylogowany');
                }

                // Resolve promise po ustaleniu stanu
                resolve(user);
            });
        });

        console.log('🔐 Auth module zainicjalizowany');
    },

    /**
     * Wygeneruj 4-cyfrowy kod weryfikacyjny
     * @returns {string} - 4-cyfrowy kod
     */
    generateVerificationCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
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

            console.log('✅ Konto utworzone:', user.email);

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

            console.log('✅ Dane użytkownika zapisane w Firestore');

            // Wyślij email weryfikacyjny Firebase (opcjonalnie, jako backup)
            try {
                await user.sendEmailVerification();
                console.log('📧 Email weryfikacyjny Firebase wysłany');
            } catch (emailError) {
                console.warn('⚠️ Nie udało się wysłać emaila Firebase:', emailError.message);
            }

            // TYMCZASOWE: Wyświetl kod w konsoli
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 KOD WERYFIKACYJNY:', this.verificationCode);
            console.log('   (w produkcji zostanie wysłany na email)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
            console.error('❌ Błąd rejestracji:', error);
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
                console.log('✅ Kod weryfikacyjny poprawny!');

                // Oznacz email jako zweryfikowany
                await userDocRef.set({
                    emailVerified: true,
                    verificationCode: null,
                    verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                console.log('✅ Email zweryfikowany pomyślnie');

                // Wyczyść dane tymczasowe
                this.pendingUser = null;
                this.verificationCode = null;

                return true;
            } else {
                throw new Error('Nieprawidłowy kod weryfikacyjny');
            }
        } catch (error) {
            console.error('❌ Błąd weryfikacji:', error);
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

            // Wyświetl nowy kod (TYMCZASOWE)
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 NOWY KOD WERYFIKACYJNY:', this.verificationCode);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            console.log('✅ Kod wysłany ponownie');
            return this.verificationCode;
        } catch (error) {
            console.error('❌ Błąd wysyłania kodu:', error);
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

            console.log('🔓 Logowanie...', user.email);

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
                    console.log('⚠️ Email nie zweryfikowany:', user.email);
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
            console.log('✅ Zalogowano pomyślnie!');

            return {
                success: true,
                user: {
                    email: user.email,
                    uid: user.uid
                }
            };
        } catch (error) {
            console.error('❌ Błąd logowania:', error);
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
            console.log('👋 Wylogowano pomyślnie');
        } catch (error) {
            console.error('❌ Błąd wylogowania:', error);
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
console.log('🔐 Auth module loaded (compat version)');
