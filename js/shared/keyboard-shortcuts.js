/**
 * Keyboard Shortcuts Module
 * Handles keyboard navigation and shortcuts throughout the app
 */
const KeyboardShortcuts = {
    shortcuts: [
        { key: 'N', description: 'kbd.newItem', action: 'newItem' },
        { key: 'S', description: 'kbd.focusSearch', action: 'focusSearch' },
        { key: '/', description: 'kbd.focusSearchAlt', action: 'focusSearch' },
        { key: 'G', description: 'kbd.gridView', action: 'gridView' },
        { key: 'L', description: 'kbd.listView', action: 'listView' },
        { key: 'D', description: 'kbd.toggleTheme', action: 'toggleTheme' },
        { key: '1', description: 'kbd.filterAll', action: 'filterAll' },
        { key: '2', description: 'kbd.filterOwned', action: 'filterOwned' },
        { key: '3', description: 'kbd.filterWishlist', action: 'filterWishlist' },
        { key: '4', description: 'kbd.filterSold', action: 'filterSold' },
        { key: '?', description: 'kbd.showHelp', action: 'showHelp' },
        { key: 'Esc', description: 'kbd.closeModal', action: 'closeModal' }
    ],

    callbacks: {},
    initialized: false,

    /**
     * Initialize keyboard shortcuts with callbacks
     * @param {Object} callbacks - Object with callback functions for each action
     */
    init(callbacks) {
        if (this.initialized) {
            return;
        }

        this.callbacks = callbacks;
        this.initialized = true;

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    },

    /**
     * Handle keydown event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        // Always allow Escape
        if (e.key === 'Escape') {
            this.callbacks.closeModal?.();
            this.hideHelpModal();
            return;
        }

        // Always allow ? for help
        if (e.key === '?') {
            e.preventDefault();
            this.showHelpModal();
            return;
        }

        // Skip if focused on input elements
        if (this.isInputFocused()) return;

        // Skip if Ctrl/Cmd/Alt is pressed (allow browser shortcuts)
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const key = e.key.toUpperCase();

        switch (key) {
            case 'N':
                e.preventDefault();
                this.callbacks.newItem?.();
                break;
            case 'S':
                e.preventDefault();
                this.callbacks.focusSearch?.();
                break;
            case '/':
                e.preventDefault();
                this.callbacks.focusSearch?.();
                break;
            case 'G':
                e.preventDefault();
                this.callbacks.gridView?.();
                break;
            case 'L':
                e.preventDefault();
                this.callbacks.listView?.();
                break;
            case 'D':
                e.preventDefault();
                this.callbacks.toggleTheme?.();
                break;
            case '1':
                e.preventDefault();
                this.callbacks.filterAll?.();
                break;
            case '2':
                e.preventDefault();
                this.callbacks.filterOwned?.();
                break;
            case '3':
                e.preventDefault();
                this.callbacks.filterWishlist?.();
                break;
            case '4':
                e.preventDefault();
                this.callbacks.filterSold?.();
                break;
        }
    },

    /**
     * Check if an input element is focused
     * @returns {boolean}
     */
    isInputFocused() {
        const active = document.activeElement;
        if (!active) return false;
        const tag = active.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || active.isContentEditable;
    },

    /**
     * Show keyboard shortcuts help modal
     */
    showHelpModal() {
        let modal = document.getElementById('shortcutsHelpModal');

        if (!modal) {
            // Create modal dynamically
            modal = document.createElement('div');
            modal.id = 'shortcutsHelpModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal modal-shortcuts">
                    <div class="modal-header">
                        <h2>${t('kbd.title')}</h2>
                        <button class="btn-close" id="shortcutsCloseBtn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="shortcuts-list">
                            ${this.shortcuts.map(s => `
                                <div class="shortcut-item">
                                    <kbd>${this.formatKey(s.key)}</kbd>
                                    <span>${t(s.description)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <p class="shortcuts-note">${t('kbd.helpNote')}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Close button event
            document.getElementById('shortcutsCloseBtn').addEventListener('click', () => {
                this.hideHelpModal();
            });

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideHelpModal();
                }
            });
        }

        modal.classList.add('active');
    },

    /**
     * Hide keyboard shortcuts help modal
     */
    hideHelpModal() {
        const modal = document.getElementById('shortcutsHelpModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Format key for display
     * @param {string} key - Key name
     * @returns {string}
     */
    formatKey(key) {
        const specialKeys = {
            'Esc': 'Esc',
            '/': '/',
            '?': '?'
        };
        return specialKeys[key] || key.toUpperCase();
    }
};

// Make globally available
window.KeyboardShortcuts = KeyboardShortcuts;

