/**
 * Main Application - Minifigures Collection Manager
 * Initializes app and handles all user interactions
 */

const App = {
    // Current state
    state: {
        filters: {
            theme: 'all',
            status: 'all',
            condition: 'all',
            yearMin: null,
            yearMax: null,
            search: ''
        },
        sort: {
            by: 'name',
            ascending: true
        },
        view: 'grid',
        // Authentication state
        user: null,
        isAuthenticated: false
    },

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Minifigures Collection Manager...');

        // Initialize UI
        UI.init();

        // Wait for Auth module to be available (polling mechanism)
        console.log('⏳ Waiting for Auth module...');
        let authWaitCount = 0;
        const MAX_AUTH_WAIT = 50; // 5 seconds max

        while (typeof window.Auth === 'undefined' && authWaitCount < MAX_AUTH_WAIT) {
            await new Promise(resolve => setTimeout(resolve, 100));
            authWaitCount++;
        }

        if (typeof window.Auth === 'undefined') {
            console.warn('⚠️ Auth module not available after 5 seconds - continuing without auth');
        } else {
            console.log('✅ Auth module found after', authWaitCount * 100, 'ms');
        }

        // Set up auth state change listener
        if (window.Auth) {
            window.Auth.onAuthStateChanged = this.handleAuthStateChange.bind(this);
            console.log('✅ Auth state listener configured');

            // Wait for initial auth state to be determined before checking
            console.log('⏳ Waiting for auth state to be determined...');
            const isLoggedIn = await window.Auth.waitForAuthState();
            console.log('🔓 Auth state determined:', isLoggedIn ? 'Logged in' : 'Not logged in');

            // REQUIRES authentication - show login overlay if not logged in
            if (!isLoggedIn) {
                console.warn('🔒 User not authenticated - showing login overlay');
                this.showLoginRequiredOverlay();

                // Bind events so buttons work
                this.bindEvents();
                console.log('✅ Login overlay active, waiting for user action...');
                return;
            }

            console.log('✅ User already authenticated');
            this.state.isAuthenticated = true;
            this.state.user = {
                email: window.Auth.getUserEmail(),
                uid: window.Auth.getUserId()
            };
            this.updateAuthUI(true);
        }

        // Bind event listeners
        this.bindEvents();

        // Initial render
        this.refresh();
    },

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Add Item button
        document.getElementById('addItemBtn').addEventListener('click', () => {
            UI.showModal();
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.state.filters.search = e.target.value;
            this.renderFilteredCollection();
        });

        // Filter controls (no type filter for minifigures only)
        document.getElementById('filterTheme').addEventListener('change', (e) => {
            this.state.filters.theme = e.target.value;
            this.renderFilteredCollection();
        });

        document.getElementById('filterStatus').addEventListener('change', (e) => {
            this.state.filters.status = e.target.value;
            this.renderFilteredCollection();
        });

        document.getElementById('filterCondition').addEventListener('change', (e) => {
            this.state.filters.condition = e.target.value;
            this.renderFilteredCollection();
        });

        document.getElementById('yearMin').addEventListener('change', (e) => {
            this.state.filters.yearMin = e.target.value ? parseInt(e.target.value) : null;
            this.renderFilteredCollection();
        });

        document.getElementById('yearMax').addEventListener('change', (e) => {
            this.state.filters.yearMax = e.target.value ? parseInt(e.target.value) : null;
            this.renderFilteredCollection();
        });

        // Clear filters button
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Sort controls
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.state.sort.by = e.target.value;
            this.renderFilteredCollection();
        });

        document.getElementById('sortOrderBtn').addEventListener('click', () => {
            this.state.sort.ascending = !this.state.sort.ascending;
            UI.updateSortIcon(this.state.sort.ascending);
            this.renderFilteredCollection();
        });

        // View toggle
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.state.view = 'grid';
            UI.updateViewToggle('grid');
        });

        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.state.view = 'list';
            UI.updateViewToggle('list');
        });

        // Modal controls
        document.getElementById('modalCloseBtn').addEventListener('click', () => {
            UI.hideModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            UI.hideModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                UI.hideModal();
            }
        });

        // Form submission
        document.getElementById('itemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Delete modal controls
        document.getElementById('deleteModalCloseBtn').addEventListener('click', () => {
            UI.hideDeleteModal();
        });

        document.getElementById('deleteCancelBtn').addEventListener('click', () => {
            UI.hideDeleteModal();
        });

        document.getElementById('deleteModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                UI.hideDeleteModal();
            }
        });

        document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
            this.handleDelete();
        });

        // Collection grid event delegation for edit/delete/buy buttons
        document.getElementById('collectionGrid').addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const id = e.target.dataset.id;
                const item = await Storage.getItem(id);
                if (item) {
                    UI.showModal(item);
                }
            } else if (e.target.classList.contains('delete-btn')) {
                const id = e.target.dataset.id;
                const item = await Storage.getItem(id);
                if (item) {
                    UI.showDeleteModal(item);
                }
            } else if (e.target.classList.contains('buy-item-btn')) {
                const id = e.target.dataset.id;
                const item = await Storage.getItem(id);
                if (item) {
                    this.showBuyModal(item);
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                UI.hideModal();
                UI.hideDeleteModal();
                this.hideAuthModal();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                UI.showModal();
            }
        });

        // ===== AUTHENTICATION EVENT LISTENERS =====

        // Login button in header
        const loginBtn = document.getElementById('loginBtn');
        const userDropdownMenu = document.getElementById('userDropdownMenu');
        const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling

                // Check if user is authenticated
                if (window.Auth && window.Auth.isAuthenticated()) {
                    // User is logged in - toggle dropdown menu
                    this.toggleUserDropdown();
                } else {
                    // User is not logged in - redirect to login page
                    window.location.href = 'login.html';
                }
            });
        }

        // Attach dropdown listeners (logout button, click outside)
        this.attachDropdownListeners();

        // Logout dropdown button
        if (logoutDropdownBtn) {
            logoutDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideUserDropdown();
                this.handleLogout();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (userDropdownMenu && userDropdownMenu.classList.contains('active') && e.target !== loginBtn) {
                this.hideUserDropdown();
            }
        });

        // Auth modal close button
        const authModalCloseBtn = document.getElementById('authModalCloseBtn');
        if (authModalCloseBtn) {
            authModalCloseBtn.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }

        const authModalOverlay = document.getElementById('authModalOverlay');
        if (authModalOverlay) {
            authModalOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.hideAuthModal();
                }
            });
        }

        // Switch between login and register forms
        const showRegisterLink = document.getElementById('showRegisterLink');
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('registerForm').style.display = 'block';
                document.getElementById('verificationForm').style.display = 'none';
                document.getElementById('authModalTitle').textContent = 'Register';
            });
        }

        const showLoginLink = document.getElementById('showLoginLink');
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('registerForm').style.display = 'none';
                document.getElementById('loginForm').style.display = 'block';
                document.getElementById('verificationForm').style.display = 'none';
                document.getElementById('authModalTitle').textContent = 'Log In';
            });
        }

        const backToLoginLink = document.getElementById('backToLoginLink');
        if (backToLoginLink) {
            backToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('verificationForm').style.display = 'none';
                document.getElementById('loginForm').style.display = 'block';
                document.getElementById('authModalTitle').textContent = 'Log In';
            });
        }

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister();
            });
        }

        const verifyCodeBtn = document.getElementById('verifyCodeBtn');
        if (verifyCodeBtn) {
            verifyCodeBtn.addEventListener('click', async () => {
                await this.handleVerifyCode();
            });
        }

        const resendCodeBtn = document.getElementById('resendCodeBtn');
        if (resendCodeBtn) {
            resendCodeBtn.addEventListener('click', async () => {
                await this.handleResendCode();
            });
        }

        // ===== BUY MODAL EVENT LISTENERS =====

        const buyBtn = document.getElementById('buyBtn');
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                this.showBuyModal(null);
            });
        }

        const buyModalCloseBtn = document.getElementById('buyModalCloseBtn');
        if (buyModalCloseBtn) {
            buyModalCloseBtn.addEventListener('click', () => {
                this.hideBuyModal();
            });
        }

        const buyModalOverlay = document.getElementById('buyModalOverlay');
        if (buyModalOverlay) {
            buyModalOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.hideBuyModal();
                }
            });
        }

        // ===== LOGIN REQUIRED OVERLAY EVENT LISTENERS =====

        const loginRequiredLoginBtn = document.getElementById('loginRequiredLoginBtn');
        if (loginRequiredLoginBtn) {
            loginRequiredLoginBtn.addEventListener('click', () => {
                this.hideLoginRequiredOverlay();
                this.showAuthModal();
            });
        }

        const loginRequiredBackBtn = document.getElementById('loginRequiredBackBtn');
        if (loginRequiredBackBtn) {
            loginRequiredBackBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
    },

    /**
     * Handle form submission for add/edit
     */
    async handleFormSubmit() {
        const formData = UI.getFormData();

        try {
            if (formData.id) {
                await Storage.updateItem(formData.id, formData);
                UI.showNotification('Minifigure updated successfully!', 'success');
            } else {
                delete formData.id;
                await Storage.addItem(formData);
                UI.showNotification('Minifigure added successfully!', 'success');
            }

            UI.hideModal();
            await this.refresh();
        } catch (error) {
            console.error('❌ Error saving item:', error);
            UI.showNotification('Error: ' + error.message, 'error');
        }
    },

    /**
     * Handle item deletion
     */
    async handleDelete() {
        const id = UI.elements.deleteModalOverlay.dataset.deleteId;
        if (id) {
            await Storage.deleteItem(id);
            UI.showNotification('Minifigure deleted.', 'success');
            UI.hideDeleteModal();
            await this.refresh();
        }
    },

    /**
     * Clear all filters
     */
    clearFilters() {
        this.state.filters = {
            theme: 'all',
            status: 'all',
            condition: 'all',
            yearMin: null,
            yearMax: null,
            search: ''
        };

        document.getElementById('filterTheme').value = 'all';
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('filterCondition').value = 'all';
        document.getElementById('yearMin').value = '';
        document.getElementById('yearMax').value = '';
        document.getElementById('searchInput').value = '';

        this.renderFilteredCollection();
    },

    /**
     * Apply filters and sort to collection
     * @returns {Promise<Array>} Filtered and sorted items
     */
    async getFilteredCollection() {
        let items = await Storage.getCollection();
        const { filters, sort } = this.state;

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            items = items.filter(item => {
                const name = (item.name || '').toLowerCase();
                const number = (item.figureNumber || '').toLowerCase();
                const notes = (item.notes || '').toLowerCase();
                const theme = (item.theme || '').toLowerCase();
                return name.includes(searchLower) ||
                       number.includes(searchLower) ||
                       notes.includes(searchLower) ||
                       theme.includes(searchLower);
            });
        }

        // Apply theme filter
        if (filters.theme !== 'all') {
            items = items.filter(item => item.theme === filters.theme);
        }

        // Apply status filter
        if (filters.status !== 'all') {
            items = items.filter(item => item.status === filters.status);
        }

        // Apply condition filter
        if (filters.condition !== 'all') {
            items = items.filter(item => item.condition === filters.condition);
        }

        // Apply year range filter
        if (filters.yearMin) {
            items = items.filter(item => item.year >= filters.yearMin);
        }
        if (filters.yearMax) {
            items = items.filter(item => item.year <= filters.yearMax);
        }

        // Apply sorting
        items.sort((a, b) => {
            let valueA, valueB;

            switch (sort.by) {
                case 'name':
                    valueA = (a.name || '').toLowerCase();
                    valueB = (b.name || '').toLowerCase();
                    break;
                case 'number':
                    valueA = (a.figureNumber) || '';
                    valueB = (b.figureNumber) || '';
                    break;
                case 'theme':
                    valueA = (a.theme || '').toLowerCase();
                    valueB = (b.theme || '').toLowerCase();
                    break;
                case 'year':
                    valueA = a.year || 0;
                    valueB = b.year || 0;
                    break;
                case 'price':
                    valueA = parseFloat(a.pricePaid) || 0;
                    valueB = parseFloat(b.pricePaid) || 0;
                    break;
                case 'dateAdded':
                    valueA = a.dateAdded || '';
                    valueB = b.dateAdded || '';
                    break;
                default:
                    valueA = (a.name || '').toLowerCase();
                    valueB = (b.name || '').toLowerCase();
            }

            let comparison = 0;
            if (valueA < valueB) comparison = -1;
            if (valueA > valueB) comparison = 1;

            return sort.ascending ? comparison : -comparison;
        });

        return items;
    },

    /**
     * Render filtered collection
     */
    async renderFilteredCollection() {
        const items = await this.getFilteredCollection();
        UI.renderCollection(items);
    },

    /**
     * Full refresh of the UI
     */
    async refresh() {
        const themes = await Storage.getThemes();
        UI.renderThemeFilter(themes);

        const stats = await Storage.getStats();
        UI.renderStats(stats);

        await this.renderFilteredCollection();
    },

    // ===== AUTHENTICATION METHODS =====

    async handleAuthStateChange(user) {
        console.log('🔄 Auth state changed:', user ? user.email : 'logged out');

        if (user) {
            this.state.user = {
                email: user.email,
                uid: user.uid
            };
            this.state.isAuthenticated = true;
            this.updateAuthUI(true);
            await this.refresh();
        } else {
            // User logged out - redirect to home page
            console.warn('🔒 User logged out - redirecting to home');
            this.state.user = null;
            this.state.isAuthenticated = false;
            window.location.href = 'index.html';
        }
    },

    updateAuthUI(isLoggedIn) {
        const loginBtn = document.getElementById('loginBtn');
        if (!loginBtn) return;

        if (isLoggedIn) {
            const email = this.state.user ? this.state.user.email : '';
            const username = email.split('@')[0];

            // Update button structure - WITH dropdown menu
            loginBtn.innerHTML = `
                <span class="login-icon">👤</span>
                <span class="login-text">${username}</span>
                <span class="user-dropdown-arrow" style="display: inline-block; margin-left: 6px;">▼</span>
                <div class="user-dropdown-menu" id="userDropdownMenu">
                    <button class="user-dropdown-item logout-item" id="logoutDropdownBtn">
                        <span class="user-dropdown-icon">🚪</span>
                        <span>Log Out</span>
                    </button>
                </div>
            `;

            loginBtn.classList.add('logged-in');
            loginBtn.title = `Logged in as ${email}`;

            // Re-attach dropdown listeners since we recreated the elements
            this.attachDropdownListeners();
        } else {
            loginBtn.innerHTML = `
                <span class="login-icon">👤</span>
                <span class="login-text">Log In</span>
            `;

            loginBtn.classList.remove('logged-in');
            loginBtn.title = 'Click to log in';
        }
    },

    attachDropdownListeners() {
        const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
        if (logoutDropdownBtn) {
            logoutDropdownBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const confirm = window.confirm('Are you sure you want to log out?');
                if (confirm) {
                    try {
                        await window.Auth.logout();
                        UI.showNotification('Logged out successfully', 'success');

                        // Redirect to login page
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 500);
                    } catch (error) {
                        console.error('❌ Logout error:', error);
                        UI.showNotification('Error logging out: ' + error.message, 'error');
                    }
                }
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const loginBtn = document.getElementById('loginBtn');
            const dropdown = document.getElementById('userDropdownMenu');

            if (loginBtn && dropdown && !loginBtn.contains(e.target)) {
                this.hideUserDropdown();
            }
        });
    },

    toggleUserDropdown() {
        const loginBtn = document.getElementById('loginBtn');
        const userDropdownMenu = document.getElementById('userDropdownMenu');

        if (!loginBtn || !userDropdownMenu) return;

        const isActive = userDropdownMenu.classList.contains('active');

        if (isActive) {
            this.hideUserDropdown();
        } else {
            userDropdownMenu.classList.add('active');
            loginBtn.classList.add('dropdown-active');
        }
    },

    hideUserDropdown() {
        const loginBtn = document.getElementById('loginBtn');
        const userDropdownMenu = document.getElementById('userDropdownMenu');

        if (userDropdownMenu) {
            userDropdownMenu.classList.remove('active');
        }
        if (loginBtn) {
            loginBtn.classList.remove('dropdown-active');
        }
    },

    showAuthModal() {
        const authModal = document.getElementById('authModalOverlay');
        if (authModal) {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('verificationForm').style.display = 'none';
            document.getElementById('authLoading').style.display = 'none';
            document.getElementById('authModalTitle').textContent = 'Log In';

            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerPasswordConfirm').value = '';
            document.getElementById('verificationCode').value = '';

            authModal.classList.add('active');
        }
    },

    hideAuthModal() {
        const authModal = document.getElementById('authModalOverlay');
        if (authModal) {
            authModal.classList.remove('active');
        }
    },

    showLoginRequiredOverlay() {
        console.log('🔐 Checking login required overlay');

        // Wait for auth state to be determined first
        window.Auth.waitForAuthState().then((isLoggedIn) => {
            console.log('🔓 Auth state for overlay:', isLoggedIn);

            // If already logged in, don't show overlay
            if (isLoggedIn) {
                console.log('✅ User is authenticated, hiding overlay if visible');
                this.hideLoginRequiredOverlay();
                return;
            }

            // Only show overlay if not logged in
            console.log('🔐 Showing login required overlay');
            const overlay = document.getElementById('loginRequiredOverlay');
            const loginRequiredActions = document.getElementById('loginRequiredActions');
            const loadingText = document.querySelector('.loading-text');

            if (overlay) {
                overlay.style.display = 'flex';

                // Show loading text initially
                if (loadingText) {
                    loadingText.style.display = 'block';
                }

                // Hide loading and show actions after a brief moment
                setTimeout(() => {
                    if (loadingText) {
                        loadingText.style.display = 'none';
                    }
                    if (loginRequiredActions) {
                        loginRequiredActions.style.display = 'flex';
                    }
                    console.log('🔓 Auth state checked, ready for user interaction');
                }, 500);
            }
        });
    },

    hideLoginRequiredOverlay() {
        const overlay = document.getElementById('loginRequiredOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    showBuyModal(item = null) {
        try {
            if (!window.BuyLinks) {
                console.error('❌ BuyLinks module not loaded');
                UI.showNotification('Buy Links feature not available', 'error');
                return;
            }

            const buyModal = document.getElementById('buyModalOverlay');
            const buyModalContent = document.getElementById('buyModalContent');

            if (!buyModal || !buyModalContent) {
                console.error('❌ Buy modal elements not found');
                return;
            }

            const collectionType = 'minifigsCollection';
            const linksHTML = window.BuyLinks.generateStoreLinksHTML(item, collectionType);
            buyModalContent.innerHTML = linksHTML;
            buyModal.classList.add('active');
        } catch (error) {
            console.error('❌ Error in showBuyModal:', error);
            UI.showNotification('Error opening Buy modal: ' + error.message, 'error');
        }
    },

    hideBuyModal() {
        const buyModal = document.getElementById('buyModalOverlay');
        if (buyModal) {
            buyModal.classList.remove('active');
        }
    },

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            UI.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            document.getElementById('authLoading').style.display = 'block';
            document.getElementById('loginForm').style.display = 'none';

            const result = await window.Auth.login(email, password);

            if (result.success) {
                UI.showNotification('Logged in successfully!', 'success');
                this.hideAuthModal();
                this.hideLoginRequiredOverlay();
                await this.refresh();
            } else if (result.requiresVerification) {
                UI.showNotification(result.message, 'warning');
                this.showResendCodeOptions(email, password);
            } else {
                UI.showNotification(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            UI.showNotification(error.message, 'error');
        } finally {
            document.getElementById('authLoading').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
        }
    },

    async showResendCodeOptions(email, password) {
        if (confirm('Twój email nie został zweryfikowany.\n\nCzy chcesz wygenerować nowy kod weryfikacyjny?\n(Sprawdź konsolę F12 aby zobaczyć kod)')) {
            try {
                const result = await window.Auth.resendCodeForUnverifiedUser(email, password);

                if (result.success) {
                    UI.showNotification('Nowy kod wygenerowany! Sprawdź konsolę (F12)', 'success');

                    if (document.getElementById('verificationCode')) {
                        document.getElementById('verificationCode').value = '';
                        this.switchToVerification();
                    }
                }
            } catch (error) {
                UI.showNotification('Błąd: ' + error.message, 'error');
                this.switchToLogin();
            }
        } else {
            this.switchToLogin();
        }
    },

    switchToVerification() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('verificationForm').style.display = 'block';
        document.getElementById('authModalTitle').textContent = 'Verify Email';
    },

    switchToLogin() {
        document.getElementById('verificationForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('authModalTitle').textContent = 'Log In';
    },

    async handleRegister() {
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerPasswordConfirm').value;

        if (!email || !password || !confirmPassword) {
            UI.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            UI.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            UI.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            document.getElementById('authLoading').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';

            await window.Auth.register(email, password);

            document.getElementById('authLoading').style.display = 'none';
            document.getElementById('verificationForm').style.display = 'block';
            document.getElementById('authModalTitle').textContent = 'Verify Email';

            UI.showNotification('Registration successful! Check console (F12) for verification code.', 'success');
        } catch (error) {
            console.error('Registration error:', error);
            UI.showNotification(error.message, 'error');
            document.getElementById('authLoading').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        }
    },

    async handleVerifyCode() {
        const code = document.getElementById('verificationCode').value.trim();

        if (!code || code.length !== 4) {
            UI.showNotification('Please enter a 4-digit code', 'error');
            return;
        }

        try {
            document.getElementById('authLoading').style.display = 'block';
            document.getElementById('verificationForm').style.display = 'none';

            const verified = await window.Auth.verifyCode(code);

            if (verified) {
                UI.showNotification('Email verified successfully! You are now logged in.', 'success');
                this.hideAuthModal();
                this.hideLoginRequiredOverlay();
                this.updateAuthUI(true);
                await this.refresh();
            }
        } catch (error) {
            console.error('Verification error:', error);
            UI.showNotification(error.message, 'error');
            document.getElementById('authLoading').style.display = 'none';
            document.getElementById('verificationForm').style.display = 'block';
        }
    },

    async handleResendCode() {
        try {
            await window.Auth.resendCode();
            UI.showNotification('Verification code resent! Check console (F12).', 'success');
        } catch (error) {
            console.error('Resend error:', error);
            UI.showNotification(error.message, 'error');
        }
    },

    async handleLogout() {
        try {
            await window.Auth.logout();
            UI.showNotification('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            UI.showNotification('Error logging out: ' + error.message, 'error');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
