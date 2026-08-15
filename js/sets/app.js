/**
 * Main Application - Sets Collection Manager
 * Initializes app and handles all user interactions
 */

const App = {
    // Pagination settings
    PAGE_SIZE: 50,

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
        // Pagination state
        pagination: {
            currentPage: 1,
            totalPages: 1,
            pageSize: 50,
            totalItems: 0
        },
        // Cached filtered items (for pagination)
        filteredItems: [],
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

        // Bind event listeners (bind before auth check in case auth fails)
        this.bindEvents();

        // Initial render (skeleton first, then real content)
        UI.showSkeleton();
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
                if (await Dialogs.confirm(t('msg.logoutConfirm'))) {
                    try {
                        await window.Auth.logout();
                        window.location.href = 'login.html';
                    } catch (error) {
                        UI.showNotification(t('msg.logoutError') + error.message, 'error');
                    }
                }
            });
        }

        // Search input
        // Search input (debounced)
        let searchDebounce;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.state.filters.search = e.target.value;
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                this.resetPagination();
                this.renderFilteredCollection();
            }, 250);
        });

        // Filter controls (no type filter for sets only)
        document.getElementById('filterTheme').addEventListener('change', (e) => {
            this.state.filters.theme = e.target.value;
            this.resetPagination();
            this.renderFilteredCollection();
        });

        document.getElementById('filterStatus').addEventListener('change', (e) => {
            this.state.filters.status = e.target.value;
            this.resetPagination();
            this.renderFilteredCollection();
        });

        document.getElementById('filterCondition').addEventListener('change', (e) => {
            this.state.filters.condition = e.target.value;
            this.resetPagination();
            this.renderFilteredCollection();
        });

        document.getElementById('yearMin').addEventListener('change', (e) => {
            this.state.filters.yearMin = e.target.value ? parseInt(e.target.value) : null;
            this.resetPagination();
            this.renderFilteredCollection();
        });

        document.getElementById('yearMax').addEventListener('change', (e) => {
            this.state.filters.yearMax = e.target.value ? parseInt(e.target.value) : null;
            this.resetPagination();
            this.renderFilteredCollection();
        });

        // Clear filters button
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Sort controls
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.state.sort.by = e.target.value;
            this.resetPagination();
            this.renderFilteredCollection();
        });

        document.getElementById('sortOrderBtn').addEventListener('click', () => {
            this.state.sort.ascending = !this.state.sort.ascending;
            UI.updateSortIcon(this.state.sort.ascending);
            this.resetPagination();
            this.renderFilteredCollection();
        });

        // Export button - obsługiwany przez inline showExportDialog() w HTML.
        // (Usunięto drugi listener app.js — powodował podwójne bindowanie akcji eksportu/importu.)

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

        // Pagination event listeners
        document.getElementById('paginationFirst').addEventListener('click', () => {
            this.goToPage(1);
        });

        document.getElementById('paginationPrev').addEventListener('click', () => {
            if (this.state.pagination.currentPage > 1) {
                this.goToPage(this.state.pagination.currentPage - 1);
            }
        });

        document.getElementById('paginationNext').addEventListener('click', () => {
            if (this.state.pagination.currentPage < this.state.pagination.totalPages) {
                this.goToPage(this.state.pagination.currentPage + 1);
            }
        });

        document.getElementById('paginationLast').addEventListener('click', () => {
            this.goToPage(this.state.pagination.totalPages);
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

                // Check for duplicate set number (excluding current item)
                if (formData.setNumber) {
                    const duplicate = await Storage.checkDuplicateBySetNumber(formData.setNumber, formData.id);
                    if (duplicate) {
                        const confirmed = await Dialogs.confirm(t('msg.dupSetConfirm', { n: formData.setNumber }));
                        if (!confirmed) {
                            return;
                        }
                    }
                }

                await Storage.updateItem(formData.id, formData);
                UI.showNotification(t('msg.setUpdated'), 'success');
            } else {

                // Check for duplicate set number
                if (formData.setNumber) {
                    const duplicate = await Storage.checkDuplicateBySetNumber(formData.setNumber);
                    if (duplicate) {
                        UI.showNotification(t('msg.dupSetConfirm', { n: formData.setNumber }), 'warning');
                        return;
                    }
                }

                delete formData.id;
                await Storage.addItem(formData);
                UI.showNotification(t('msg.setAdded'), 'success');

                // Zaproponuj dodanie figurek z tego zestawu (nowy, posiadany, z numerem)
                if (formData.setNumber && formData.status === 'owned') {
                    this.offerSetMinifigs(formData);
                }
            }

            UI.hideModal();
            await this.refresh();
        } catch (error) {
            UI.showNotification(t('common.errorPrefix') + error.message, 'error');
        }
    },

    /**
     * Handle item deletion
     */
    async handleDelete() {
        const id = UI.elements.deleteModalOverlay.dataset.deleteId;
        if (id) {
            await Storage.deleteItem(id);
            UI.showNotification(t('msg.setDeleted'), 'success');
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
            UI.showNotification(t('msg.selectImage'), 'error');
            return;
        }

        // Validate file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            UI.showNotification(t('msg.imageTooBig'), 'error');
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
                    UI.showNotification(t('msg.imageLarge'), 'warning');
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
                    fileName.textContent = file.name + ' (' + t('msg.compressed') + ': ' + compressedSizeKB + ' KB)';
                }
            };
            img.onerror = () => {
                UI.showNotification(t('msg.imageLoadError'), 'error');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            UI.showNotification(t('msg.imageReadError'), 'error');
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

        // Get set number from input
        const setNumberInput = document.getElementById('itemNumber');
        const setNumber = setNumberInput ? setNumberInput.value.trim() : '';

        if (!setNumber) {
            Dialogs.alert(t('msg.enterSetNumber'));
            setNumberInput.focus();
            return;
        }

        // Try multiple image URL formats
        const imageUrls = [
            // BrickLink CDN - with variant
            `https://img.bricklink.com/ItemImage/SN/0/${setNumber}-1.png`,
            // BrickLink CDN - without variant
            `https://img.bricklink.com/ItemImage/SN/0/${setNumber}.png`,
            // Try JPG format
            `https://img.bricklink.com/ItemImage/SN/0/${setNumber}-1.jpg`,
            `https://img.bricklink.com/ItemImage/SN/0/${setNumber}.jpg`
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
                        fileName.textContent = t('form.officialImage', { n: setNumber });
                    }

                    success = true;
                    break;
                }
            } catch (error) {
                lastError = error;
            }
        }

        if (!success) {
            Dialogs.alert(t('msg.noOfficialImageSet', { n: setNumber }));
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

        this.resetPagination();
        this.renderFilteredCollection();
    },

    /**
     * Apply filters and sort to collection
     * @returns {Promise<Array>} Filtered and sorted items (all items, not paginated)
     */
    async getFilteredCollection() {
        let items = await Storage.getCollection();

        if (items.length > 0) {
        }

        const { filters, sort } = this.state;

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            items = items.filter(item => {
                const name = (item.name || '').toLowerCase();
                const number = (item.setNumber || '').toLowerCase();
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
                    valueA = (a.setNumber) || '';
                    valueB = (b.setNumber) || '';
                    break;
                case 'theme':
                    valueA = (a.theme || '').toLowerCase();
                    valueB = (b.theme || '').toLowerCase();
                    break;
                case 'year':
                    valueA = a.year || 0;
                    valueB = b.year || 0;
                    break;
                case 'pieces':
                    valueA = a.pieceCount || 0;
                    valueB = b.pieceCount || 0;
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

        // Store filtered items in cache for pagination
        this.state.filteredItems = items;

        return items;
    },

    /**
     * Render filtered collection with pagination
     */
    async renderFilteredCollection() {
        // Get all filtered items
        const allItems = await this.getFilteredCollection();

        const totalItems = allItems.length;
        const totalPages = Math.ceil(totalItems / this.PAGE_SIZE) || 1;
        const currentPage = this.state.pagination.currentPage;

        // Ensure current page is valid
        if (currentPage > totalPages) {
            this.state.pagination.currentPage = totalPages;
        }

        // Get items for current page
        const startIndex = (this.state.pagination.currentPage - 1) * this.PAGE_SIZE;
        const endIndex = startIndex + this.PAGE_SIZE;
        const itemsToShow = allItems.slice(startIndex, endIndex);

        // Update pagination state
        this.state.pagination = {
            currentPage: this.state.pagination.currentPage,
            totalPages: totalPages,
            pageSize: this.PAGE_SIZE,
            totalItems: totalItems
        };

        // Render items
        if (itemsToShow.length > 0) {
        }

        UI.renderCollection(itemsToShow);

        // Render pagination controls
        UI.renderPagination({
            currentPage: this.state.pagination.currentPage,
            totalPages: this.state.pagination.totalPages,
            pageSize: this.state.pagination.pageSize,
            totalItems: this.state.pagination.totalItems,
            hasNext: this.state.pagination.currentPage < this.state.pagination.totalPages,
            hasPrev: this.state.pagination.currentPage > 1
        });
    },

    /**
     * Navigate to a specific page
     * @param {number} pageNum - Page number to go to
     */
    goToPage(pageNum) {
        const totalPages = this.state.pagination.totalPages;

        if (pageNum < 1 || pageNum > totalPages) {
            return;
        }

        this.state.pagination.currentPage = pageNum;
        this.renderFilteredCollection();

        // Scroll to top of collection
        document.querySelector('.collection-area').scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * Reset pagination to first page (call when filters change)
     */
    resetPagination() {
        this.state.pagination.currentPage = 1;
    },

    /**
     * Full refresh of the UI
     */
    async refresh() {
        UI.showSkeleton();

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
            userBtn.title = t('msg.loggedInAs', { email: email });
        }
    },

    attachDropdownListeners() {
        // Prevent multiple listener attachments
        if (this.state.dropdownListenersAttached) return;
        this.state.dropdownListenersAttached = true;

        const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
        if (logoutDropdownBtn) {
            logoutDropdownBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const confirmed = await Dialogs.confirm(t('msg.logoutConfirm'), { danger: true });
                if (confirmed) {
                    try {
                        await window.Auth.logout();
                        UI.showNotification('Logged out successfully', 'success');

                        // Redirect to login page
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 500);
                    } catch (error) {
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
        const dropdown = document.getElementById('userDropdownMenu');
        const loginBtn = document.getElementById('loginBtn');

        if (dropdown && loginBtn) {
            const isActive = dropdown.classList.contains('active');

            if (isActive) {
                dropdown.classList.remove('active');
                loginBtn.classList.remove('dropdown-active');
            } else {
                dropdown.classList.add('active');
                loginBtn.classList.add('dropdown-active');
            }
        }
    },

    hideUserDropdown() {
        const dropdown = document.getElementById('userDropdownMenu');
        const loginBtn = document.getElementById('loginBtn');

        if (dropdown) {
            dropdown.classList.remove('active');
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
                UI.showNotification(t('msg.buyNotAvail'), 'error');
                return;
            }

            const buyModal = document.getElementById('buyModalOverlay');
            const buyModalContent = document.getElementById('buyModalContent');
            const legoComLink = document.getElementById('legoComStoreLink');

            if (!buyModal || !buyModalContent) {
                return;
            }

            const collectionType = 'setsCollection';

            // Set LEGO.com link URL
            if (legoComLink) {
                if (item && item.setNumber) {
                    // Search for this set on LEGO.com
                    legoComLink.href = `https://www.lego.com/en-US/search?q=${encodeURIComponent(item.setNumber)}`;
                } else {
                    // Go to LEGO.com homepage
                    legoComLink.href = 'https://www.lego.com/en-US/categories/sets';
                }
            }

            const linksHTML = window.BuyLinks.generateStoreLinksHTML(item, collectionType);
            buyModalContent.innerHTML = linksHTML;
            buyModal.classList.add('active');
        } catch (error) {
            UI.showNotification(t('msg.buyOpenError') + error.message, 'error');
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
        if (await Dialogs.confirm(t('auth.notVerifiedConfirm'))) {
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

    // ===== SET MINIFIGURES OFFER =====

    /**
     * Po dodaniu zestawu: zapytaj Rebrickable o figurki w zestawie
     * i zaproponuj dodanie wybranych do kolekcji minifigurek.
     * @param {Object} formData - dane właśnie zapisanego zestawu
     */
    async offerSetMinifigs(formData) {
        try {
            const functionsInstance = window.getFirebaseFunctions();
            if (!functionsInstance) return;

            const lookup = functionsInstance.httpsCallable('lookupLegoItem');
            const result = await lookup({
                itemNumber: formData.setNumber,
                itemType: 'set',
                listMinifigs: true
            });

            const minifigs = (result.data && result.data.minifigs) || [];
            if (minifigs.length === 0) return; // zestaw bez figurek — cisza

            // Magazyn minifigurek (strona zestawów nie ma własnego Storage minifigs)
            const minifigsStorage = window.createFirestoreStorage(
                'minifigsCollection',
                () => window.Auth.getUserId()
            );
            const existing = await minifigsStorage.getCollection();
            const ownedNums = new Set(
                existing.map(i => (i.figureNumber || '').toString().trim().toLowerCase())
            );

            const result_ = await this.showMinifigsOfferModal(formData, minifigs, ownedNums);
            if (!result_ || result_.length === 0) return;

            let added = 0;
            for (const fig of result_) {
                await minifigsStorage.addItem({
                    type: 'minifigure',
                    figureNumber: fig.figureNumber,
                    name: fig.name,
                    theme: formData.theme || '',
                    year: formData.year || null,
                    status: 'owned',
                    condition: formData.condition || 'new',
                    location: formData.location || '',
                    notes: t('mf.fromSet', { set: formData.setNumber }) +
                           (fig.quantity > 1 ? ' x' + fig.quantity : ''),
                    imageUrl: fig.imageUrl || null
                });
                added++;
            }

            const skipped = minifigs.filter(
                m => ownedNums.has((m.figureNumber || '').toLowerCase())
            ).length;

            let summary = added > 0
                ? t('mf.added', { n: added })
                : t('mf.none');
            if (skipped > 0) summary += t('mf.skipped', { k: skipped });
            Dialogs.alert(summary, { type: added > 0 ? 'success' : 'info' });
        } catch (error) {
            Dialogs.alert(t('mf.error'), { type: 'warning' });
        }
    },

    /**
     * Modal z listą figurek; zwraca Promise<Array> wybranych figurek
     * (pusty = pominięto).
     */
    showMinifigsOfferModal(formData, minifigs, ownedNums) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.style.zIndex = '10050';

            const rows = minifigs.map((fig, idx) => {
                const owned = ownedNums.has((fig.figureNumber || '').toLowerCase());
                return `
                    <label class="mf-item${owned ? ' mf-owned' : ''}">
                        <input type="checkbox" data-idx="${idx}" ${owned ? 'disabled' : 'checked'}>
                        <img src="${fig.imageUrl || ''}" alt="" loading="lazy"
                             onerror="this.style.visibility='hidden'">
                        <span class="mf-item-info">
                            <span class="mf-item-name">${fig.name || fig.figureNumber}</span>
                            <span class="mf-item-meta">#${fig.figureNumber}${fig.quantity > 1 ? ' &times; ' + fig.quantity : ''}${owned ? ' — ' + t('mf.have') : ''}</span>
                        </span>
                    </label>`;
            }).join('');

            overlay.innerHTML = `
                <div class="modal" style="max-width:560px">
                    <div class="modal-header">
                        <h2>${t('mf.title')}</h2>
                        <button type="button" class="btn-close" data-act="skip">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${t('mf.desc', { set: formData.setNumber, n: minifigs.length })}</p>
                        <label class="mf-selectall">
                            <input type="checkbox" id="mfSelectAll" checked>
                            ${t('mf.addAll')}
                        </label>
                        <div class="mf-list">${rows}</div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" data-act="skip">${t('mf.skip')}</button>
                        <button type="button" class="btn btn-primary" data-act="add">${t('mf.add')}</button>
                    </div>
                </div>`;

            const finish = val => { overlay.remove(); resolve(val); };

            overlay.addEventListener('click', e => {
                if (e.target === overlay) finish([]);
                const act = e.target.closest('[data-act]');
                if (!act) return;
                if (act.dataset.act === 'skip') { finish([]); return; }
                // add
                const selected = Array.from(overlay.querySelectorAll('input[data-idx]:checked'))
                    .map(cb => minifigs[parseInt(cb.dataset.idx, 10)]);
                finish(selected);
            });

            overlay.querySelector('#mfSelectAll').addEventListener('change', function () {
                overlay.querySelectorAll('input[data-idx]:not(:disabled)')
                    .forEach(cb => { cb.checked = this.checked; });
            });

            document.body.appendChild(overlay);
        });
    },

    // ===== AI VISION METHODS =====

    /**
     * Handle Auto-Fill by Set Number button click
     * Fetches data from BrickSet API and auto-fills the form
     */
    async handleAutoFillByNumber() {

        // Get set number from input
        const setNumberInput = document.getElementById('autoFillSetNumber');
        const setNumber = setNumberInput ? setNumberInput.value.trim() : '';

        if (!setNumber) {
            this.showAutoFillStatus('warning', '⚠️ Please enter a set number first.');
            UI.showNotification('Please enter a set number.', 'warning');
            return;
        }

        const autoFillBtn = document.getElementById('autoFillBtn');
        const originalText = autoFillBtn.innerHTML;

        try {
            // Show loading state
            autoFillBtn.disabled = true;
            autoFillBtn.innerHTML = '<span class="ai-loading-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span> Loading...';
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
            const result = await window.AIVision.recognizeByNumber(setNumber, 'set');

            if (!result.success || !result.data) {
                this.showAutoFillStatus('warning', `⚠️ Set "${setNumber}" not found in BrickSet database.`);
                UI.showNotification(`Set ${setNumber} not found. Check the number and try again.`, 'warning');
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
            this.showAutoFillStatus('success', `✅ "${data.name}" - Form filled with ${data.pieceCount || '?'} pieces, ${data.theme || '?'}, ${data.year || '?'}${data.pricePaid ? ', $' + data.pricePaid : ''}`);
            UI.showNotification(`Set data auto-filled from BrickSet!${data.imageUrl ? ' Image downloaded.' : ''}`, 'success');

            // Update button state
            autoFillBtn.innerHTML = '✅ Done!';

            // Clear the input field
            setNumberInput.value = '';

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
        if (data.setNumber) setValue('itemNumber', data.setNumber);
        if (data.theme) setValue('itemTheme', data.theme);
        if (data.year) setValue('itemYear', data.year);
        if (data.pieceCount) setValue('itemPieceCount', data.pieceCount);
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
                UI.showNotification(t('msg.exportNotAvail'), 'error');
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
            UI.showNotification(t('msg.exportOpenError') + error.message, 'error');
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
                    window.ExportImport.exportToCSV(collection, 'sets');
                    UI.showNotification(t('msg.exportCsvOk'), 'success');
                } catch (error) {
                    UI.showNotification(t('msg.exportCsvErr') + error.message, 'error');
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
                    window.ExportImport.exportToJSON(collection, 'sets', metadata);
                    UI.showNotification(t('msg.exportJsonOk'), 'success');
                } catch (error) {
                    UI.showNotification(t('msg.exportJsonErr') + error.message, 'error');
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
                    UI.showNotification(t('msg.cardErr') + error.message, 'error');
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
                    UI.showNotification(t('msg.qrErr') + error.message, 'error');
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

                    if (!await Dialogs.confirm(t('msg.importConfirm'))) {
                        return;
                    }

                    UI.showNotification(t('msg.importing'), 'info');

                    const importedData = await window.ExportImport.importFromJSON(file);

                    // Import items to collection
                    let importCount = 0;
                    for (const item of importedData.data) {
                        // Generate new ID for imported item
                        item.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                        await Storage.addItem(item);
                        importCount++;
                    }

                    UI.showNotification(t('msg.imported', { count: importCount }), 'success');
                    this.hideExportModal();
                    await this.refresh();

                } catch (error) {
                    UI.showNotification(t('msg.importErr') + error.message, 'error');
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
                        UI.showNotification(t('msg.loginRequiredPublic'), 'error');
                        return;
                    }

                    const publicLink = window.ExportImport.generatePublicLink(userId, 'sets');
                    navigator.clipboard.writeText(publicLink);
                    UI.showNotification(t('msg.publicLinkCopied'), 'success');
                } catch (error) {
                    UI.showNotification(t('msg.publicLinkErr') + error.message, 'error');
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
                throw new Error(t('msg.socialMissing'));
            }

            const collection = await Storage.getCollection();
            const summary = window.ExportImport.getExportSummary(collection);
            const username = document.getElementById('userName')?.textContent || 'LEGO Collector';

            // Generate card image
            const cardDataUrl = await window.SocialSharing.generateCollectionCard(summary, username, 'sets');

            // Show preview modal
            const cardPreviewModal = document.getElementById('cardPreviewModalOverlay');
            const cardPreviewContainer = document.getElementById('cardPreviewContainer');

            if (cardPreviewContainer) {
                cardPreviewContainer.innerHTML = `<img src="${cardDataUrl}" alt="${t('cardPreview.alt')}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">`;
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
                throw new Error(t('msg.socialMissing'));
            }

            const collectionUrl = window.location.href;
            const qrDataUrl = await window.SocialSharing.generateQRCode(collectionUrl);

            // Download QR code
            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = 'collection-qr-code.png';
            link.click();

            UI.showNotification(t('msg.qrDownloaded'), 'success');
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
                window.SocialSharing.downloadImage(cardDataUrl, 'lego-collection-card.png');
                UI.showNotification(t('msg.cardDownloaded'), 'success');
            });
            downloadCardBtn.dataset.bound = 'true';
        }

        // Share on Twitter button
        const shareCardTwitterBtn = document.getElementById('shareCardTwitterBtn');
        if (shareCardTwitterBtn && !shareCardTwitterBtn.dataset.bound) {
            shareCardTwitterBtn.addEventListener('click', () => {
                const shareText = window.SocialSharing.generateShareText(summary, 'sets');
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
