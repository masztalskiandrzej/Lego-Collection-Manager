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
                console.log(`🔍 Firestore getCollection() called for ${this.collectionType}`);

                const userId = this.getUserId();
                if (!userId) {
                    console.warn('⚠️ No user authenticated, returning empty collection');
                    return [];
                }

                console.log('✅ User authenticated:', userId);

                const db = this._getDb();
                if (!db) {
                    console.error('❌ Firestore not initialized');
                    return [];
                }

                console.log('✅ Firestore DB initialized');

                const collectionPath = this.getCollectionPath();
                console.log('📂 Collection path:', collectionPath);

                const collectionRef = db.collection(collectionPath);
                const querySnapshot = await collectionRef.orderBy('dateAdded', 'desc').get();

                console.log('📜 Query snapshot received, docs:', querySnapshot.docs.length);

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
                        id: doc.id,
                        ...data
                    });
                });

                console.log(`📦 Loaded ${items.length} items from Firestore (${this.collectionType})`);
                if (items.length > 0) {
                    console.log('🔍 First item:', {
                        id: items[0].id,
                        name: items[0].name,
                        hasImageUrl: !!items[0].imageUrl,
                        imageUrlPreview: items[0].imageUrl ? items[0].imageUrl.substring(0, 100) + '...' : 'none'
                    });
                }
                return items;
            } catch (error) {
                console.error('❌ Error loading from Firestore:', error);
                console.error('Error details:', error.code, error.message);
                // Fallback to empty array
                return [];
            }
        },

        /**
         * Save collection to Firestore (not used - items saved individually)
         * @param {Array} items - Items to save
         */
        async saveCollection(items) {
            console.warn('⚠️ saveCollection not implemented for Firestore (use addItem/updateItem)');
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
                console.log('📝 Saving item to Firestore:', {
                    id,
                    name: item.name,
                    hasImageUrl: !!item.imageUrl,
                    imageUrlLength: item.imageUrl ? item.imageUrl.length : 0,
                    imageUrlPreview: item.imageUrl ? item.imageUrl.substring(0, 100) + '...' : 'none'
                });

                // Check image size
                if (item.imageUrl) {
                    const imageSizeKB = item.imageUrl.length * 0.00065; // Approx base64 to KB
                    console.log(`🖼️ Image size: ${imageSizeKB.toFixed(2)} KB (Firestore limit: ~1024 KB per document)`);

                    if (imageSizeKB > 900) {
                        console.warn('⚠️ Image is very large and may exceed Firestore document size limit!');
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

                console.log('✅ Item added to Firestore:', id);
                return id;
            } catch (error) {
                console.error('❌ Error adding item to Firestore:', error);

                // Check if error is related to document size
                if (error.code === 'resource-exhausted' || error.message.includes('size')) {
                    console.error('❌ Document too large! Image is probably too big for Firestore.');
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
                console.log('📝 Updating item in Firestore:', {
                    id,
                    name: updates.name,
                    hasImageUrl: !!updates.imageUrl,
                    imageUrlLength: updates.imageUrl ? updates.imageUrl.length : 0,
                    imageUrlPreview: updates.imageUrl ? updates.imageUrl.substring(0, 100) + '...' : 'none'
                });

                // Check image size
                if (updates.imageUrl) {
                    const imageSizeKB = updates.imageUrl.length * 0.00065;
                    console.log(`🖼️ Image size: ${imageSizeKB.toFixed(2)} KB (Firestore limit: ~1024 KB per document)`);

                    if (imageSizeKB > 900) {
                        console.warn('⚠️ Image is very large and may exceed Firestore document size limit!');
                    }
                }

                // Add lastModified timestamp
                const updateData = {
                    ...updates,
                    lastModified: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection(collectionPath).doc(id).update(updateData);

                console.log('✅ Item updated in Firestore:', id);
            } catch (error) {
                console.error('❌ Error updating item in Firestore:', error);

                // Check if error is related to document size
                if (error.code === 'resource-exhausted' || error.message.includes('size')) {
                    console.error('❌ Document too large! Image is probably too big for Firestore.');
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

                console.log('✅ Item deleted from Firestore:', id);
            } catch (error) {
                console.error('❌ Error deleting item from Firestore:', error);
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
                        id: docSnap.id,
                        ...data
                    };
                } else {
                    return null;
                }
            } catch (error) {
                console.error('❌ Error getting item from Firestore:', error);
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

                console.log('🗑️ Collection cleared from Firestore');
            } catch (error) {
                console.error('❌ Error clearing collection:', error);
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
         * Get unique genres from collection (for books)
         * @returns {Promise<Array<string>>}
         */
        async getGenres() {
            const items = await this.getCollection();
            const genres = [...new Set(items.map(item => item.genre).filter(Boolean))];
            return genres.sort();
        },

        /**
         * Get unique platforms from collection (for games)
         * @returns {Promise<Array<string>>}
         */
        async getPlatforms() {
            const items = await this.getCollection();
            const platforms = [...new Set(items.map(item => item.platform).filter(Boolean))];
            return platforms.sort();
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
            } else if (this.collectionType === 'booksCollection') {
                stats.totalPages = items.reduce((sum, item) => {
                    return sum + (parseInt(item.pages) || 0);
                }, 0);
            } else if (this.collectionType === 'gamesCollection') {
                stats.totalPlayTime = items.reduce((sum, item) => {
                    return sum + (parseInt(item.playTime) || 0);
                }, 0);
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
                console.log(`📦 Loading ${sampleData.length} sample items to Firestore...`);

                for (const item of sampleData) {
                    await this.addItem(item);
                }

                console.log('✅ Sample data loaded to Firestore');
            } catch (error) {
                console.error('❌ Error loading sample data:', error);
                throw error;
            }
        }
    };
}

// Make globally available
window.createFirestoreStorage = createFirestoreStorage;
console.log('📦 Firestore Storage module loaded (compat version)');
