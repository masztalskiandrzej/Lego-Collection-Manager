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
    /**
     * Show skeleton placeholder cards while the collection loads.
     * @param {number} count - How many skeleton cards to render
     */
    showSkeleton(count = 8) {
        const grid = this.elements.collectionGrid;
        if (!grid) return;
        this.elements.emptyState.style.display = 'none';
        const card = `
            <div class="item-card skeleton-card">
                <div class="skeleton-block sk-image"></div>
                <div class="sk-body">
                    <div class="sk-badges">
                        <div class="skeleton-block sk-badge"></div>
                        <div class="skeleton-block sk-badge"></div>
                    </div>
                    <div class="skeleton-block sk-line w60"></div>
                    <div class="skeleton-block sk-line w40"></div>
                    <div class="skeleton-block sk-line w80"></div>
                </div>
                <div class="sk-actions">
                    <div class="skeleton-block sk-btn"></div>
                    <div class="skeleton-block sk-btn"></div>
                    <div class="skeleton-block sk-btn"></div>
                </div>
            </div>`;
        grid.innerHTML = card.repeat(count);
    },

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

        // All items are sets
        const number = item.setNumber;
        const numberLabel = '#';

        // Format price
        const price = item.pricePaid ? `$${parseFloat(item.pricePaid).toFixed(2)}` : '-';
        const mv = parseFloat(item.marketValue) || 0;
        const pp = parseFloat(item.pricePaid) || 0;
        const roi = (mv > 0 && pp > 0) ? ((mv - pp) / pp) * 100 : null;

        // Build details array
        const details = [];
        if (item.condition) details.push(t('condition.' + item.condition));
        if (item.pieceCount) details.push(t('card.pieces', { n: item.pieceCount.toLocaleString() }));
        if (item.location) details.push(item.location);

        // Image HTML
        const imageHtml = item.imageUrl
            ? `<div class="card-image">
                <img src="${this.escapeHtml(item.imageUrl)}" alt="${this.escapeHtml(item.name)}" loading="lazy" onerror="this.parentElement.classList.add('no-image')">
               </div>`
            : `<div class="card-image no-image">
                <span class="placeholder-icon">&#9632;</span>
               </div>`;

        return `
            <div class="item-card" data-id="${item.id}">
                <div class="card-header">
                    <span class="card-type set">${t('type.set')}</span>
                    <span class="card-status ${item.status}">${t('status.' + item.status)}</span>
                </div>
                ${imageHtml}
                <div class="card-body">
                    <div class="card-main-info">
                        <h3 class="card-name">${this.escapeHtml(item.name)}</h3>
                        ${number ? `<p class="card-number">${numberLabel}${this.escapeHtml(number)}</p>` : ''}
                        <p class="card-info">${this.escapeHtml(item.theme)} ${item.year ? `&bull; ${item.year}` : ''}</p>
                        ${item.pieceCount ? `<p class="card-info">${t('card.pieces', { n: item.pieceCount.toLocaleString() })}</p>` : ''}
                        <p class="card-info"><strong>${price}</strong></p>
                        ${mv > 0 ? `<p class="card-info"><strong>$${mv.toFixed(2)}</strong>${roi !== null ? ` <span class="roi-badge ${roi >= 0 ? 'roi-up' : 'roi-down'}">${roi >= 0 ? '&#9650; +' : '&#9660; '}${roi.toFixed(0)}%</span>` : ''}${item.setNumber ? ` <a class="card-be-link" href="https://www.brickeconomy.com/set/search?query=${item.setNumber}" target="_blank" rel="noopener" title="${t('card.be')}">&#8599;</a>` : ''}</p>` : ''}
                    </div>
                    ${details.length > 0 ? `
                        <div class="card-details">
                            ${details.map(d => `<span class="card-detail">${this.escapeHtml(d)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary edit-btn" data-id="${item.id}">${t('common.edit')}</button>
                    <button class="btn btn-buy-item buy-item-btn" data-id="${item.id}" title="${t('buy.itemTitle')}">${t('header.buy')}</button>
                    <button class="btn btn-danger delete-btn" data-id="${item.id}">${t('common.delete')}</button>
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
        select.innerHTML = '<option value="all" data-i18n="filters.allThemes">' + t('filters.allThemes') + '</option>';
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
            title.textContent = t('form.editSetTitle');
            document.getElementById('itemId').value = item.id;
            document.getElementById('itemName').value = item.name || '';
            document.getElementById('itemNumber').value = item.setNumber || '';
            document.getElementById('itemTheme').value = item.theme || '';
            document.getElementById('itemYear').value = item.year || '';
            document.getElementById('itemStatus').value = item.status || 'owned';
            document.getElementById('itemPieceCount').value = item.pieceCount || '';
            document.getElementById('itemPrice').value = item.pricePaid || '';
            document.getElementById('itemMarketValue').value = item.marketValue || '';
            document.getElementById('itemCondition').value = item.condition || 'new';
            document.getElementById('itemLocation').value = item.location || '';
            document.getElementById('itemNotes').value = item.notes || '';

            // Show existing image if available
            if (item.imageUrl) {
                this.showImagePreview(item.imageUrl);
            }
        } else {
            // Add mode
            title.textContent = t('form.addSetTitle');
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
        if (fileName) fileName.textContent = t('form.noFile');
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
                    fileName.textContent = t('form.newImage');
                } else {
                    fileName.textContent = t('form.currentImage');
                }
            }
        } else {
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
            marketValue: parseFloat(document.getElementById('itemMarketValue').value) || null,
            condition: document.getElementById('itemCondition').value,
            location: document.getElementById('itemLocation').value.trim(),
            notes: document.getElementById('itemNotes').value.trim()
        };

        // Include current image URL if exists (use stored currentImageUrl)

        if (this.currentImageUrl) {
            formData.imageUrl = this.currentImageUrl;
        } else {
            formData.imageUrl = null;
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
