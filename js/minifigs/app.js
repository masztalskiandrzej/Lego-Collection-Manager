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
        isAuthenticated: false,
        dropdownListenersAttached: false
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

            // REQUIRES authentication - redirect to login page if not logged in
            if (!isLoggedIn) {
                console.warn('🔒 User not authenticated - redirecting to login page');
                window.location.href = 'login.html';
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

        // User button - logout
        const userBtn = document.getElementById('userBtn');
        if (userBtn) {
            userBtn.addEventListener('click', async () => {
                if (confirm('Czy chcesz się wylogować?')) {
                    try {
                        await window.Auth.logout();
                        window.location.href = 'login.html';
                    } catch (error) {
                        console.error('Logout error:', error);
                        UI.showNotification('Błąd wylogowania: ' + error.message, 'error');
                    }
                }
            });
        }

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

        // Image upload handlers
        const imageUploadBtn = document.getElementById('imageUploadBtn');
        const imageFileInput = document.getElementById('itemImageFile');
        const removeImageBtn = document.getElementById('removeImageBtn');

        console.log('🔍 Image upload elements:', { imageUploadBtn, imageFileInput, removeImageBtn });

        if (imageUploadBtn && imageFileInput) {
            console.log('✅ Adding image upload event listeners');
            imageUploadBtn.addEventListener('click', () => {
                console.log('📸 Upload button clicked');
                imageFileInput.click();
            });

            imageFileInput.addEventListener('change', (e) => {
                console.log('📁 File selected:', e.target.files[0]);
                this.handleImageSelection(e.target.files[0]);
            });
        } else {
            console.error('❌ Image upload elements not found:', {
                imageUploadBtn: !!imageUploadBtn,
                imageFileInput: !!imageFileInput
            });
        }

        if (removeImageBtn) {
            console.log('✅ Adding remove image button listener');
            removeImageBtn.addEventListener('click', () => {
                console.log('🗑️ Remove image button clicked');
                this.handleRemoveImage();
            });
        }

        // Get Image button - fetch official photo from BrickLink CDN
        const fetchImageBtn = document.getElementById('fetchImageBtn');
        if (fetchImageBtn) {
            console.log('✅ Adding Get Image button listener');
            fetchImageBtn.addEventListener('click', () => {
                this.handleFetchImage();
            });
        }

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
                window.location.href = 'login.html';
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
     * Handle image file selection with compression
     * @param {File} file - Selected image file
     */
    handleImageSelection(file) {
        console.log('🖼️ handleImageSelection called with:', file);

        if (!file) {
            console.warn('⚠️ No file provided');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            console.error('❌ Not an image file:', file.type);
            UI.showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            console.error('❌ File too large:', file.size);
            UI.showNotification('Image file must be smaller than 10MB', 'error');
            return;
        }

        console.log('📁 Original file size:', (file.size / 1024).toFixed(2) + ' KB');

        // Read and compress image
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas for compression
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions (max 600px)
                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress (quality 0.6)
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

                const compressedSizeKB = (compressedDataUrl.length * 0.75 / 1024).toFixed(2);
                console.log('✅ Image compressed:', img.width + 'x' + img.height + ' → ' + Math.round(width) + 'x' + Math.round(height));
                console.log('📦 Compressed size:', compressedSizeKB + ' KB');

                // Warn if still too large for Firestore
                if (parseFloat(compressedSizeKB) > 500) {
                    console.warn('⚠️ Image is large (' + compressedSizeKB + ' KB). May cause issues.');
                    UI.showNotification('Image is large. Consider using a smaller image.', 'warning');
                }

                // Show preview and store compressed data URL
                console.log('🔍 DEBUG: UI object:', UI);
                console.log('🔍 DEBUG: UI.showImagePreview:', typeof UI.showImagePreview);

                if (typeof UI.showImagePreview === 'function') {
                    UI.showImagePreview(compressedDataUrl);
                    console.log('✅ UI.currentImageUrl set, length:', compressedDataUrl.length);
                } else {
                    // Fallback - set directly
                    console.warn('⚠️ UI.showImagePreview not available, setting directly');
                    const preview = document.getElementById('imagePreview');
                    const previewImg = document.getElementById('imagePreviewImg');
                    if (preview && previewImg) {
                        previewImg.src = compressedDataUrl;
                        preview.style.display = 'block';
                        UI.currentImageUrl = compressedDataUrl;
                        console.log('✅ Preview set directly, length:', compressedDataUrl.length);
                    }
                }

                // Update file name display
                const fileName = document.getElementById('imageFileName');
                if (fileName) {
                    fileName.textContent = file.name + ' (compressed: ' + compressedSizeKB + ' KB)';
                }
            };
            img.onerror = () => {
                console.error('❌ Error loading image');
                UI.showNotification('Error loading image', 'error');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            console.error('❌ Error reading file');
            UI.showNotification('Error reading image file', 'error');
        };
        reader.readAsDataURL(file);
    },

    /**
     * Handle remove image button
     */
    handleRemoveImage() {
        UI.resetImageUpload();
    },

    /**
     * Handle Get Image button - fetch official photo from BrickLink CDN
     */
    async handleFetchImage() {
        console.log('🖼️ handleFetchImage called');

        // Get figure number from input
        const figureNumberInput = document.getElementById('itemNumber');
        const figureNumber = figureNumberInput ? figureNumberInput.value.trim() : '';

        if (!figureNumber) {
            alert('Please enter a figure number first (e.g., sw0999)');
            figureNumberInput.focus();
            return;
        }

        console.log('📦 Fetching image for figure:', figureNumber);

        // Try multiple image URL formats for minifigures
        const imageUrls = [
            // BrickLink CDN - Minifigure format
            `https://img.bricklink.com/ItemImage/MN/0/${figureNumber}.png`,
            `https://img.bricklink.com/ItemImage/MN/0/${figureNumber}.jpg`,
            // Try with variant
            `https://img.bricklink.com/ItemImage/MN/0/${figureNumber}-1.png`,
            `https://img.bricklink.com/ItemImage/MN/0/${figureNumber}-1.jpg`
        ];

        let success = false;
        let lastError = null;

        for (const imageUrl of imageUrls) {
            try {
                console.log('🔗 Trying:', imageUrl);

                // Try to fetch the image
                const response = await fetch(imageUrl, { method: 'HEAD' });

                if (response.ok) {
                    console.log('✅ Image found:', imageUrl);

                    // Display the image preview
                    UI.showImagePreview(imageUrl);

                    // Update file name
                    const fileName = document.getElementById('imageFileName');
                    if (fileName) {
                        fileName.textContent = `Official image: ${figureNumber}`;
                    }

                    success = true;
                    break;
                }
            } catch (error) {
                console.log('❌ Failed:', imageUrl, error.message);
                lastError = error;
            }
        }

        if (!success) {
            alert(`Could not find official image for figure "${figureNumber}".\n\nMake sure the figure number is correct (e.g., sw0999, sw0001, col001).\n\nYou can still upload your own photo manually.`);
            console.error('❌ All image URLs failed:', lastError);
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
        const userBtn = document.getElementById('userBtn');
        const userName = document.getElementById('userName');

        if (!userBtn || !userName) return;

        if (isLoggedIn) {
            const email = this.state.user ? this.state.user.email : '';
            const username = email.split('@')[0];
            userName.textContent = username;
            userBtn.title = `Zalogowany jako ${email} - kliknij aby się wylogować`;
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
            const legoComLink = document.getElementById('legoComStoreLink');

            if (!buyModal || !buyModalContent) {
                console.error('❌ Buy modal elements not found');
                return;
            }

            const collectionType = 'minifigsCollection';

            // Set LEGO.com link URL
            if (legoComLink) {
                if (item && item.figureNumber) {
                    // Search for this minifigure on LEGO.com
                    legoComLink.href = `https://www.lego.com/en-US/search?q=${encodeURIComponent(item.figureNumber)}`;
                } else {
                    // Go to LEGO.com Minifigures section
                    legoComLink.href = 'https://www.lego.com/en-US/categories/minifigures';
                }
            }

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

    // ===== AI VISION METHODS =====

    /**
     * Handle Auto-Fill by Figure Number button click
     * Fetches data from BrickSet API and auto-fills the form
     */
    async handleAutoFillByNumber() {
        console.log('🔍 Auto-Fill button clicked');

        // Get figure number from input
        const figureNumberInput = document.getElementById('autoFillSetNumber');
        const figureNumber = figureNumberInput ? figureNumberInput.value.trim() : '';

        if (!figureNumber) {
            this.showAutoFillStatus('warning', '⚠️ Please enter a figure number first.');
            UI.showNotification('Please enter a figure number.', 'warning');
            return;
        }

        const autoFillBtn = document.getElementById('autoFillBtn');
        const originalText = autoFillBtn.innerHTML;

        try {
            // Show loading state
            console.log('⏳ Fetching data for figure number:', figureNumber);
            autoFillBtn.disabled = true;
            autoFillBtn.innerHTML = '<span class="ai-loading-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(51,51,51,0.3); border-top-color: #333; border-radius: 50%; animation: spin 1s linear infinite;"></span> Loading...';
            this.showAutoFillStatus('info', '🔍 Fetching data from BrickSet...');

            // Debug: Check what's on window
            console.log('🔍 window.AIVision check:', {
                exists: typeof window.AIVision !== 'undefined',
                value: window.AIVision,
                keys: window.AIVision ? Object.keys(window.AIVision) : 'N/A'
            });

            // Initialize AIVision if needed
            if (window.AIVision && !window.AIVision.isInitialized) {
                console.log('🔧 Initializing AIVision...');
                await window.AIVision.init();
            }

            // Check if AIVision module is available
            if (!window.AIVision) {
                console.error('❌ AIVision not found on window object!');
                console.log('📋 Available window properties:', Object.keys(window).filter(k => k.includes('AI') || k.includes('Vision')));
                throw new Error('AIVision module not loaded');
            }

            // Fetch data from BrickSet
            const result = await window.AIVision.recognizeByNumber(figureNumber, 'minifigure');

            if (!result.success || !result.data) {
                this.showAutoFillStatus('warning', `⚠️ Figure "${figureNumber}" not found in BrickSet database.`);
                UI.showNotification(`Figure ${figureNumber} not found. Check the number and try again.`, 'warning');
                return;
            }

            const data = result.data;
            console.log('✅ BrickSet data received:', data);

            // Populate form fields
            this.populateFormFromAI(data);

            // Fetch and display image if available
            if (data.imageUrl) {
                this.showAutoFillStatus('info', '🖼️ Downloading official image from BrickSet...');
                const imageDataUrl = await window.AIVision.fetchImageAsBase64(data.imageUrl);

                if (imageDataUrl) {
                    // Show image preview
                    UI.showImagePreview(imageDataUrl);
                    console.log('✅ Image downloaded and displayed');
                }
            }

            // Show success message
            this.showAutoFillStatus('success', `✅ "${data.name}" - Form filled with ${data.theme || '?'}, ${data.year || '?'}${data.pricePaid ? ', $' + data.pricePaid : ''}`);
            UI.showNotification(`Figure data auto-filled from BrickSet!${data.imageUrl ? ' Image downloaded.' : ''}`, 'success');

            // Update button state
            autoFillBtn.innerHTML = '✅ Done!';

            // Clear the input field
            figureNumberInput.value = '';

            // Reset button after 3 seconds
            setTimeout(() => {
                autoFillBtn.innerHTML = originalText;
                autoFillBtn.disabled = false;
            }, 3000);

        } catch (error) {
            console.error('❌ Auto-Fill error:', error);
            this.showAutoFillStatus('error', `❌ Error: ${error.message}`);
            UI.showNotification('Auto-Fill failed: ' + error.message, 'error');

            // Reset button
            autoFillBtn.innerHTML = originalText;
            autoFillBtn.disabled = false;
        }
    },

    /**
     * Show Auto-Fill status message
     * @param {string} type - 'info', 'success', 'warning', 'error'
     * @param {string} message - Status message
     */
    showAutoFillStatus(type, message) {
        const statusEl = document.getElementById('autoFillStatus');
        if (!statusEl) return;

        statusEl.className = `ai-status ${type}`;
        statusEl.textContent = message;
        statusEl.style.display = 'block';
    },

    /**
     * Populate form fields with AI-recognized data
     * @param {Object} data - Recognized item data
     */
    populateFormFromAI(data) {
        console.log('📝 Populating form with AI data:', data);

        // Helper function to set value if exists
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el && value) {
                el.value = value;
                console.log(`  ✓ ${id} = ${value}`);
            }
        };

        // Populate fields based on data availability
        if (data.name) setValue('itemName', data.name);
        if (data.figureNumber) setValue('itemNumber', data.figureNumber);
        if (data.theme) setValue('itemTheme', data.theme);
        if (data.year) setValue('itemYear', data.year);
        if (data.pricePaid) setValue('itemPrice', data.pricePaid);

        // Add a note about AI recognition
        const notesEl = document.getElementById('itemNotes');
        if (notesEl) {
            const existingNotes = notesEl.value.trim();
            const aiNote = '\n\n[AI recognized from photo]';
            notesEl.value = existingNotes ? existingNotes + aiNote : aiNote.substring(0, aiNote.length);
        }

        console.log('✅ Form populated successfully');
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
