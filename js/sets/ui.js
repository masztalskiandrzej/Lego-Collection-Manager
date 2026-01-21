/**
 * UI Module - Handles all DOM rendering and UI updates for Sets
 */

const UI = {
    // DOM Element References
    elements: {
        collectionGrid: null,
        emptyState: null,
        filterTheme: null,
        themesList: null,
        modalOverlay: null,
        deleteModalOverlay: null,
        itemForm: null,
        notification: null,
        sortOrderBtn: null,
        gridViewBtn: null,
        listViewBtn: null,
        // Stats elements
        totalItems: null,
        totalPieces: null,
        totalValue: null,
        // Pagination elements
        pagination: null,
        paginationFirst: null,
        paginationPrev: null,
        paginationNext: null,
        paginationLast: null,
        paginationCurrent: null,
        paginationTotal: null,
        paginationShowing: null,
        paginationTotalItems: null
    },

    /**
     * Initialize UI element references
     */
    init() {
        this.elements.collectionGrid = document.getElementById('collectionGrid');
        this.elements.emptyState = document.getElementById('emptyState');
        this.elements.filterTheme = document.getElementById('filterTheme');
        this.elements.themesList = document.getElementById('themesList');
        this.elements.modalOverlay = document.getElementById('modalOverlay');
        this.elements.deleteModalOverlay = document.getElementById('deleteModalOverlay');
        this.elements.itemForm = document.getElementById('itemForm');
        this.elements.notification = document.getElementById('notification');
        this.elements.sortOrderBtn = document.getElementById('sortOrderBtn');
        this.elements.gridViewBtn = document.getElementById('gridViewBtn');
        this.elements.listViewBtn = document.getElementById('listViewBtn');
        this.elements.totalItems = document.getElementById('totalItems');
        this.elements.totalPieces = document.getElementById('totalPieces');
        this.elements.totalValue = document.getElementById('totalValue');
        // Pagination elements
        this.elements.pagination = document.getElementById('pagination');
        this.elements.paginationFirst = document.getElementById('paginationFirst');
        this.elements.paginationPrev = document.getElementById('paginationPrev');
        this.elements.paginationNext = document.getElementById('paginationNext');
        this.elements.paginationLast = document.getElementById('paginationLast');
        this.elements.paginationCurrent = document.getElementById('paginationCurrent');
        this.elements.paginationTotal = document.getElementById('paginationTotal');
        this.elements.paginationShowing = document.getElementById('paginationShowing');
        this.elements.paginationTotalItems = document.getElementById('paginationTotalItems');
    },

    /**
     * Render collection items to the grid
     * @param {Array} items - Array of items to render
     */
    renderCollection(items) {
        const grid = this.elements.collectionGrid;
        const emptyState = this.elements.emptyState;

        if (items.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = items.map(item => this.createItemCard(item)).join('');
    },

    /**
     * Create HTML for a single item card (set only)
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    createItemCard(item) {
        console.log('🎨 Creating card for item:', item.name, 'with imageUrl:', item.imageUrl ? item.imageUrl.substring(0, 50) + '...' : 'none');

        // All items are sets
        const number = item.setNumber;
        const numberLabel = '#';

        // Format price
        const price = item.pricePaid ? `$${parseFloat(item.pricePaid).toFixed(2)}` : '-';

        // Build details array
        const details = [];
        if (item.condition) details.push(this.capitalize(item.condition));
        if (item.pieceCount) details.push(`${item.pieceCount.toLocaleString()} pcs`);
        if (item.location) details.push(item.location);

        // Image HTML
        const imageHtml = item.imageUrl
            ? `<div class="card-image">
                <img src="${this.escapeHtml(item.imageUrl)}" alt="${this.escapeHtml(item.name)}" loading="lazy" onerror="this.parentElement.classList.add('no-image')">
               </div>`
            : `<div class="card-image no-image">
                <span class="placeholder-icon">&#9632;</span>
               </div>`;

        console.log('🖼️ Image HTML generated:', imageHtml.substring(0, 100) + '...');

        return `
            <div class="item-card" data-id="${item.id}">
                <div class="card-header">
                    <span class="card-type set">SET</span>
                    <span class="card-status ${item.status}">${this.capitalize(item.status)}</span>
                </div>
                ${imageHtml}
                <div class="card-body">
                    <div class="card-main-info">
                        <h3 class="card-name">${this.escapeHtml(item.name)}</h3>
                        ${number ? `<p class="card-number">${numberLabel}${this.escapeHtml(number)}</p>` : ''}
                        <p class="card-info">${this.escapeHtml(item.theme)} ${item.year ? `&bull; ${item.year}` : ''}</p>
                        ${item.pieceCount ? `<p class="card-info">${item.pieceCount.toLocaleString()} pieces</p>` : ''}
                        <p class="card-info"><strong>${price}</strong></p>
                    </div>
                    ${details.length > 0 ? `
                        <div class="card-details">
                            ${details.map(d => `<span class="card-detail">${this.escapeHtml(d)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary edit-btn" data-id="${item.id}">Edit</button>
                    <button class="btn btn-buy-item buy-item-btn" data-id="${item.id}" title="Search for this item in stores">🛒 Buy</button>
                    <button class="btn btn-danger delete-btn" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `;
    },

    /**
     * Update theme filter dropdown with available themes
     * @param {Array} themes - Array of theme names
     */
    renderThemeFilter(themes) {
        const select = this.elements.filterTheme;
        const datalist = this.elements.themesList;

        // Update filter dropdown
        const currentValue = select.value;
        select.innerHTML = '<option value="all">All Themes</option>';
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            option.textContent = theme;
            select.appendChild(option);
        });

        // Restore selection if still valid
        if (themes.includes(currentValue)) {
            select.value = currentValue;
        }

        // Update datalist for form
        datalist.innerHTML = themes.map(t => `<option value="${this.escapeHtml(t)}">`).join('');
    },

    /**
     * Update statistics display
     * @param {Object} stats - Stats object from Storage
     */
    renderStats(stats) {
        this.elements.totalItems.textContent = stats.total;
        this.elements.totalPieces.textContent = stats.totalPieces ? stats.totalPieces.toLocaleString() : 0;
        this.elements.totalValue.textContent = `$${stats.totalValue.toFixed(2)}`;
    },

    /**
     * Show the add/edit modal
     * @param {Object|null} item - Item to edit, or null for new item
     */
    showModal(item = null) {
        const modal = this.elements.modalOverlay;
        const form = this.elements.itemForm;
        const title = document.getElementById('modalTitle');

        // Reset form
        form.reset();
        document.getElementById('itemId').value = '';
        document.getElementById('itemType').value = 'set';

        // Reset image upload state
        this.resetImageUpload();

        if (item) {
            // Edit mode
            title.textContent = 'Edit Set';
            document.getElementById('itemId').value = item.id;
            document.getElementById('itemName').value = item.name || '';
            document.getElementById('itemNumber').value = item.setNumber || '';
            document.getElementById('itemTheme').value = item.theme || '';
            document.getElementById('itemYear').value = item.year || '';
            document.getElementById('itemStatus').value = item.status || 'owned';
            document.getElementById('itemPieceCount').value = item.pieceCount || '';
            document.getElementById('itemPrice').value = item.pricePaid || '';
            document.getElementById('itemCondition').value = item.condition || 'new';
            document.getElementById('itemLocation').value = item.location || '';
            document.getElementById('itemNotes').value = item.notes || '';

            // Show existing image if available
            if (item.imageUrl) {
                this.showImagePreview(item.imageUrl);
            }
        } else {
            // Add mode
            title.textContent = 'Add Set';
        }

        modal.classList.add('active');
        document.getElementById('itemName').focus();
    },

    /**
     * Reset image upload state
     */
    resetImageUpload() {
        const fileInput = document.getElementById('itemImageFile');
        const fileName = document.getElementById('imageFileName');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('imagePreviewImg');

        if (fileInput) fileInput.value = '';
        if (fileName) fileName.textContent = 'No file chosen';
        if (preview) preview.style.display = 'none';
        if (previewImg) previewImg.src = '';

        // Store current image URL for reference
        this.currentImageUrl = null;
    },

    /**
     * Show image preview
     * @param {string} imageUrl - URL of the image to preview
     */
    showImagePreview(imageUrl) {
        console.log('🖼️ showImagePreview called with:', imageUrl ? imageUrl.substring(0, 50) + '...' : 'null');

        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('imagePreviewImg');
        const fileName = document.getElementById('imageFileName');

        if (preview && previewImg) {
            previewImg.src = imageUrl;
            preview.style.display = 'block';
            this.currentImageUrl = imageUrl;

            // Update file name to show existing image
            if (fileName) {
                if (imageUrl.startsWith('data:')) {
                    fileName.textContent = 'New image selected';
                } else {
                    fileName.textContent = 'Current image';
                }
            }
            console.log('✅ Preview displayed');
        } else {
            console.error('❌ Preview elements not found:', { preview: !!preview, previewImg: !!previewImg });
        }
    },

    /**
     * Hide the add/edit modal
     */
    hideModal() {
        this.elements.modalOverlay.classList.remove('active');
    },

    /**
     * Show delete confirmation modal
     * @param {Object} item - Item to delete
     */
    showDeleteModal(item) {
        document.getElementById('deleteItemName').textContent = item.name;
        this.elements.deleteModalOverlay.dataset.deleteId = item.id;
        this.elements.deleteModalOverlay.classList.add('active');
    },

    /**
     * Hide delete confirmation modal
     */
    hideDeleteModal() {
        this.elements.deleteModalOverlay.classList.remove('active');
        delete this.elements.deleteModalOverlay.dataset.deleteId;
    },

    /**
     * Show notification toast
     * @param {string} message - Message to display
     * @param {string} type - 'success' or 'error'
     */
    showNotification(message, type = 'success') {
        const notification = this.elements.notification;
        const messageEl = document.getElementById('notificationMessage');

        messageEl.textContent = message;
        notification.className = 'notification show ' + type;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    },

    /**
     * Toggle sort order icon
     * @param {boolean} isAscending - Current sort direction
     */
    updateSortIcon(isAscending) {
        const icon = this.elements.sortOrderBtn.querySelector('.sort-icon');
        if (isAscending) {
            icon.classList.remove('desc');
        } else {
            icon.classList.add('desc');
        }
    },

    /**
     * Update view toggle buttons
     * @param {string} view - 'grid' or 'list'
     */
    updateViewToggle(view) {
        const grid = this.elements.collectionGrid;
        const gridBtn = this.elements.gridViewBtn;
        const listBtn = this.elements.listViewBtn;

        if (view === 'list') {
            grid.classList.add('list-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        } else {
            grid.classList.remove('list-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        }
    },

    /**
     * Get form data from the item form
     * @returns {Object} Form data object
     */
    getFormData() {
        const formData = {
            id: document.getElementById('itemId').value || null,
            type: 'set',
            name: document.getElementById('itemName').value.trim(),
            setNumber: document.getElementById('itemNumber').value.trim(),
            theme: document.getElementById('itemTheme').value.trim(),
            year: parseInt(document.getElementById('itemYear').value) || null,
            status: document.getElementById('itemStatus').value,
            pieceCount: parseInt(document.getElementById('itemPieceCount').value) || null,
            pricePaid: parseFloat(document.getElementById('itemPrice').value) || 0,
            condition: document.getElementById('itemCondition').value,
            location: document.getElementById('itemLocation').value.trim(),
            notes: document.getElementById('itemNotes').value.trim()
        };

        // Include current image URL if exists (use stored currentImageUrl)
        console.log('🔍 getFormData - checking for image:', {
            currentImageUrl: this.currentImageUrl ? this.currentImageUrl.substring(0, 50) + '...' : 'none',
            currentImageUrlLength: this.currentImageUrl ? this.currentImageUrl.length : 0
        });

        if (this.currentImageUrl) {
            formData.imageUrl = this.currentImageUrl;
            console.log('✅ Image URL included in form data, length:', formData.imageUrl.length);
        } else {
            formData.imageUrl = null;
            console.log('ℹ️ No image URL in form data');
        }

        return formData;
    },

    /**
     * Helper: Capitalize first letter
     * @param {string} str - String to capitalize
     * @returns {string}
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Helper: Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string}
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Render pagination controls
     * @param {Object} paginationState - Pagination state object
     */
    renderPagination(paginationState) {
        const {
            currentPage,
            totalPages,
            pageSize,
            totalItems,
            hasNext,
            hasPrev
        } = paginationState;

        const pagination = this.elements.pagination;

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        // Update page numbers
        this.elements.paginationCurrent.textContent = currentPage;
        this.elements.paginationTotal.textContent = totalPages;
        this.elements.paginationTotalItems.textContent = totalItems.toLocaleString();

        // Calculate showing range (e.g., "1-50")
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);
        this.elements.paginationShowing.textContent = `${startItem}-${endItem}`;

        // Update button states
        this.elements.paginationFirst.disabled = !hasPrev;
        this.elements.paginationPrev.disabled = !hasPrev;
        this.elements.paginationNext.disabled = !hasNext;
        this.elements.paginationLast.disabled = !hasNext;
    },

    /**
     * Show/hide pagination
     * @param {boolean} show - Whether to show pagination
     */
    togglePagination(show) {
        const pagination = this.elements.pagination;
        if (show) {
            pagination.style.display = 'flex';
        } else {
            pagination.style.display = 'none';
        }
    }
};
