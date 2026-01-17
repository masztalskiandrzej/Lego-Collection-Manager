/**
 * Home Page Authentication Handler
 * Lightweight auth UI for the homepage
 */

// Wait for Firebase Auth module to load
let authCheckInterval;
let authCheckCount = 0;
const MAX_AUTH_CHECKS = 100; // 10 seconds max

function waitForAuth() {
    authCheckCount++;

    if (window.Auth && window.Auth.init) {
        clearInterval(authCheckInterval);
        console.log('✅ Auth module found after', authCheckCount * 100, 'ms');
        initHomeAuth();
    } else if (authCheckCount >= MAX_AUTH_CHECKS) {
        clearInterval(authCheckInterval);
        console.error('❌ Auth module not found after', MAX_AUTH_CHECKS * 100, 'ms');
        console.error('Make sure firebase-config.js and auth.js are loaded correctly');
        // Still initialize UI without Auth module
        initHomeAuth();
    }
}

// Wait for DOM to be ready, then check for Auth module
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, starting Auth module check...');
        // Check every 100ms for Auth module
        authCheckInterval = setInterval(waitForAuth, 100);
    });
} else {
    // DOM is already ready
    console.log('📄 DOM already ready, starting Auth module check...');
    authCheckInterval = setInterval(waitForAuth, 100);
}

function initHomeAuth() {
    console.log('🏠 Initializing home page auth...');

    const loginBtn = document.getElementById('homeLoginBtn');
    const authModal = document.getElementById('authModalOverlay');
    const authModalCloseBtn = document.getElementById('authModalCloseBtn');

    // Forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const verificationForm = document.getElementById('verificationForm');
    const authLoading = document.getElementById('authLoading');

    // Form switching
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');
    const backToLoginLink = document.getElementById('backToLoginLink');

    // Buttons
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resendCodeBtn = document.getElementById('resendCodeBtn');

    // Initialize auth state
    if (window.Auth && window.Auth.isAuthenticated()) {
        updateLoginButton(true);
    }

    // Auth state change listener
    if (window.Auth) {
        window.Auth.onAuthStateChanged = (user) => {
            updateLoginButton(!!user);
        };
    }

    // Login button click
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            if (window.Auth && window.Auth.isAuthenticated()) {
                // Toggle user dropdown menu
                e.stopPropagation();
                toggleUserDropdown();
            } else {
                // Show login modal
                showAuthModal();
            }
        });
    }

    // User dropdown elements
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');

    // Logout dropdown button
    if (logoutDropdownBtn) {
        logoutDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideUserDropdown();
            handleLogout();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        if (userDropdownMenu && userDropdownMenu.classList.contains('active')) {
            hideUserDropdown();
        }
    });

    // Modal close button
    if (authModalCloseBtn) {
        authModalCloseBtn.addEventListener('click', hideAuthModal);
    }

    // Click outside to close
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                hideAuthModal();
            }
        });
    }

    // Form switching
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchToRegister();
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLogin();
        });
    }

    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLogin();
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleRegister();
        });
    }

    // Verification
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', async () => {
            await handleVerifyCode();
        });
    }

    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', async () => {
            await handleResendCode();
        });
    }

    console.log('✅ Home auth initialized');
}

// ===== Modal Management =====

function showAuthModal() {
    const authModal = document.getElementById('authModalOverlay');
    if (authModal) {
        authModal.classList.add('active');
        switchToLogin(); // Always start with login form

        // Wyłącz panele - nie blokuj modalu
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            panel.style.pointerEvents = 'none';
        });
    }
}

function hideAuthModal() {
    const authModal = document.getElementById('authModalOverlay');
    if (authModal) {
        authModal.classList.remove('active');

        // Włącz z powrotem panele
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            panel.style.pointerEvents = 'auto';
        });
    }
}

function toggleUserDropdown() {
    const loginBtn = document.getElementById('homeLoginBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (!loginBtn || !userDropdownMenu) return;

    const isActive = userDropdownMenu.classList.contains('active');

    if (isActive) {
        hideUserDropdown();
    } else {
        userDropdownMenu.classList.add('active');
        loginBtn.classList.add('dropdown-active');
    }
}

function hideUserDropdown() {
    const loginBtn = document.getElementById('homeLoginBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userDropdownMenu) {
        userDropdownMenu.classList.remove('active');
    }
    if (loginBtn) {
        loginBtn.classList.remove('dropdown-active');
    }
}

function switchToLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('verificationForm').style.display = 'none';
    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('authModalTitle').textContent = 'Log In';
}

function switchToRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('verificationForm').style.display = 'none';
    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('authModalTitle').textContent = 'Register';
}

function switchToVerification() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('verificationForm').style.display = 'block';
    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('authModalTitle').textContent = 'Verify Email';
}

function showLoading() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('verificationForm').style.display = 'none';
    document.getElementById('authLoading').style.display = 'block';
}

// ===== Auth Handlers =====

async function handleLogin() {
    if (!window.Auth) {
        showNotification('Authentication module not loaded', 'error');
        return;
    }

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading();

    try {
        const result = await window.Auth.login(email, password);

        if (result.success) {
            showNotification('Login successful!', 'success');
            hideAuthModal();
            updateLoginButton(true);
        } else if (result.requiresVerification) {
            // Email nie jest zweryfikowany - zaoferuj ponowne wysłanie kodu
            showNotification(result.message, 'warning');
            showResendCodeOptions(email, password);
        } else {
            showNotification(result.error || 'Login failed', 'error');
            switchToLogin();
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed: ' + error.message, 'error');
        switchToLogin();
    }
}

// Pokaż opcję ponownego wysłania kodu
async function showResendCodeOptions(email, password) {
    if (confirm('Twój email nie został zweryfikowany.\n\nCzy chcesz wygenerować nowy kod weryfikacyjny?\n(Sprawdź konsolę F12 aby zobaczyć kod)')) {
        try {
            const result = await window.Auth.resendCodeForUnverifiedUser(email, password);

            if (result.success) {
                showNotification('Nowy kod wygenerowany! Sprawdź konsolę (F12)', 'success');

                // Ustaw email i hasło z powrotem w formularzu logowania
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = password;

                // Przełącz na formularz weryfikacji
                document.getElementById('verificationCode').value = '';
                switchToVerification();
            }
        } catch (error) {
            showNotification('Błąd: ' + error.message, 'error');
            switchToLogin();
        }
    } else {
        switchToLogin();
    }
}

async function handleRegister() {
    if (!window.Auth) {
        showNotification('Authentication module not loaded', 'error');
        return;
    }

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    showLoading();

    try {
        const result = await window.Auth.register(email, password);

        if (result.success) {
            showNotification('Registration successful! Check console for verification code.', 'success');
            switchToVerification();
        } else {
            showNotification(result.error, 'error');
            switchToRegister();
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed: ' + error.message, 'error');
        switchToRegister();
    }
}

async function handleVerifyCode() {
    if (!window.Auth) {
        showNotification('Authentication module not loaded', 'error');
        return;
    }

    const code = document.getElementById('verificationCode').value;

    if (!code || code.length !== 4) {
        showNotification('Please enter a 4-digit code', 'error');
        return;
    }

    showLoading();

    try {
        const verified = await window.Auth.verifyCode(code);

        if (verified) {
            showNotification('Email verified successfully! You are now logged in.', 'success');
            hideAuthModal();
            updateLoginButton(true); // Użytkownik jest już zalogowany
        } else {
            showNotification('Invalid verification code', 'error');
            switchToVerification();
        }
    } catch (error) {
        console.error('Verification error:', error);
        showNotification('Verification failed: ' + error.message, 'error');
        switchToVerification();
    }
}

async function handleResendCode() {
    if (!window.Auth) {
        showNotification('Authentication module not loaded', 'error');
        return;
    }

    try {
        const result = await window.Auth.resendCode();

        if (result.success) {
            showNotification('Verification code resent! Check console.', 'success');
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        console.error('Resend error:', error);
        showNotification('Failed to resend code: ' + error.message, 'error');
    }
}

async function handleLogout() {
    if (!window.Auth) {
        showNotification('Authentication module not loaded', 'error');
        return;
    }

    try {
        await window.Auth.logout();
        showNotification('Logged out successfully', 'success');
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed: ' + error.message, 'error');
    }
}

// ===== UI Updates =====

function updateLoginButton(isLoggedIn) {
    const loginBtn = document.getElementById('homeLoginBtn');
    if (!loginBtn) return;

    const dropdownArrow = loginBtn.querySelector('.user-dropdown-arrow');

    if (isLoggedIn) {
        const email = window.Auth ? window.Auth.getUserEmail() : '';
        const username = email ? email.split('@')[0] : 'User';
        loginBtn.querySelector('.login-text').textContent = username;
        loginBtn.classList.add('logged-in');

        // Show dropdown arrow when logged in
        if (dropdownArrow) {
            dropdownArrow.style.display = 'inline';
        }
    } else {
        loginBtn.querySelector('.login-text').textContent = 'Log In';
        loginBtn.classList.remove('logged-in');

        // Hide dropdown arrow when logged out
        if (dropdownArrow) {
            dropdownArrow.style.display = 'none';
        }

        // Hide dropdown if open
        hideUserDropdown();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');

    if (!notification || !notificationMessage) return;

    notificationMessage.textContent = message;

    notification.classList.remove('show', 'error', 'success');

    if (type === 'error') {
        notification.classList.add('error');
    } else if (type === 'success') {
        notification.classList.add('success');
    }

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

console.log('🏠 Home auth script loaded');
