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

        // Initialize UI
        UI.init();

        // Wait for Auth module to be available (polling mechanism)
        let authWaitCount = 0;
        const MAX_AUTH_WAIT = 50; // 5 seconds max

        while (typeof window.Auth === 'undefined' && authWaitCount < MAX_AUTH_WAIT) {
            await new Promise(resolve => setTimeout(resolve, 100));
            authWaitCount++;
        }

        if (typeof window.Auth === 'undefined') {
        } else {
        }

        // Set up auth state change listener
        if (window.Auth) {
            window.Auth.onAuthStateChanged = this.handleAuthStateChange.bind(this);

            // Wait for initial auth state to be determined before checking
            const isLoggedIn = await window.Auth.waitForAuthState();

            // REQUIRES authentication - redirect to login page if not logged in
            if (!isLoggedIn) {
                window.location.href = 'login.html';
                return;
            }

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

        // Export button - open export modal (with module loading check)
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (window.ExportImport) {
                    this.showExportModal();
                } else {
                    // Wait for module to load
                    let attempts = 0;
                    const checkModule = setInterval(() => {
                        attempts++;
                        if (window.ExportImport) {
                            clearInterval(checkModule);
                            this.showExportModal();
                        } else if (attempts > 20) {
                            clearInterval(checkModule);
                            UI.showNotification('Export module not available', 'error');
                        }
                    }, 100);
                }
            });
        }

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

        if (imageUploadBtn && imageFileInput) {
            imageUploadBtn.addEventListener('click', () => {
                imageFileInput.click();
            });

            imageFileInput.addEventListener('change', (e) => {
                this.handleImageSelection(e.target.files[0]);
            });
        } else {
        }

        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => {
                this.handleRemoveImage();
            });
        }

        // Get Image button - fetch official photo from BrickLink CDN
        const fetchImageBtn = document.getElementById('fetchImageBtn');
        if (fetchImageBtn) {
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

        // ===== KEYBOARD SHORTCUTS =====
        if (window.KeyboardShortcuts) {
            window.KeyboardShortcuts.init({
                closeModal: () => {
                    UI.hideModal();
                    UI.hideDeleteModal();
                    this.hideBuyModal();
                },
                newItem: () => UI.showModal(),
                focusSearch: () => {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) searchInput.focus();
                },
                gridView: () => {
                    this.state.view = 'grid';
                    const gridBtn = document.getElementById('viewGridBtn');
                    const listBtn = document.getElementById('viewListBtn');
                    const grid = document.getElementById('collectionGrid');
                    if (gridBtn) gridBtn.classList.add('active');
                    if (listBtn) listBtn.classList.remove('active');
                    if (grid) grid.classList.remove('list-view');
                },
                listView: () => {
                    this.state.view = 'list';
                    const gridBtn = document.getElementById('viewGridBtn');
                    const listBtn = document.getElementById('viewListBtn');
                    const grid = document.getElementById('collectionGrid');
                    if (gridBtn) gridBtn.classList.remove('active');
                    if (listBtn) listBtn.classList.add('active');
                    if (grid) grid.classList.add('list-view');
                },
                toggleTheme: () => {
                    if (window.Theme) window.Theme.toggle();
                },
                filterAll: () => {
                    const filterStatus = document.getElementById('filterStatus');
                    if (filterStatus) {
                        filterStatus.value = 'all';
                        this.state.filters.status = 'all';
                        this.renderFilteredCollection();
                    }
                },
                filterOwned: () => {
                    const filterStatus = document.getElementById('filterStatus');
                    if (filterStatus) {
                        filterStatus.value = 'owned';
                        this.state.filters.status = 'owned';
                        this.renderFilteredCollection();
                    }
                },
                filterWishlist: () => {
                    const filterStatus = document.getElementById('filterStatus');
                    if (filterStatus) {
                        filterStatus.value = 'wishlist';
                        this.state.filters.status = 'wishlist';
                        this.renderFilteredCollection();
                    }
                },
                filterSold: () => {
                    const filterStatus = document.getElementById('filterStatus');
                    if (filterStatus) {
                        filterStatus.value = 'sold';
                        this.state.filters.status = 'sold';
                        this.renderFilteredCollection();
                    }
                }
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
                // Check for duplicate figure number (excluding current item)
                if (formData.figureNumber) {
                    const duplicate = await Storage.checkDuplicateByFigureNumber(formData.figureNumber, formData.id);
                    if (duplicate) {
                        const confirmed = confirm(
                            `⚠️ A minifigure with number "${formData.figureNumber}" already exists in your collection:\n\n` +
                            `Name: ${duplicate.name || 'N/A'}\n` +
                            `Status: ${duplicate.status || 'N/A'}\n\n` +
                            `Do you want to save anyway?`
                        );
                        if (!confirmed) {
                            return;
                        }
                    }
                }

                await Storage.updateItem(formData.id, formData);
                UI.showNotification('Minifigure updated successfully!', 'success');
            } else {
                // Check for duplicate figure number
                if (formData.figureNumber) {
                    const duplicate = await Storage.checkDuplicateByFigureNumber(formData.figureNumber);
                    if (duplicate) {
                        UI.showNotification(
                            `⚠️ Minifigure "${formData.figureNumber}" already exists: ${duplicate.name || 'N/A'}`,
                            'warning'
                        );
                        return;
                    }
                }

                delete formData.id;
                await Storage.addItem(formData);
                UI.showNotification('Minifigure added successfully!', 'success');
            }

            UI.hideModal();
            await this.refresh();
        } catch (error) {
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

        if (!file) {
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            UI.showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            UI.showNotification('Image file must be smaller than 10MB', 'error');
            return;
        }

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

                // Warn if still too large for Firestore
                if (parseFloat(compressedSizeKB) > 500) {
                    UI.showNotification('Image is large. Consider using a smaller image.', 'warning');
                }

                // Show preview and store compressed data URL

                if (typeof UI.showImagePreview === 'function') {
                    UI.showImagePreview(compressedDataUrl);
                } else {
                    // Fallback - set directly
                    const preview = document.getElementById('imagePreview');
                    const previewImg = document.getElementById('imagePreviewImg');
                    if (preview && previewImg) {
                        previewImg.src = compressedDataUrl;
                        preview.style.display = 'block';
                        UI.currentImageUrl = compressedDataUrl;
                    }
                }

                // Update file name display
                const fileName = document.getElementById('imageFileName');
                if (fileName) {
                    fileName.textContent = file.name + ' (compressed: ' + compressedSizeKB + ' KB)';
                }
            };
            img.onerror = () => {
                UI.showNotification('Error loading image', 'error');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
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

        // Get figure number from input
        const figureNumberInput = document.getElementById('itemNumber');
        const figureNumber = figureNumberInput ? figureNumberInput.value.trim() : '';

        if (!figureNumber) {
            alert('Please enter a figure number first (e.g., sw0999)');
            figureNumberInput.focus();
            return;
        }

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

                // Try to fetch the image
                const response = await fetch(imageUrl, { method: 'HEAD' });

                if (response.ok) {

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
                lastError = error;
            }
        }

        if (!success) {
            alert(`Could not find official image for figure "${figureNumber}".\n\nMake sure the figure number is correct (e.g., sw0999, sw0001, col001).\n\nYou can still upload your own photo manually.`);
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

        // Wait for auth state to be determined first
        window.Auth.waitForAuthState().then((isLoggedIn) => {

            // If already logged in, don't show overlay
            if (isLoggedIn) {
                this.hideLoginRequiredOverlay();
                return;
            }

            // Only show overlay if not logged in
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
                UI.showNotification('Buy Links feature not available', 'error');
                return;
            }

            const buyModal = document.getElementById('buyModalOverlay');
            const buyModalContent = document.getElementById('buyModalContent');
            const legoComLink = document.getElementById('legoComStoreLink');

            if (!buyModal || !buyModalContent) {
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
            UI.showNotification(error.message, 'error');
        }
    },

    // ===== AI VISION METHODS =====

    /**
     * Handle Auto-Fill by Figure Number button click
     * Fetches data from BrickSet API and auto-fills the form
     */
    async handleAutoFillByNumber() {

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
            autoFillBtn.disabled = true;
            autoFillBtn.innerHTML = '<span class="ai-loading-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(51,51,51,0.3); border-top-color: #333; border-radius: 50%; animation: spin 1s linear infinite;"></span> Loading...';
            this.showAutoFillStatus('info', '🔍 Fetching data from BrickSet...');

            // Debug: Check what's on window

            // Initialize AIVision if needed
            if (window.AIVision && !window.AIVision.isInitialized) {
                await window.AIVision.init();
            }

            // Check if AIVision module is available
            if (!window.AIVision) {
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

            // Populate form fields
            this.populateFormFromAI(data);

            // Fetch and display image if available
            if (data.imageUrl) {
                this.showAutoFillStatus('info', '🖼️ Downloading official image from BrickSet...');
                const imageDataUrl = await window.AIVision.fetchImageAsBase64(data.imageUrl);

                if (imageDataUrl) {
                    // Show image preview
                    UI.showImagePreview(imageDataUrl);
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

        // Helper function to set value if exists
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el && value) {
                el.value = value;
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

    },

    /**
     * Show Export/Share Modal
     */
    async showExportModal() {
        try {
            if (!window.ExportImport) {
                UI.showNotification('Export module not available', 'error');
                return;
            }

            // Get current collection
            const collection = await Storage.getCollection();

            // Get export summary
            const summary = window.ExportImport.getExportSummary(collection);

            // Update summary UI
            document.getElementById('summaryTotalItems').textContent = summary.totalItems;
            document.getElementById('summaryTotalValue').textContent = `$${Math.round(summary.totalValue)}`;
            document.getElementById('summaryThemes').textContent = summary.themes.length;
            document.getElementById('summaryImages').textContent = `${summary.itemsWithImages}/${summary.totalItems}`;

            // Show modal
            const exportModal = document.getElementById('exportModalOverlay');
            if (exportModal) {
                exportModal.classList.add('active');
            }

            // Bind export/import events (one-time binding)
            this.bindExportEvents();

        } catch (error) {
            UI.showNotification('Error opening export modal: ' + error.message, 'error');
        }
    },

    /**
     * Hide Export/Share Modal
     */
    hideExportModal() {
        const exportModal = document.getElementById('exportModalOverlay');
        if (exportModal) {
            exportModal.classList.remove('active');
        }
    },

    /**
     * Bind Export/Import Event Listeners
     */
    bindExportEvents() {
        // Close button
        const exportModalCloseBtn = document.getElementById('exportModalCloseBtn');
        if (exportModalCloseBtn && !exportModalCloseBtn.dataset.bound) {
            exportModalCloseBtn.addEventListener('click', () => this.hideExportModal());
            exportModalCloseBtn.dataset.bound = 'true';
        }

        // Close on click outside
        const exportModal = document.getElementById('exportModalOverlay');
        if (exportModal && !exportModal.dataset.bound) {
            exportModal.addEventListener('click', (e) => {
                if (e.target === exportModal) {
                    this.hideExportModal();
                }
            });
            exportModal.dataset.bound = 'true';
        }

        // Export to CSV
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn && !exportCSVBtn.dataset.bound) {
            exportCSVBtn.addEventListener('click', async () => {
                try {
                    const collection = await Storage.getCollection();
                    window.ExportImport.exportToCSV(collection, 'minifigs');
                    UI.showNotification('Collection exported to CSV successfully!', 'success');
                } catch (error) {
                    UI.showNotification('Error exporting to CSV: ' + error.message, 'error');
                }
            });
            exportCSVBtn.dataset.bound = 'true';
        }

        // Export to JSON
        const exportJSONBtn = document.getElementById('exportJSONBtn');
        if (exportJSONBtn && !exportJSONBtn.dataset.bound) {
            exportJSONBtn.addEventListener('click', async () => {
                try {
                    const collection = await Storage.getCollection();
                    const username = document.getElementById('userName')?.textContent || 'LEGO Collector';
                    const metadata = { username, exportDate: new Date().toISOString() };
                    window.ExportImport.exportToJSON(collection, 'minifigs', metadata);
                    UI.showNotification('Collection exported to JSON successfully!', 'success');
                } catch (error) {
                    UI.showNotification('Error exporting to JSON: ' + error.message, 'error');
                }
            });
            exportJSONBtn.dataset.bound = 'true';
        }

        // Generate Collection Card
        const generateCardBtn = document.getElementById('generateCardBtn');
        if (generateCardBtn && !generateCardBtn.dataset.bound) {
            generateCardBtn.addEventListener('click', async () => {
                try {
                    await this.generateCollectionCard();
                } catch (error) {
                    UI.showNotification('Error generating card: ' + error.message, 'error');
                }
            });
            generateCardBtn.dataset.bound = 'true';
        }

        // Generate QR Code
        const generateQRBtn = document.getElementById('generateQRBtn');
        if (generateQRBtn && !generateQRBtn.dataset.bound) {
            generateQRBtn.addEventListener('click', async () => {
                try {
                    await this.generateQRCode();
                } catch (error) {
                    UI.showNotification('Error generating QR code: ' + error.message, 'error');
                }
            });
            generateQRBtn.dataset.bound = 'true';
        }

        // Import from JSON
        const importJSONBtn = document.getElementById('importJSONBtn');
        const importFileInput = document.getElementById('importFileInput');
        if (importJSONBtn && !importJSONBtn.dataset.bound) {
            importJSONBtn.addEventListener('click', () => {
                importFileInput.click();
            });
            importJSONBtn.dataset.bound = 'true';
        }

        // Import file input change
        if (importFileInput && !importFileInput.dataset.bound) {
            importFileInput.addEventListener('change', async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) return;

                    if (!confirm('This will import items and add them to your existing collection. Continue?')) {
                        return;
                    }

                    UI.showNotification('Importing collection...', 'info');

                    const importedData = await window.ExportImport.importFromJSON(file);

                    // Import items to collection
                    let importCount = 0;
                    for (const item of importedData.data) {
                        // Generate new ID for imported item
                        item.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                        await Storage.addItem(item);
                        importCount++;
                    }

                    UI.showNotification(`Successfully imported ${importCount} items!`, 'success');
                    this.hideExportModal();
                    await this.refresh();

                } catch (error) {
                    UI.showNotification('Error importing: ' + error.message, 'error');
                }
            });
            importFileInput.dataset.bound = 'true';
        }

        // Public Link
        const publicLinkBtn = document.getElementById('publicLinkBtn');
        if (publicLinkBtn && !publicLinkBtn.dataset.bound) {
            publicLinkBtn.addEventListener('click', async () => {
                try {
                    const userId = window.Auth.getUserId();
                    if (!userId) {
                        UI.showNotification('You must be logged in to create public links', 'error');
                        return;
                    }

                    const publicLink = window.ExportImport.generatePublicLink(userId, 'minifigs');
                    navigator.clipboard.writeText(publicLink);
                    UI.showNotification('Public link copied to clipboard!', 'success');
                } catch (error) {
                    UI.showNotification('Error creating public link: ' + error.message, 'error');
                }
            });
            publicLinkBtn.dataset.bound = 'true';
        }
    },

    /**
     * Generate Collection Card
     */
    async generateCollectionCard() {
        try {
            if (!window.SocialSharing) {
                throw new Error('Social sharing module not available');
            }

            const collection = await Storage.getCollection();
            const summary = window.ExportImport.getExportSummary(collection);
            const username = document.getElementById('userName')?.textContent || 'LEGO Collector';

            // Generate card image
            const cardDataUrl = await window.SocialSharing.generateCollectionCard(summary, username, 'minifigs');

            // Show preview modal
            const cardPreviewModal = document.getElementById('cardPreviewModalOverlay');
            const cardPreviewContainer = document.getElementById('cardPreviewContainer');

            if (cardPreviewContainer) {
                cardPreviewContainer.innerHTML = `<img src="${cardDataUrl}" alt="Collection Card" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">`;
            }

            if (cardPreviewModal) {
                cardPreviewModal.classList.add('active');
            }

            // Bind card preview events
            this.bindCardPreviewEvents(cardDataUrl, summary);

        } catch (error) {
            throw error;
        }
    },

    /**
     * Generate QR Code
     */
    async generateQRCode() {
        try {
            if (!window.SocialSharing) {
                throw new Error('Social sharing module not available');
            }

            const collectionUrl = window.location.href;
            const qrDataUrl = await window.SocialSharing.generateQRCode(collectionUrl);

            // Download QR code
            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = 'collection-qr-code.png';
            link.click();

            UI.showNotification('QR code generated and downloaded!', 'success');
        } catch (error) {
            throw error;
        }
    },

    /**
     * Bind Card Preview Events
     */
    bindCardPreviewEvents(cardDataUrl, summary) {
        // Close button
        const cardPreviewCloseBtn = document.getElementById('cardPreviewCloseBtn');
        if (cardPreviewCloseBtn && !cardPreviewCloseBtn.dataset.bound) {
            cardPreviewCloseBtn.addEventListener('click', () => {
                const cardPreviewModal = document.getElementById('cardPreviewModalOverlay');
                if (cardPreviewModal) {
                    cardPreviewModal.classList.remove('active');
                }
            });
            cardPreviewCloseBtn.dataset.bound = 'true';
        }

        // Download button
        const downloadCardBtn = document.getElementById('downloadCardBtn');
        if (downloadCardBtn && !downloadCardBtn.dataset.bound) {
            downloadCardBtn.addEventListener('click', () => {
                window.SocialSharing.downloadImage(cardDataUrl, 'lego-minifigs-collection-card.png');
                UI.showNotification('Collection card downloaded!', 'success');
            });
            downloadCardBtn.dataset.bound = 'true';
        }

        // Share on Twitter button
        const shareCardTwitterBtn = document.getElementById('shareCardTwitterBtn');
        if (shareCardTwitterBtn && !shareCardTwitterBtn.dataset.bound) {
            shareCardTwitterBtn.addEventListener('click', () => {
                const shareText = window.SocialSharing.generateShareText(summary, 'minifigs');
                const shareUrl = window.location.href;
                window.SocialSharing.shareOnSocialMedia('twitter', shareText, shareUrl, cardDataUrl);
            });
            shareCardTwitterBtn.dataset.bound = 'true';
        }

        // Close on click outside
        const cardPreviewModal = document.getElementById('cardPreviewModalOverlay');
        if (cardPreviewModal && !cardPreviewModal.dataset.bound) {
            cardPreviewModal.addEventListener('click', (e) => {
                if (e.target === cardPreviewModal) {
                    cardPreviewModal.classList.remove('active');
                }
            });
            cardPreviewModal.dataset.bound = 'true';
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
            UI.showNotification('Error logging out: ' + error.message, 'error');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
