/**
 * Storage Module - Firestore ONLY for Sets Collection Manager
 *
 * ALL data is stored in Firebase Cloud Firestore
 * Each user has their own collection tied to their account
 * REQUIRES authentication - localStorage fallback removed
 */

const Storage = {
    firestoreStorage: null,
    _initialized: false,

    /**
     * Initialize Firestore storage
     * REQUIRES user to be authenticated
     */
    async initFirestore() {
        if (this._initialized) return;

        if (typeof window.Auth === 'undefined') {
            throw new Error('Auth module not available. Please ensure you are logged in.');
        }

        // Wait for initial auth state to be determined
        if (!window.Auth.initialAuthStateDetermined) {
            console.log('⏳ Waiting for auth state to be determined...');
            const isLoggedIn = await window.Auth.waitForAuthState();
            console.log('🔓 Auth state determined:', isLoggedIn ? 'Logged in' : 'Not logged in');
        }

        if (!window.Auth.isAuthenticated()) {
            throw new Error('Authentication required. Please log in to access your collection.');
        }

        if (typeof window.createFirestoreStorage === 'undefined') {
            throw new Error('Firestore module not available.');
        }

        this.firestoreStorage = window.createFirestoreStorage(
            'setsCollection',
            () => window.Auth.getUserId()
        );
        console.log('🔥 Firestore Storage initialized for Sets collection');
        this._initialized = true;
    },

    /**
     * Check if should use Firestore (always true now)
     */
    async _shouldUseFirestore() {
        await this.initFirestore();
        return this.firestoreStorage !== null;
    },

    /**
     * Generate a unique ID for items
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Get the entire collection
     * @returns {Promise<Array>} Array of collection items
     */
    async getCollection() {
        console.log('📦 Sets Storage: getCollection() called');
        if (!await this._shouldUseFirestore()) {
            throw new Error('Authentication required. Please log in to access your collection.');
        }
        console.log('✅ Using Firestore storage');
        const result = await this.firestoreStorage.getCollection();
        console.log('📦 Got', result.length, 'items from Firestore');
        if (result.length > 0) {
            console.log('🔍 First item keys:', Object.keys(result[0]));
            console.log('🔍 First item has imageUrl?', !!result[0].imageUrl);
        }
        return result;
    },

    /**
     * Save the entire collection (not used with Firestore)
     */
    saveCollection(collection) {
        // Firestore saves individually, not as batch
        console.warn('⚠️ saveCollection not used with Firestore - items are saved individually');
        return Promise.resolve(true);
    },

    /**
     * Add a new item to the collection
     * @param {Object} item - Item to add
     * @returns {Promise<Object>} The added item with generated ID
     */
    async addItem(item) {
        if (!await this._shouldUseFirestore()) {
            throw new Error('Authentication required. Please log in to add items.');
        }
        const id = await this.firestoreStorage.addItem({
            ...item,
            type: 'set'
        });
        return { ...item, id, type: 'set' };
    },

    /**
     * Update an existing item in the collection
     * @param {string} id - Item ID to update
     * @param {Object} updates - Object with updated properties
     * @returns {Promise<Object>} The updated item
     */
    async updateItem(id, updates) {
        if (!await this._shouldUseFirestore()) {
            throw new Error('Authentication required. Please log in to update items.');
        }
        await this.firestoreStorage.updateItem(id, updates);
        return { ...updates, id };
    },

    /**
     * Delete an item from the collection
     * @param {string} id - Item ID to delete
     * @returns {Promise<boolean>} True if deleted
     */
    async deleteItem(id) {
        if (!await this._shouldUseFirestore()) {
            throw new Error('Authentication required. Please log in to delete items.');
        }
        await this.firestoreStorage.deleteItem(id);
        return true;
    },

    /**
     * Get a single item by ID
     * @param {string} id - Item ID
     * @returns {Promise<Object>} The item
     */
    async getItem(id) {
        if (!await this._shouldUseFirestore()) {
            throw new Error('Authentication required. Please log in to access your collection.');
        }
        return await this.firestoreStorage.getItem(id);
    },

    /**
     * Check if collection is empty
     * @returns {Promise<boolean>}
     */
    async isEmpty() {
        if (!await this._shouldUseFirestore()) {
            return true;
        }
        return await this.firestoreStorage.isEmpty();
    },

    /**
     * Clear all collection data
     */
    async clearCollection() {
        if (!await this._shouldUseFirestore()) {
            throw new Error('Authentication required. Please log in to access your collection.');
        }
        await this.firestoreStorage.clearCollection();
    },

    /**
     * Load sample data into collection (disabled - no sample data)
     * @returns {Promise<boolean>}
     */
    async loadSampleData(sampleData) {
        if (!await this._shouldUseFirestore()) {
            console.warn('Cannot load sample data - authentication required');
            return false;
        }
        // Sample data is now empty - this function exists for compatibility
        if (sampleData && sampleData.length > 0) {
            const setsData = sampleData.map(item => ({ ...item, type: 'set' }));
            await this.firestoreStorage.loadSampleData(setsData);
        }
        return true;
    },

    /**
     * Get all unique themes from collection
     * @returns {Promise<Array>} Array of unique theme names
     */
    async getThemes() {
        if (!await this._shouldUseFirestore()) {
            return [];
        }
        return await this.firestoreStorage.getThemes();
    },

    /**
     * Get collection statistics
     * @returns {Promise<Object>} Stats object with counts and total value
     */
    async getStats() {
        if (!await this._shouldUseFirestore()) {
            return {
                total: 0,
                totalPieces: 0,
                owned: 0,
                wishlist: 0,
                sold: 0,
                totalValue: 0
            };
        }
        return await this.firestoreStorage.getStats();
    }
};
