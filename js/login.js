/**
 * Login Page Handler
 * Manages authentication forms on the login page
 */

// Wait for Auth module to load
let authCheckInterval;
let authCheckCount = 0;
const MAX_AUTH_CHECKS = 100;

function waitForAuth() {
    authCheckCount++;

    if (window.Auth && window.Auth.init) {
        clearInterval(authCheckInterval);
        console.log('✅ Auth module found after', authCheckCount * 100, 'ms');
        initLoginPage();
    } else if (authCheckCount >= MAX_AUTH_CHECKS) {
        clearInterval(authCheckInterval);
        console.error('❌ Auth module not found after', MAX_AUTH_CHECKS * 100, 'ms');
        showNotification('Authentication module not loaded. Please refresh the page.', 'error');
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
    console.log('🔐 Initializing login page...');

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
            await handleVerifyCode();
        });
    }

    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', async () => {
            await handleResendCode();
        });
    }

    // Handle Enter key in verification code input
    const verificationInput = document.getElementById('verificationCode');
    if (verificationInput) {
        verificationInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && verificationInput.value.length === 4) {
                await handleVerifyCode();
            }
        });

        // Auto-format input (only numbers, max 4 digits)
        verificationInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    }

    console.log('✅ Login page initialized');
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
    // Clear and focus verification code input
    const codeInput = document.getElementById('verificationCode');
    if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
    }
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
        showNotification('Authentication module not loaded', 'error');
        return;
    }

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading();

    try {
        const result = await window.Auth.login(email, password);

        if (result.success) {
            showNotification('Login successful! Redirecting...', 'success');
            // Redirect to index.html after successful login
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
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
        showNotification(error.message || 'Login failed', 'error');
        switchToLogin();
    }
}

async function showResendCodeOptions(email, password) {
    // Pokaż dialog z opcją ponownego wysłania kodu
    if (confirm('Your email is not verified.\n\nDo you want to generate a new verification code?\n(Check console F12 to see the code)')) {
        try {
            const result = await window.Auth.resendCodeForUnverifiedUser(email, password);

            if (result.success) {
                showNotification('New code generated! Check console (F12)', 'success');
                switchToVerification();
            }
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
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

        if (result.success || result.requiresVerification) {
            showNotification('Registration successful! Check console for verification code.', 'success');
            switchToVerification();
        } else {
            showNotification(result.error || 'Registration failed', 'error');
            switchToRegister();
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed', 'error');
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
            showNotification('Email verified! Redirecting...', 'success');
            // Redirect to index.html after successful verification
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showNotification('Invalid verification code', 'error');
            switchToVerification();
        }
    } catch (error) {
        console.error('Verification error:', error);
        showNotification(error.message || 'Verification failed', 'error');
        switchToVerification();
    }
}

async function handleResendCode() {
    if (!window.Auth) {
        showNotification('Authentication module not loaded', 'error');
        return;
    }

    try {
        const code = await window.Auth.resendCode();
        showNotification('New verification code sent! Check console.', 'success');
    } catch (error) {
        console.error('Resend error:', error);
        showNotification('Failed to resend code: ' + error.message, 'error');
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

console.log('🔐 Login page script loaded');
