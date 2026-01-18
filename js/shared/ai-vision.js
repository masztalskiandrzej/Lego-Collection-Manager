/**
 * AI Vision Module - LEGO Recognition from Images
 * Uses Tesseract.js for OCR + Rebrickable API for data
 *
 * 100% FREE - No server costs!
 * Works client-side in the browser
 *
 * @version 2.2.0 - Rebrickable API (CORS-friendly)
 * @author Claude Code
 */

const AIVision = {
    // Configuration
    config: {
        tesseractCDN: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
        // Rebrickable API - FREE tier, has good CORS support
        rebrickableAPIKey: 'b19eRoKN38',
        rebrickableBaseURL: 'https://rebrickable.com/api/v3/lego',
        // CORS Proxies - working list as of 2026-01
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
            console.log('✅ AIVision already initialized');
            return true;
        }

        console.log('🔧 Initializing AIVision module...');
        this.isInitialized = true;
        console.log('✅ AIVision initialized (Tesseract.js will load on first use)');
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
            console.log('🔍 Starting AI recognition...');
            console.log('📷 Image size:', imageDataUrl.length, 'characters');

            // Step 1: OCR with Tesseract.js (FREE)
            console.log('📝 Step 1: Running OCR...');
            const ocrResult = await this.performOCR(imageDataUrl);
            console.log('✅ OCR Result:', {
                text: ocrResult.text.substring(0, 100) + '...',
                confidence: ocrResult.confidence + '%'
            });

            // Step 2: Extract set/figure number from text
            console.log('🎯 Step 2: Extracting item number...');
            const itemNumber = this.extractItemNumber(ocrResult.text, itemType);

            if (!itemNumber) {
                console.warn('⚠️ Could not find item number in OCR text');
                console.log('📄 Full OCR text:', ocrResult.text);
                return {
                    success: false,
                    error: 'could_not_find_number',
                    message: `Could not find ${itemType} number in image. Please enter manually.`,
                    ocrText: ocrResult.text
                };
            }

            console.log('✅ Extracted item number:', itemNumber);

            // Step 3: Query Rebrickable API (FREE)
            console.log('📦 Step 3: Querying Rebrickable API...');
            const itemData = await this.queryBrickSetAPI(itemNumber, itemType);
            console.log('✅ Rebrickable data received');

            return {
                success: true,
                data: itemData,
                ocrText: ocrResult.text,
                ocrConfidence: ocrResult.confidence
            };

        } catch (error) {
            console.error('❌ AI recognition failed:', error);
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
            console.log('📥 Loading Tesseract.js from CDN...');
            await this.loadTesseract();
            console.log('✅ Tesseract.js loaded');
        }

        // Create image element from data URL
        const img = await this.createImageElement(imageDataUrl);

        console.log('🔠 Starting Tesseract recognition...');
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
                            console.log(`🔠 OCR Progress: ${progress}%`);
                        }
                    }
                }
            }
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⏱️ OCR completed in ${elapsed}s`);

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
                console.log('✅ Tesseract.js script loaded');
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
        console.log('🔍 Extracting number from text...');

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
                console.log('✅ Pattern matched:', pattern, '=>', number);
                return number;
            }
        }

        // Fallback: look for any 4-5 digit number that could be a set number
        // LEGO set numbers are typically 4-5 digits
        const fallbackPattern = /\b(\d{4,5})\b/;
        const matches = cleanText.match(fallbackPattern);

        if (matches && matches.length > 0) {
            console.log('⚠️ Using fallback pattern, found:', matches[1]);
            return matches[1];
        }

        console.warn('❌ No set number pattern matched');
        return null;
    },

    /**
     * Query Rebrickable API for item data
     * @param {string} itemNumber - Item number
     * @param {string} itemType - 'set' or 'minifigure'
     * @returns {Promise<Object>} Item data
     */
    async queryBrickSetAPI(itemNumber, itemType = 'set') {
        console.log('🔍 Searching for item:', itemNumber, itemType);

        // Use Rebrickable API as primary source
        const data = await this.queryRebrickable(itemNumber, itemType);
        if (data && data.name) {
            return data;
        }

        // Fallback to image-only data
        console.log('⚠️ Rebrickable failed, trying CDN image only...');
        return this.createPartialItemData(itemNumber, itemType);
    },

    /**
     * Query Rebrickable API (comprehensive LEGO database)
     * Rebrickable has better CORS support than BrickLink
     */
    async queryRebrickable(itemNumber, itemType) {
        // Rebrickable API format:
        // Sets: /sets/{set_num}/
        // Minifigs: /minifigs/{fig_num}/
        const endpoint = itemType === 'set' ? 'sets' : 'minifigs';

        // Build URL with API key
        const directURL = `${this.config.rebrickableBaseURL}/${endpoint}/${itemNumber}/?key=${this.config.rebrickableAPIKey}`;
        console.log('🌐 Rebrickable URL:', directURL.replace(this.config.rebrickableAPIKey, '***'));

        // Try direct request first (Rebrickable may have CORS enabled)
        try {
            console.log('🔗 Attempt 1: Direct request...');
            const response = await fetch(directURL);
            if (response.ok) {
                const json = await response.json();
                console.log('✅ Direct response:', json);
                return this.mapRebrickableData(json, itemType);
            } else if (response.status === 404) {
                console.log('⚠️ Item not found (404), trying with variant suffix...');
                // Try adding -1 suffix for sets
                if (itemType === 'set' && !itemNumber.includes('-')) {
                    return await this.queryRebrickable(itemNumber + '-1', itemType);
                }
            }
        } catch (e) {
            console.log('⚠️ Direct request failed (CORS), trying proxy...');
        }

        // Try CORS proxies
        for (let i = 0; i < this.config.corsProxies.length; i++) {
            const proxy = this.config.corsProxies[i];
            try {
                console.log(`🔗 Attempt ${i + 2}: Using proxy ${proxy.split('/')[2]}...`);
                const proxiedURL = proxy + encodeURIComponent(directURL);
                const response = await fetch(proxiedURL);

                if (response.ok) {
                    const json = await response.json();
                    console.log(`✅ Proxy ${i + 2} response:`, json);
                    return this.mapRebrickableData(json, itemType);
                } else if (response.status === 404) {
                    console.log('⚠️ Item not found via proxy, trying with variant suffix...');
                    // Try adding -1 suffix for sets
                    if (itemType === 'set' && !itemNumber.includes('-')) {
                        const result = await this.queryRebrickable(itemNumber + '-1', itemType);
                        if (result && result.name) return result;
                    }
                }
            } catch (e) {
                console.warn(`❌ Proxy ${i + 1} error:`, e.message);
            }
        }

        console.error('❌ All attempts failed');
        return null;
    },

    /**
     * Map Rebrickable API response to our schema
     */
    mapRebrickableData(data, itemType) {
        if (!data) return null;

        if (itemType === 'set') {
            // Rebrickable set response:
            // { set_num, name, year, theme_id, num_parts, set_img_url, set_url }
            const setNum = data.set_num || '';
            const setNumber = setNum.split('-')[0]; // Remove variant like "-1"

            return {
                name: data.name || '',
                theme: data.theme_id?.toString() || '', // Use theme_id as placeholder
                year: data.year ? parseInt(data.year) : null,
                imageUrl: data.set_img_url || null,
                setNumber: setNumber,
                pieceCount: data.num_parts ? parseInt(data.num_parts) : null,
                pricePaid: null // Rebrickable doesn't provide pricing in free tier
            };
        } else {
            // Rebrickable minifigure response:
            // { fig_num, name, year, theme_id, num_parts, fig_img_url, fig_url }
            return {
                name: data.name || 'Unknown Minifigure',
                theme: data.theme_id?.toString() || '',
                year: data.year ? parseInt(data.year) : null,
                imageUrl: data.fig_img_url || null,
                figureNumber: data.fig_num || ''
            };
        }
    },

    /**
     * Fetch image from URL and convert to base64
     * @param {string} imageUrl - URL of the image
     * @returns {Promise<string>} Base64 data URL
     */
    async fetchImageAsBase64(imageUrl) {
        if (!imageUrl) {
            console.warn('⚠️ No image URL provided');
            return null;
        }

        console.log('🖼️ Fetching image from API:', imageUrl);

        // Try each CORS proxy until one works
        let lastError = null;
        for (let i = 0; i < this.config.corsProxies.length; i++) {
            const proxy = this.config.corsProxies[i];
            try {
                const proxiedURL = proxy + encodeURIComponent(imageUrl);
                console.log(`🔗 Using CORS proxy ${i + 1}/${this.config.corsProxies.length} for image:`, proxiedURL.substring(0, 80) + '...');

                const response = await fetch(proxiedURL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status}`);
                }

                const blob = await response.blob();
                const base64 = await this.blobToBase64(blob);

                console.log('✅ Image fetched and converted to base64');
                return base64;

            } catch (error) {
                console.warn(`❌ Proxy ${i + 1} failed for image:`, error.message);
                lastError = error;
                // Try next proxy
                continue;
            }
        }

        // All proxies failed
        console.error('❌ All CORS proxies failed for image, last error:', lastError);
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
        console.log('🔍 Quick recognition by number:', itemNumber);
        const itemData = await this.queryBrickSetAPI(itemNumber, itemType);
        return {
            success: true,
            data: itemData
        };
    }
};

// Auto-initialize when loaded
console.log('🧠 AIVision module loaded (Tesseract.js OCR + Rebrickable API v2.2)');
console.log('🔍 Setting window.AIVision...');
window.AIVision = AIVision;
console.log('✅ window.AIVision is now set:', typeof window.AIVision, window.AIVision);
