/**
 * Firestore Storage Adapter (Compat Version)
 *
 * Works with file:// protocol (no ES6 modules required)
 *
 * Zastępuje localStorage operacjami Firestore
 * Kompatybilny z istniejącym interfejsem Storage
 *
 * Struktura Firestore:
 * users/{userId}/{collectionType}/{itemId}
 *
 * collectionType: 'legoCollection' | 'setsCollection' | 'minifigsCollection'
 */

/**
 * Create Firestore Storage Adapter
 * @param {string} collectionType - Type of collection ('setsCollection', 'minifigsCollection')
 * @param {Function} getUserId - Function that returns current user ID
 */
function createFirestoreStorage(collectionType, getUserId) {
    return {
        collectionType,
        getUserId,
        _db: null,

        /**
         * Get Firestore database reference
         */
        _getDb() {
            if (!this._db) {
                this._db = window.getFirebaseDb();
            }
            return this._db;
        },

        /**
         * Get collection path for current user
         * @returns {string} - Firestore path
         */
        getCollectionPath() {
            const userId = this.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }
            return `users/${userId}/${this.collectionType}`;
        },

        /**
         * Get all items from Firestore
         * @returns {Promise<Array>} - Array of items
         */
        async getCollection() {
            try {

                const userId = this.getUserId();
                if (!userId) {
                    return [];
                }

                const db = this._getDb();
                if (!db) {
                    return [];
                }

                const collectionPath = this.getCollectionPath();

                const collectionRef = db.collection(collectionPath);
                const querySnapshot = await collectionRef.orderBy('dateAdded', 'desc').get();

                const items = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    // Convert Firestore Timestamps to strings
                    if (data.dateAdded && data.dateAdded.toDate) {
                        data.dateAdded = data.dateAdded.toDate().toISOString().split('T')[0];
                    }
                    if (data.lastModified && data.lastModified.toDate) {
                        data.lastModified = data.lastModified.toDate().toISOString().split('T')[0];
                    }

                    items.push({
                        ...data,
                        id: doc.id
                    });
                });

                if (items.length > 0) {
                }
                return items;
            } catch (error) {
                // Fallback to empty array
                return [];
            }
        },

        /**
         * Save collection to Firestore (not used - items saved individually)
         * @param {Array} items - Items to save
         */
        async saveCollection(items) {
            // Firestore saves items individually, not as batch
        },

        /**
         * Add new item to Firestore
         * @param {object} item - Item to add
         * @returns {Promise<string>} - ID of added item
         */
        async addItem(item) {
            try {
                const userId = this.getUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                const db = this._getDb();
                if (!db) {
                    throw new Error('Firestore not initialized');
                }

                // Generate unique ID
                const id = this.generateId();

                // Log what we're saving (especially imageUrl)

                // Check image size
                if (item.imageUrl) {
                    const imageSizeKB = item.imageUrl.length * 0.00065; // Approx base64 to KB

                    if (imageSizeKB > 900) {
                    }
                }

                // Add metadata
                const itemData = {
                    ...item,
                    dateAdded: item.dateAdded || new Date().toISOString().split('T')[0],
                    lastModified: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Save to Firestore
                const collectionPath = this.getCollectionPath();
                await db.collection(collectionPath).doc(id).set(itemData);

                return id;
            } catch (error) {

                // Check if error is related to document size
                if (error.code === 'resource-exhausted' || error.message.includes('size')) {
                    throw new Error('Zdjęcie jest zbyt duże! Proszę wybrać mniejsze zdjęcie (maks. 500KB zalecane).');
                }

                throw error;
            }
        },

        /**
         * Update existing item in Firestore
         * @param {string} id - Item ID
         * @param {object} updates - Fields to update
         * @returns {Promise<void>}
         */
        async updateItem(id, updates) {
            try {
                const userId = this.getUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                const db = this._getDb();
                if (!db) {
                    throw new Error('Firestore not initialized');
                }

                const collectionPath = this.getCollectionPath();

                // Log what we're updating (especially imageUrl)

                // Check image size
                if (updates.imageUrl) {
                    const imageSizeKB = updates.imageUrl.length * 0.00065;

                    if (imageSizeKB > 900) {
                    }
                }

                // Add lastModified timestamp
                const updateData = {
                    ...updates,
                    lastModified: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection(collectionPath).doc(id).update(updateData);

            } catch (error) {

                // Check if error is related to document size
                if (error.code === 'resource-exhausted' || error.message.includes('size')) {
                    throw new Error('Zdjęcie jest zbyt duże! Proszę wybrać mniejsze zdjęcie (maks. 500KB zalecane).');
                }

                throw error;
            }
        },

        /**
         * Delete item from Firestore
         * @param {string} id - Item ID
         * @returns {Promise<void>}
         */
        async deleteItem(id) {
            try {
                const userId = this.getUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                const db = this._getDb();
                if (!db) {
                    throw new Error('Firestore not initialized');
                }

                const collectionPath = this.getCollectionPath();
                await db.collection(collectionPath).doc(id).delete();

            } catch (error) {
                throw error;
            }
        },

        /**
         * Get single item from Firestore
         * @param {string} id - Item ID
         * @returns {Promise<object|null>} - Item or null
         */
        async getItem(id) {
            try {
                const userId = this.getUserId();
                if (!userId) {
                    return null;
                }

                const db = this._getDb();
                if (!db) {
                    return null;
                }

                const collectionPath = this.getCollectionPath();
                const docSnap = await db.collection(collectionPath).doc(id).get();

                if (docSnap.exists) {
                    const data = docSnap.data();

                    // Convert Timestamps
                    if (data.dateAdded && data.dateAdded.toDate) {
                        data.dateAdded = data.dateAdded.toDate().toISOString().split('T')[0];
                    }
                    if (data.lastModified && data.lastModified.toDate) {
                        data.lastModified = data.lastModified.toDate().toISOString().split('T')[0];
                    }

                    return {
                        ...data,
                        id: docSnap.id
                    };
                } else {
                    return null;
                }
            } catch (error) {
                return null;
            }
        },

        /**
         * Generate unique ID
         * @returns {string} - Unique ID
         */
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        /**
         * Check if collection is empty
         * @returns {Promise<boolean>}
         */
        async isEmpty() {
            const items = await this.getCollection();
            return items.length === 0;
        },

        /**
         * Clear entire collection (USE WITH CAUTION)
         * @returns {Promise<void>}
         */
        async clearCollection() {
            try {
                const userId = this.getUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                const items = await this.getCollection();

                // Delete all items
                const deletePromises = items.map(item => this.deleteItem(item.id));
                await Promise.all(deletePromises);

            } catch (error) {
                throw error;
            }
        },

        /**
         * Get unique themes from collection
         * @returns {Promise<Array<string>>}
         */
        async getThemes() {
            const items = await this.getCollection();
            const themes = [...new Set(items.map(item => item.theme).filter(Boolean))];
            return themes.sort();
        },

        /**
         * Get collection statistics
         * @returns {Promise<object>}
         */
        async getStats() {
            const items = await this.getCollection();

            const stats = {
                total: items.length,
                owned: items.filter(item => item.status === 'owned').length,
                wishlist: items.filter(item => item.status === 'wishlist').length,
                sold: items.filter(item => item.status === 'sold').length,
                totalValue: items.reduce((sum, item) => {
                    return sum + (parseFloat(item.pricePaid) || 0);
                }, 0)
            };

            // Collection-specific stats
            if (this.collectionType === 'legoCollection' || this.collectionType === 'setsCollection') {
                stats.sets = items.filter(item => item.type === 'set').length;
                stats.minifigs = items.filter(item => item.type === 'minifigure').length;
            } else if (this.collectionType === 'minifigsCollection') {
                stats.minifigs = items.length;
            }

            return stats;
        },

        /**
         * Load sample data (for demo purposes)
         * @param {Array} sampleData - Sample items
         * @returns {Promise<void>}
         */
        async loadSampleData(sampleData) {
            try {

                for (const item of sampleData) {
                    await this.addItem(item);
                }

            } catch (error) {
                throw error;
            }
        }
    };
}

// Make globally available
window.createFirestoreStorage = createFirestoreStorage;
