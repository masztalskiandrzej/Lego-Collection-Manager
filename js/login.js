/**
 * Login Page Handler
 * Manages authentication forms on the login page
 */

// Skrót do tłumaczeń (bezpieczny, gdyby I18N nie był dostępny)
const t = (k, v) => (window.I18N ? window.I18N.t(k, v) : k);

// Wait for Auth module to load
let authCheckInterval;
let authCheckCount = 0;
const MAX_AUTH_CHECKS = 100;

function waitForAuth() {
    authCheckCount++;

    if (window.Auth && window.Auth.init) {
        clearInterval(authCheckInterval);
        initLoginPage();
    } else if (authCheckCount >= MAX_AUTH_CHECKS) {
        clearInterval(authCheckInterval);
        showNotification(t('auth.moduleNotLoadedLong'), 'error');
    }
}

// Start checking for Auth module
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        authCheckInterval = setInterval(waitForAuth, 100);
    });
} else {
    authCheckInterval = setInterval(waitForAuth, 100);
}

function initLoginPage() {

    // Forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const verificationForm = document.getElementById('verificationForm');
    const loadingState = document.getElementById('loadingState');

    // Form switching
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');
    const backToLoginLink = document.getElementById('backToLoginLink');

    // Buttons
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resendCodeBtn = document.getElementById('resendCodeBtn');

    // Form switching listeners
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
            await handleCheckVerification();
        });
    }

    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', async () => {
            await handleResendCode();
        });
    }

}

// ===== Form Switching =====

function switchToLogin() {
    hideAllForms();
    document.getElementById('loginForm').classList.add('active');
}

function switchToRegister() {
    hideAllForms();
    document.getElementById('registerForm').classList.add('active');
}

function switchToVerification() {
    hideAllForms();
    document.getElementById('verificationForm').classList.add('active');
    const checkBtn = document.getElementById('verifyCodeBtn');
    if (checkBtn) checkBtn.focus();
}

function showLoading() {
    hideAllForms();
    document.getElementById('loadingState').classList.add('active');
}

function hideAllForms() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('verificationForm').classList.remove('active');
    document.getElementById('loadingState').classList.remove('active');
}

// ===== Auth Handlers =====

async function handleLogin() {
    if (!window.Auth) {
        showNotification(t('auth.moduleNotLoaded'), 'error');
        return;
    }

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading();

    try {
        const result = await window.Auth.login(email, password);

        if (result.success) {
            showNotification(t('auth.loginSuccess'), 'success');
            // Redirect to index.html after successful login
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else if (result.requiresVerification) {
            // Email niezweryfikowany — link wysłany; zaloguj się po kliknięciu
            showNotification(result.message, 'warning');
            Dialogs.alert(result.message, { type: 'info' });
            switchToLogin();
        } else {
            showNotification(result.error || t('auth.loginFailed'), 'error');
            switchToLogin();
        }
    } catch (error) {
        showNotification(error.message || t('auth.loginFailed'), 'error');
        switchToLogin();
    }
}

async function handleRegister() {
    if (!window.Auth) {
        showNotification(t('auth.moduleNotLoaded'), 'error');
        return;
    }

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;

    if (password !== confirmPassword) {
        showNotification(t('auth.passwordsNoMatch'), 'error');
        return;
    }

    showLoading();

    try {
        const result = await window.Auth.register(email, password);

        if (result.success || result.requiresVerification) {
            showNotification(t('auth.regLinkSent'), 'success');
            switchToVerification();
        } else {
            showNotification(result.error || t('auth.registerFailed'), 'error');
            switchToRegister();
        }
    } catch (error) {
        showNotification(error.message || t('auth.registerFailed'), 'error');
        switchToRegister();
    }
}

async function handleCheckVerification() {
    if (!window.Auth) {
        showNotification(t('auth.moduleNotLoaded'), 'error');
        return;
    }

    showLoading();

    try {
        const verified = await window.Auth.checkVerification();

        if (verified) {
            showNotification(t('auth.emailVerified'), 'success');
            // Redirect to index.html after successful verification
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showNotification(t('auth.notVerifiedYet'), 'warning');
            switchToVerification();
        }
    } catch (error) {
        showNotification(error.message || t('auth.verifyFailed'), 'error');
        switchToVerification();
    }
}

async function handleResendCode() {
    if (!window.Auth) {
        showNotification(t('auth.moduleNotLoaded'), 'error');
        return;
    }

    try {
        await window.Auth.resendVerification();
        showNotification(t('auth.linkResent'), 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== Notifications =====

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = notification.querySelector('.notification-message');

    if (!notification || !notificationMessage) return;

    notificationMessage.textContent = message;

    // Remove all type classes
    notification.classList.remove('show', 'success', 'error', 'warning');

    // Add type class
    notification.classList.add(type);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}
