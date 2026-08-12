/**
 * Export/Import Module - Collection Portability & Social Sharing
 * Provides export to CSV/JSON, public links, and import capabilities
 *
 * @version 1.0.0
 * @author Claude Code
 */

const ExportImport = {
    /**
     * Export collection to CSV format
     * @param {Array} collection - Array of items to export
     * @param {string} collectionType - 'sets' or 'minifigs'
     * @returns {void} - Downloads CSV file
     */
    exportToCSV(collection, collectionType = 'sets') {
        try {

            if (!collection || collection.length === 0) {
                throw new Error('Collection is empty');
            }

            // Define CSV headers based on collection type
            const headers = collectionType === 'sets'
                ? ['Name', 'Set Number', 'Theme', 'Year', 'Status', 'Piece Count', 'Price Paid', 'Condition', 'Location', 'Notes', 'Date Added', 'Image URL']
                : ['Name', 'Figure Number', 'Theme', 'Year', 'Status', 'Price Paid', 'Condition', 'Location', 'Notes', 'Date Added', 'Image URL'];

            // Convert collection data to CSV rows
            const csvRows = [];

            // Add header row
            csvRows.push(headers.join(','));

            // Add data rows
            collection.forEach(item => {
                const row = collectionType === 'sets'
                    ? [
                        this.escapeCSV(item.name || ''),
                        this.escapeCSV(item.setNumber || ''),
                        this.escapeCSV(item.theme || ''),
                        item.year || '',
                        this.escapeCSV(item.status || ''),
                        item.pieceCount || '',
                        item.pricePaid || '',
                        this.escapeCSV(item.condition || ''),
                        this.escapeCSV(item.location || ''),
                        this.escapeCSV(item.notes || ''),
                        item.dateAdded || '',
                        this.escapeCSV(item.imageUrl || '')
                    ]
                    : [
                        this.escapeCSV(item.name || ''),
                        this.escapeCSV(item.figureNumber || ''),
                        this.escapeCSV(item.theme || ''),
                        item.year || '',
                        this.escapeCSV(item.status || ''),
                        item.pricePaid || '',
                        this.escapeCSV(item.condition || ''),
                        this.escapeCSV(item.location || ''),
                        this.escapeCSV(item.notes || ''),
                        item.dateAdded || '',
                        this.escapeCSV(item.imageUrl || '')
                    ];

                csvRows.push(row.join(','));
            });

            // Create CSV content
            const csvContent = csvRows.join('\n');

            // Create and trigger download
            this.downloadFile(
                csvContent,
                `lego-${collectionType}-export-${new Date().toISOString().split('T')[0]}.csv`,
                'text/csv'
            );

            return true;

        } catch (error) {
            throw error;
        }
    },

    /**
     * Export collection to JSON format
     * @param {Array} collection - Array of items to export
     * @param {string} collectionType - 'sets' or 'minifigs'
     * @param {Object} metadata - Optional metadata (export date, user info, etc.)
     * @returns {void} - Downloads JSON file
     */
    exportToJSON(collection, collectionType = 'sets', metadata = {}) {
        try {

            if (!collection || collection.length === 0) {
                throw new Error('Collection is empty');
            }

            // Create export object with metadata
            const exportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                collectionType: collectionType,
                itemCount: collection.length,
                metadata: {
                    ...metadata,
                    generatedBy: 'LEGO Collection Manager',
                    format: 'full-export'
                },
                data: collection
            };

            // Create JSON content with pretty formatting
            const jsonContent = JSON.stringify(exportData, null, 2);

            // Create and trigger download
            this.downloadFile(
                jsonContent,
                `lego-${collectionType}-backup-${new Date().toISOString().split('T')[0]}.json`,
                'application/json'
            );

            return true;

        } catch (error) {
            throw error;
        }
    },

    /**
     * Generate a public, shareable link for the collection
     * @param {string} userId - User's Firebase UID
     * @param {string} collectionType - 'sets' or 'minifigs'
     * @param {Object} options - Display options for public view
     * @returns {string} - Public URL
     */
    generatePublicLink(userId, collectionType = 'sets', options = {}) {
        try {

            // Default display options
            const defaultOptions = {
                showPrices: false,      // Hide prices by default
                showLocation: false,    // Hide location by default
                showNotes: false,       // Hide notes by default
                theme: 'light',          // Default theme
                gridView: true          // Default to grid view
            };

            const displayOptions = { ...defaultOptions, ...options };

            // Create a unique token for this share
            const shareToken = this.generateShareToken(userId, collectionType);

            // Construct public URL
            const baseUrl = window.location.origin;
            const publicUrl = `${baseUrl}/public.html?token=${shareToken}&type=${collectionType}`;

            // Store share configuration (in a real app, this would go to Firestore)
            this.storeShareConfig(shareToken, userId, collectionType, displayOptions);

            return publicUrl;

        } catch (error) {
            throw error;
        }
    },

    /**
     * Import collection from JSON file
     * @param {File} file - JSON file to import
     * @param {Function} callback - Callback function(importedData)
     * @returns {Promise} - Resolves with imported data
     */
    importFromJSON(file) {
        return new Promise((resolve, reject) => {
            try {

                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);

                        // Validate import data structure
                        if (!importedData.data || !Array.isArray(importedData.data)) {
                            throw new Error('Invalid JSON structure');
                        }

                        resolve(importedData);

                    } catch (error) {
                        reject(new Error('Invalid JSON file format'));
                    }
                };

                reader.onerror = () => {
                    reject(new Error('Error reading file'));
                };

                reader.readAsText(file);

            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Import from BrickLink API (basic structure)
     * @param {string} bricklinkUsername - User's BrickLink username
     * @param {string} collectionType - 'sets' or 'minifigs'
     * @returns {Promise} - Resolves with imported data
     */
    async importFromBrickLink(bricklinkUsername, collectionType = 'sets') {
        try {

            // BrickLink API requires OAuth authentication
            // This is a placeholder for future implementation
            // For now, we'll return a structured error message

            const apiEndpoint = collectionType === 'sets'
                ? `https://api.bricklink.com/store/users/${bricklinkUsername}/orders`
                : `https://api.bricklink.com/store/users/${bricklinkUsername}/inventories`;

            // TODO: Implement proper OAuth authentication

            throw new Error('BrickLink API integration requires OAuth setup. This feature is planned for future implementation.');

            // Future implementation would:
            // 1. Authenticate with BrickLink API using OAuth
            // 2. Fetch user's collection
            // 3. Transform BrickLink data to our format
            // 4. Return array of items

        } catch (error) {
            throw error;
        }
    },

    /**
     * Escape CSV values (handle quotes, commas, newlines)
     * @param {string} value - Value to escape
     * @returns {string} - Escaped value
     */
    escapeCSV(value) {
        if (value === null || value === undefined) {
            return '';
        }

        const stringValue = String(value);

        // If contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
    },

    /**
     * Generate a unique share token
     * @param {string} userId - User's ID
     * @param {string} collectionType - Collection type
     * @returns {string} - Unique token
     */
    generateShareToken(userId, collectionType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${userId.substring(0, 8)}-${collectionType}-${timestamp}-${random}`;
    },

    /**
     * Store share configuration (localStorage for now)
     * In production, this would go to Firestore
     * @param {string} token - Share token
     * @param {string} userId - User ID
     * @param {string} collectionType - Collection type
     * @param {Object} options - Display options
     */
    storeShareConfig(token, userId, collectionType, options) {
        try {
            const shareConfig = {
                token,
                userId,
                collectionType,
                options,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            };

            // Get existing shares
            const shares = JSON.parse(localStorage.getItem('publicShares') || '{}');
            shares[token] = shareConfig;
            localStorage.setItem('publicShares', JSON.stringify(shares));

        } catch (error) {
        }
    },

    /**
     * Trigger file download
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            throw error;
        }
    },

    /**
     * Get export summary for user confirmation
     * @param {Array} collection - Collection to export
     * @returns {Object} - Summary statistics
     */
    getExportSummary(collection) {
        if (!collection || collection.length === 0) {
            return {
                totalItems: 0,
                totalValue: 0,
                themes: [],
                hasImages: false,
                oldestItem: null,
                newestItem: null
            };
        }

        const themes = [...new Set(collection.map(item => item.theme).filter(Boolean))];
        const itemsWithImages = collection.filter(item => item.imageUrl).length;
        const dates = collection
            .map(item => item.dateAdded)
            .filter(Boolean)
            .sort();

        return {
            totalItems: collection.length,
            totalValue: collection.reduce((sum, item) => sum + (parseFloat(item.pricePaid) || 0), 0),
            themes: themes,
            hasImages: itemsWithImages > 0,
            itemsWithImages: itemsWithImages,
            oldestItem: dates[0] || null,
            newestItem: dates[dates.length - 1] || null
        };
    }
};

// Export module globally (for non-module loading)
window.ExportImport = ExportImport;
