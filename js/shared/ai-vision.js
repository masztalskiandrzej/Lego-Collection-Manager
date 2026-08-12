/**
 * AI Vision Module - LEGO Recognition from Images
 * Uses Tesseract.js for OCR + server-side Rebrickable lookup.
 *
 * The Rebrickable API key is NOT stored here. Item DATA lookups are proxied
 * through the `lookupLegoItem` Cloud Function (key held in Secret Manager).
 * Item IMAGES are still fetched from the browser via CORS proxies.
 *
 * @version 3.0.0 - server-side Rebrickable lookup (key removed from client)
 * @author Claude Code
 */

const AIVision = {
    // Configuration
    config: {
        tesseractCDN: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
        // CORS proxies used to fetch item IMAGES from the browser.
        // Item DATA lookups go through the server-side `lookupLegoItem`
        // Cloud Function, so the Rebrickable key is never exposed to the client.
        // Working list as of 2026-01.
        corsProxies: [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ],
        ocrLanguage: 'eng',
        minConfidence: 60
    },

    // State
    isInitialized: false,
    isTesseractLoading: false,

    /**
     * Initialize the AI Vision module
     * Preloads Tesseract.js for faster first recognition
     */
    async init() {
        if (this.isInitialized) {
            return true;
        }

        this.isInitialized = true;
        return true;
    },

    /**
     * Recognize LEGO set from image using OCR + BrickSet API
     * @param {string} imageDataUrl - Base64 encoded image
     * @param {string} itemType - 'set' or 'minifigure'
     * @returns {Promise<Object>} Recognized item data
     */
    async recognizeFromImage(imageDataUrl, itemType = 'set') {
        try {

            // Step 1: OCR with Tesseract.js (FREE)
            const ocrResult = await this.performOCR(imageDataUrl);

            // Step 2: Extract set/figure number from text
            const itemNumber = this.extractItemNumber(ocrResult.text, itemType);

            if (!itemNumber) {
                return {
                    success: false,
                    error: 'could_not_find_number',
                    message: `Could not find ${itemType} number in image. Please enter manually.`,
                    ocrText: ocrResult.text
                };
            }

            // Step 3: Query Rebrickable API (FREE)
            const itemData = await this.queryBrickSetAPI(itemNumber, itemType);

            return {
                success: true,
                data: itemData,
                ocrText: ocrResult.text,
                ocrConfidence: ocrResult.confidence
            };

        } catch (error) {
            return {
                success: false,
                error: 'recognition_failed',
                message: error.message || 'Recognition failed. Please try again or enter data manually.'
            };
        }
    },

    /**
     * Perform OCR using Tesseract.js
     * @param {string} imageDataUrl - Base64 image
     * @returns {Promise<Object>} { text, confidence }
     */
    async performOCR(imageDataUrl) {
        // Ensure Tesseract is loaded
        if (typeof Tesseract === 'undefined') {
            await this.loadTesseract();
        }

        // Create image element from data URL
        const img = await this.createImageElement(imageDataUrl);

        const startTime = Date.now();

        const result = await Tesseract.recognize(
            img,
            this.config.ocrLanguage,
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = (m.progress * 100).toFixed(0);
                        // Only log every 25% to avoid spam
                        if (progress % 25 === 0) {
                        }
                    }
                }
            }
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        return {
            text: result.data.text.trim(),
            confidence: result.data.confidence
        };
    },

    /**
     * Load Tesseract.js from CDN
     * @returns {Promise<void>}
     */
    loadTesseract() {
        return new Promise((resolve, reject) => {
            // Check if already loading
            if (this.isTesseractLoading) {
                const checkLoaded = setInterval(() => {
                    if (typeof Tesseract !== 'undefined') {
                        clearInterval(checkLoaded);
                        resolve();
                    }
                }, 100);
                return;
            }

            this.isTesseractLoading = true;

            const script = document.createElement('script');
            script.src = this.config.tesseractCDN;
            script.async = true;

            script.onload = () => {
                this.isTesseractLoading = false;
                resolve();
            };

            script.onerror = () => {
                this.isTesseractLoading = false;
                reject(new Error('Failed to load Tesseract.js from CDN'));
            };

            document.head.appendChild(script);
        });
    },

    /**
     * Create Image element from data URL
     * @param {string} dataUrl - Base64 image data
     * @returns {Promise<HTMLImageElement>}
     */
    createImageElement(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    },

    /**
     * Extract LEGO set/figure number from OCR text
     * @param {string} text - OCR text
     * @param {string} itemType - 'set' or 'minifigure'
     * @returns {string|null} Item number or null
     */
    extractItemNumber(text, itemType = 'set') {

        // Clean up the text
        const cleanText = text.replace(/\s+/g, ' ').trim();

        // Patterns to match LEGO set numbers
        // Sets: 75192, 75192-1, Set 75192, No. 75192, 75192: UCS Millennium Falcon
        // Figures: sw0999, fig-001, col001, etc.

        const patterns = [
            // Primary patterns - most reliable
            /(\d{4,5}-\d)/,              // 75192-1 (set with variant)
            /(?:set\s*)?(\d{4,5})(?:\s*:|\s|$)/i,  // Set 75192 or 75192: or 75192
            /no\.?\s*(\d{4,5})/i,        // No. 75192
            /number\s*:?\s*(\d{4,5})/i,  // Number: 75192
            /item\s*:?\s*(\d{4,5})/i,    // Item: 75192

            // Secondary patterns - less reliable
            /(\d{4,5})\s*(?:pieces|pcs)/i,  // 75192 pieces
            /#\s*(\d{4,5})/,             // #75192

            // Minifigure specific patterns
            /(sw|fig|col)\s*(\d{4,5})/i,  // sw0999, fig0001
            /(minifig)\s*\D*(\d{4,5})/i   // minifigure XXX123
        ];

        for (const pattern of patterns) {
            const match = cleanText.match(pattern);
            if (match) {
                const number = match[1] || match[2];
                return number;
            }
        }

        // Fallback: look for any 4-5 digit number that could be a set number
        // LEGO set numbers are typically 4-5 digits
        const fallbackPattern = /\b(\d{4,5})\b/;
        const matches = cleanText.match(fallbackPattern);

        if (matches && matches.length > 0) {
            return matches[1];
        }

        return null;
    },

    /**
     * Query Rebrickable API for item data
     * @param {string} itemNumber - Item number
     * @param {string} itemType - 'set' or 'minifigure'
     * @returns {Promise<Object>} Item data
     */
    async queryBrickSetAPI(itemNumber, itemType = 'set') {

        // Use Rebrickable API as primary source
        const data = await this.queryRebrickable(itemNumber, itemType);
        if (data && data.name) {
            return data;
        }

        // Fallback to image-only data
        return this.createPartialItemData(itemNumber, itemType);
    },

    /**
     * Look up an item via the server-side `lookupLegoItem` Cloud Function.
     *
     * The Rebrickable API key lives on the server (Secret Manager) and is never
     * sent to the browser. The Function returns already-mapped item data, or null.
     */
    async queryRebrickable(itemNumber, itemType) {
        try {
            const functionsInstance = window.getFirebaseFunctions();
            if (!functionsInstance) {
                return null;
            }

            const lookup = functionsInstance.httpsCallable('lookupLegoItem');
            const result = await lookup({ itemNumber, itemType });
            return result.data; // mapped item data, or null
        } catch (error) {
            return null;
        }
    },

    /**
     * Fetch image from URL and convert to base64
     * @param {string} imageUrl - URL of the image
     * @returns {Promise<string>} Base64 data URL
     */
    async fetchImageAsBase64(imageUrl) {
        if (!imageUrl) {
            return null;
        }

        // Try each CORS proxy until one works
        let lastError = null;
        for (let i = 0; i < this.config.corsProxies.length; i++) {
            const proxy = this.config.corsProxies[i];
            try {
                const proxiedURL = proxy + encodeURIComponent(imageUrl);

                const response = await fetch(proxiedURL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status}`);
                }

                const blob = await response.blob();
                const base64 = await this.blobToBase64(blob);

                return base64;

            } catch (error) {
                lastError = error;
                // Try next proxy
                continue;
            }
        }

        // All proxies failed
        return null;
    },

    /**
     * Convert blob to base64 data URL
     * @param {Blob} blob - Image blob
     * @returns {Promise<string>} Base64 data URL
     */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    /**
     * Create partial item data when API lookup fails
     * @param {string} itemNumber - Item number
     * @param {string} itemType - 'set' or 'minifigure'
     * @param {string} imageUrl - Optional image URL from CDN
     * @returns {Object} Partial item data
     */
    createPartialItemData(itemNumber, itemType, imageUrl = null) {
        // If no imageUrl provided, try to construct from BrickLink CDN
        if (!imageUrl && itemType === 'set') {
            const num = itemNumber.includes('-') ? itemNumber.split('-')[0] : itemNumber;
            imageUrl = `https://img.bricklink.com/ItemImage/SN/0/${itemNumber}.png`;
        } else if (!imageUrl && itemType === 'minifigure') {
            imageUrl = `https://img.bricklink.com/ItemImage/MN/0/${itemNumber}.png`;
        }

        const baseData = {
            name: '',
            theme: '',
            year: null,
            imageUrl: imageUrl // Use provided imageUrl or construct CDN URL
        };

        if (itemType === 'set') {
            return {
                ...baseData,
                setNumber: itemNumber,
                pieceCount: null,
                pricePaid: null
            };
        } else {
            return {
                ...baseData,
                figureNumber: itemNumber
            };
        }
    },

    /**
     * Quick recognition by item number only (no image)
     * @param {string} itemNumber - Set/figure number
     * @param {string} itemType - 'set' or 'minifigure'
     * @returns {Promise<Object>} Item data
     */
    async recognizeByNumber(itemNumber, itemType = 'set') {
        const itemData = await this.queryBrickSetAPI(itemNumber, itemType);
        return {
            success: true,
            data: itemData
        };
    }
};

// Auto-initialize when loaded
window.AIVision = AIVision;
