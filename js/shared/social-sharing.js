/**
 * Social Sharing Module - Collection Cards, QR Codes & Social Features
 * Generates shareable visuals and QR codes for collections
 *
 * @version 1.0.0
 * @author Claude Code
 */

const SocialSharing = {
    // External libraries (loaded on demand)
    qrCodeLibrary: null,
    html2CanvasLibrary: null,

    /**
     * Initialize social sharing module
     */
    init() {
        this.isInitialized = true;
    },

    /**
     * Generate a beautiful collection card image
     * @param {Object} collectionData - Collection statistics
     * @param {string} username - User's name
     * @param {string} collectionType - 'sets' or 'minifigs'
     * @returns {Promise<string>} - Data URL of generated image
     */
    async generateCollectionCard(collectionData, username = 'LEGO Collector', collectionType = 'sets') {
        try {

            // Create card HTML template
            const cardHTML = this.createCardHTML(collectionData, username, collectionType);

            // Create temporary container
            const container = document.createElement('div');
            container.innerHTML = cardHTML;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            document.body.appendChild(container);

            const cardElement = container.firstElementChild;

            // Load html2canvas library dynamically
            await this.loadHtml2Canvas();

            // Generate image
            const canvas = await this.html2CanvasLibrary(cardElement, {
                backgroundColor: collectionType === 'sets' ? '#FFE5E5' : '#E5F5FF',
                scale: 2, // High resolution
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            // Convert to data URL
            const imageDataUrl = canvas.toDataURL('image/png');

            // Cleanup
            document.body.removeChild(container);

            return imageDataUrl;

        } catch (error) {
            throw new Error(t('share.cardErr') + error.message);
        }
    },

    /**
     * Generate QR code for collection URL
     * @param {string} url - URL to encode
     * @param {Object} options - QR code options
     * @returns {Promise<string>} - Data URL of QR code image
     */
    async generateQRCode(url, options = {}) {
        try {

            const defaultOptions = {
                width: 300,
                height: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                margin: 2
            };

            const qrOptions = { ...defaultOptions, ...options };

            // Load QR Code library dynamically
            await this.loadQRCodeLibrary();

            // Generate QR code
            const qrCode = this.qrCodeLibrary.createElement(url, qrOptions);
            const qrCanvas = qrCode.querySelector('canvas');

            if (!qrCanvas) {
                throw new Error(t('share.qrCanvasErr'));
            }

            const qrDataUrl = qrCanvas.toDataURL('image/png');

            return qrDataUrl;

        } catch (error) {
            throw new Error(t('share.qrErr') + error.message);
        }
    },

    /**
     * Create HTML template for collection card
     * @param {Object} data - Collection data
     * @param {string} username - User name
     * @param {string} collectionType - Collection type
     * @returns {string} - HTML string
     */
    createCardHTML(data, username, collectionType) {
        const themeColors = collectionType === 'sets'
            ? { primary: '#E3000B', secondary: '#FFD500', background: '#FFE5E5' }
            : { primary: '#006DB7', secondary: '#FFD500', background: '#E5F5FF' };

        const icon = collectionType === 'sets' ? '🧱' : '👤';

        return `
            <div class="collection-card" style="
                width: 600px;
                height: 400px;
                background: linear-gradient(135deg, ${themeColors.background} 0%, ${themeColors.secondary}40 100%);
                border-radius: 20px;
                padding: 40px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            ">
                <!-- Decorative elements -->
                <div style="
                    position: absolute;
                    top: -50px;
                    right: -50px;
                    width: 200px;
                    height: 200px;
                    background: ${themeColors.primary}20;
                    border-radius: 50%;
                "></div>
                <div style="
                    position: absolute;
                    bottom: -30px;
                    left: -30px;
                    width: 150px;
                    height: 150px;
                    background: ${themeColors.secondary}40;
                    border-radius: 50%;
                "></div>

                <!-- Header -->
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 30px;
                    position: relative;
                    z-index: 1;
                ">
                    <div style="
                        font-size: 48px;
                        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                    ">${icon}</div>
                    <div>
                        <div style="
                            font-size: 14px;
                            color: #666;
                            font-weight: 500;
                        ">${t('share.myCollection')}</div>
                        <div style="
                            font-size: 28px;
                            font-weight: 700;
                            color: ${themeColors.primary};
                        ">${username}</div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                    position: relative;
                    z-index: 1;
                ">
                    <div style="
                        background: white;
                        padding: 20px;
                        border-radius: 15px;
                        text-align: center;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                    ">
                        <div style="
                            font-size: 36px;
                            font-weight: 700;
                            color: ${themeColors.primary};
                            margin-bottom: 5px;
                        ">${data.totalItems || 0}</div>
                        <div style="
                            font-size: 12px;
                            color: #666;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">${t('share.totalItems')}</div>
                    </div>

                    <div style="
                        background: white;
                        padding: 20px;
                        border-radius: 15px;
                        text-align: center;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                    ">
                        <div style="
                            font-size: 36px;
                            font-weight: 700;
                            color: ${themeColors.secondary};
                            margin-bottom: 5px;
                        ">${data.themes?.length || 0}</div>
                        <div style="
                            font-size: 12px;
                            color: #666;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">${t('share.themes')}</div>
                    </div>

                    <div style="
                        background: white;
                        padding: 20px;
                        border-radius: 15px;
                        text-align: center;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                    ">
                        <div style="
                            font-size: 36px;
                            font-weight: 700;
                            color: #4CAF50;
                            margin-bottom: 5px;
                        ">$${Math.round(data.totalValue || 0)}</div>
                        <div style="
                            font-size: 12px;
                            color: #666;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">${t('share.totalValue')}</div>
                    </div>
                </div>

                <!-- Featured Themes -->
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 15px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                    position: relative;
                    z-index: 1;
                ">
                    <div style="
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 10px;
                        font-weight: 600;
                    ">${t('share.topThemes')}</div>
                    <div style="
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    ">
                        ${(data.themes || []).slice(0, 5).map(theme => `
                            <span style="
                                background: ${themeColors.primary}15;
                                color: ${themeColors.primary};
                                padding: 8px 16px;
                                border-radius: 20px;
                                font-size: 12px;
                                font-weight: 600;
                            ">${theme}</span>
                        `).join('')}
                    </div>
                </div>

                <!-- Footer -->
                <div style="
                    position: absolute;
                    bottom: 20px;
                    right: 30px;
                    font-size: 10px;
                    color: #999;
                ">
                    ${t('share.generatedWith')}
                </div>
            </div>
        `;
    },

    /**
     * Load html2canvas library dynamically
     */
    async loadHtml2Canvas() {
        if (this.html2CanvasLibrary) {
            return; // Already loaded
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

            script.onload = () => {
                this.html2CanvasLibrary = window.html2canvas;
                resolve();
            };

            script.onerror = () => {
                reject(new Error(t('share.html2canvasErr')));
            };

            document.head.appendChild(script);
        });
    },

    /**
     * Load QR Code library dynamically
     */
    async loadQRCodeLibrary() {
        if (this.qrCodeLibrary) {
            return; // Already loaded
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';

            script.onload = () => {
                this.qrCodeLibrary = window.QRCode;
                resolve();
            };

            script.onerror = () => {
                reject(new Error(t('share.qrLibErr')));
            };

            document.head.appendChild(script);
        });
    },

    /**
     * Share collection on social media
     * @param {string} platform - Social platform (twitter, facebook, etc.)
     * @param {string} text - Share text
     * @param {string} url - URL to share
     * @param {string} imageUrl - Optional image URL
     */
    shareOnSocialMedia(platform, text, url, imageUrl = null) {
        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);
        const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : '';

        const shareUrls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`,
            reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
            whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        };

        const shareUrl = shareUrls[platform.toLowerCase()];

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        } else {
            throw new Error(t('share.unsupportedPlatform', { p: platform }));
        }
    },

    /**
     * Download generated image
     * @param {string} dataUrl - Image data URL
     * @param {string} filename - File name
     */
    downloadImage(dataUrl, filename = 'collection-card.png') {
        try {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);

        } catch (error) {
            throw error;
        }
    },

    /**
     * Generate share text for social media
     * @param {Object} data - Collection data
     * @param {string} collectionType - Collection type
     * @returns {string} - Share text
     */
    generateShareText(data, collectionType = 'sets') {
        const typeLabel = t(collectionType === 'sets' ? 'share.legoSets' : 'share.legoMinifigs');

        return t('share.textBody', {
            type: typeLabel,
            items: data.totalItems,
            value: '$' + Math.round(data.totalValue),
            themes: data.themes?.length || 0
        });
    }
};

// Export module globally (for non-module loading)
window.SocialSharing = SocialSharing;
