/**
 * Export/Import Module
 * Handles exporting collection to JSON/CSV and importing from JSON
 */
const ExportImport = {
    /**
     * Export collection to JSON file
     * @param {string} collectionType - 'setsCollection' or 'minifigsCollection'
     * @param {Function} getCollection - Function to get collection data
     * @returns {Promise<Object>} Result with count
     */
    async exportJSON(collectionType, getCollection) {
        try {
            console.log('📤 Exporting to JSON...');
            const collection = await getCollection();

            if (!collection || collection.length === 0) {
                throw new Error('No items to export');
            }

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                collectionType: collectionType,
                itemCount: collection.length,
                items: collection
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const filename = `lego-${collectionType.replace('Collection', '')}-${this.formatDate()}.json`;
            this.downloadFile(blob, filename);

            console.log('✅ Exported', collection.length, 'items to JSON');
            return { success: true, count: collection.length };
        } catch (error) {
            console.error('❌ Export JSON error:', error);
            throw error;
        }
    },

    /**
     * Export collection to CSV file
     * @param {string} collectionType - 'setsCollection' or 'minifigsCollection'
     * @param {Function} getCollection - Function to get collection data
     * @returns {Promise<Object>} Result with count
     */
    async exportCSV(collectionType, getCollection) {
        try {
            console.log('📤 Exporting to CSV...');
            const collection = await getCollection();

            if (!collection || collection.length === 0) {
                throw new Error('No items to export');
            }

            // Define CSV columns based on collection type
            const columns = this.getCSVColumns(collectionType);
            const headers = columns.map(c => c.label).join(',');

            const rows = collection.map(item => {
                return columns.map(col => {
                    let value = item[col.key];
                    if (value === null || value === undefined) {
                        value = '';
                    }
                    // Convert to string and escape quotes
                    value = String(value).replace(/"/g, '""');
                    // Wrap in quotes if contains comma, newline, or quotes
                    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                        value = `"${value}"`;
                    }
                    return value;
                }).join(',');
            });

            const csv = [headers, ...rows].join('\n');
            const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
            const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
            const filename = `lego-${collectionType.replace('Collection', '')}-${this.formatDate()}.csv`;
            this.downloadFile(blob, filename);

            console.log('✅ Exported', collection.length, 'items to CSV');
            return { success: true, count: collection.length };
        } catch (error) {
            console.error('❌ Export CSV error:', error);
            throw error;
        }
    },

    /**
     * Import collection from JSON file
     * @param {File} file - JSON file to import
     * @param {string} collectionType - 'setsCollection' or 'minifigsCollection'
     * @param {Object} Storage - Storage module reference
     * @param {Object} options - Import options
     * @returns {Promise<Object>} Import results
     */
    async importJSON(file, collectionType, Storage, options = {}) {
        const { skipDuplicates = true, onProgress = null } = options;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    console.log('📥 Importing from JSON...');
                    const data = JSON.parse(e.target.result);

                    // Validate JSON structure
                    if (!data.items || !Array.isArray(data.items)) {
                        throw new Error('Invalid JSON format: missing items array');
                    }

                    const results = {
                        total: data.items.length,
                        imported: 0,
                        skipped: 0,
                        errors: 0,
                        duplicates: []
                    };

                    // Get existing items for duplicate checking
                    const existing = await Storage.getCollection();
                    const existingNumbers = new Set();
                    existing.forEach(item => {
                        const num = item.setNumber || item.figureNumber;
                        if (num) existingNumbers.add(num.toLowerCase());
                    });

                    // Process items
                    for (let i = 0; i < data.items.length; i++) {
                        const item = data.items[i];

                        // Check for duplicates
                        const itemNumber = item.setNumber || item.figureNumber;
                        if (itemNumber && existingNumbers.has(itemNumber.toLowerCase())) {
                            if (skipDuplicates) {
                                results.skipped++;
                                results.duplicates.push(itemNumber);
                                // Report progress
                                if (onProgress) {
                                    onProgress(Math.round(((i + 1) / data.items.length) * 100));
                                }
                                continue;
                            }
                        }

                        try {
                            // Clean item data (remove id, it will be auto-generated)
                            const cleanItem = { ...item };
                            delete cleanItem.id;
                            // Keep dateAdded if exists, otherwise it will be set by Storage

                            await Storage.addItem(cleanItem);
                            results.imported++;
                            if (itemNumber) existingNumbers.add(itemNumber.toLowerCase());
                        } catch (err) {
                            results.errors++;
                            console.error('Error importing item:', item.name || item.setNumber, err);
                        }

                        // Report progress
                        if (onProgress) {
                            onProgress(Math.round(((i + 1) / data.items.length) * 100));
                        }
                    }

                    console.log('✅ Import complete:', results);
                    resolve(results);
                } catch (error) {
                    console.error('❌ Import error:', error);
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    },

    /**
     * Get CSV columns configuration
     * @param {string} collectionType - Collection type
     * @returns {Array} Column definitions
     */
    getCSVColumns(collectionType) {
        if (collectionType === 'setsCollection') {
            return [
                { key: 'name', label: 'Name' },
                { key: 'setNumber', label: 'Set Number' },
                { key: 'theme', label: 'Theme' },
                { key: 'year', label: 'Year' },
                { key: 'status', label: 'Status' },
                { key: 'pieceCount', label: 'Piece Count' },
                { key: 'pricePaid', label: 'Price Paid' },
                { key: 'condition', label: 'Condition' },
                { key: 'location', label: 'Location' },
                { key: 'notes', label: 'Notes' },
                { key: 'dateAdded', label: 'Date Added' }
            ];
        } else {
            return [
                { key: 'name', label: 'Name' },
                { key: 'figureNumber', label: 'Figure Number' },
                { key: 'theme', label: 'Theme' },
                { key: 'year', label: 'Year' },
                { key: 'status', label: 'Status' },
                { key: 'pricePaid', label: 'Price Paid' },
                { key: 'condition', label: 'Condition' },
                { key: 'location', label: 'Location' },
                { key: 'notes', label: 'Notes' },
                { key: 'dateAdded', label: 'Date Added' }
            ];
        }
    },

    /**
     * Trigger file download
     * @param {Blob} blob - File blob
     * @param {string} filename - Download filename
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Format date for filename
     * @returns {string} Formatted date (YYYY-MM-DD)
     */
    formatDate() {
        return new Date().toISOString().slice(0, 10);
    }
};

// Make globally available
window.ExportImport = ExportImport;

console.log('📦 Export/Import module loaded');
