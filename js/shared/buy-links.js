/**
 * Buy Links Module - Store Search Integration
 *
 * Generuje linki do sklepów online w zależności od kategorii kolekcji
 * - LEGO: BrickLink, Allegro, Amazon
 */

window.BuyLinks = {
    /**
     * Definicje sklepów per kategoria
     */
    STORES: {
        sets: [
            {
                name: 'BrickLink',
                icon: '🧱',
                baseUrl: 'https://www.bricklink.com/v2/search.page',
                buildUrl: (query) => `https://www.bricklink.com/v2/search.page?q=${encodeURIComponent(query)}`,
                color: '#E3000B'
            },
            {
                name: 'Allegro',
                icon: '🛒',
                baseUrl: 'https://allegro.pl/listing',
                buildUrl: (query) => `https://allegro.pl/listing?string=${encodeURIComponent(query)}`,
                color: '#FF5A00'
            },
            {
                name: 'Amazon',
                icon: '📦',
                baseUrl: 'https://www.amazon.com/s',
                buildUrl: (query) => `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
                color: '#FF9900'
            }
        ],
        minifigs: [
            {
                name: 'BrickLink',
                icon: '🧱',
                baseUrl: 'https://www.bricklink.com/v2/search.page',
                buildUrl: (query) => `https://www.bricklink.com/v2/search.page?q=${encodeURIComponent(query)}`,
                color: '#FFD500'
            },
            {
                name: 'Allegro',
                icon: '🛒',
                baseUrl: 'https://allegro.pl/listing',
                buildUrl: (query) => `https://allegro.pl/listing?string=${encodeURIComponent(query)}`,
                color: '#FF5A00'
            },
            {
                name: 'Amazon',
                icon: '📦',
                baseUrl: 'https://www.amazon.com/s',
                buildUrl: (query) => `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
                color: '#FF9900'
            }
        ]
    },

    /**
     * Pobierz sklepy dla danej kategorii
     * @param {string} collectionType - 'setsCollection' or 'minifigsCollection'
     * @returns {Array} - Lista sklepów
     */
    getStores(collectionType) {
        const type = collectionType.replace('Collection', '').toLowerCase();
        return this.STORES[type] || [];
    },

    /**
     * Generuj query wyszukiwania dla przedmiotu
     * @param {Object} item - Przedmiot z kolekcji
     * @param {string} collectionType - Typ kolekcji
     * @returns {string} - Sformatowany query
     */
    generateSearchQuery(item, collectionType) {
        if (!item) return '';

        const type = collectionType.replace('Collection', '').toLowerCase();

        switch (type) {
            case 'sets':
                // Sets: "LEGO 75192 Millennium Falcon"
                return `LEGO ${item.setNumber} ${item.name}`;

            case 'minifigs':
                // Minifigures: "LEGO sw0999 Luke Skywalker"
                return `LEGO ${item.figureNumber} ${item.name}`;

            default:
                return item.name || item.title || '';
        }
    },

    /**
     * Generuj HTML z linkami do sklepów
     * @param {Object|null} item - Przedmiot (null = ogólny modal)
     * @param {string} collectionType - Typ kolekcji
     * @returns {string} - HTML ze store buttons
     */
    generateStoreLinksHTML(item, collectionType) {
        const stores = this.getStores(collectionType);
        const query = item ? this.generateSearchQuery(item, collectionType) : '';

        // Header
        let html = '<div class="buy-modal-content">';

        if (item) {
            html += `<div class="buy-modal-header">
                <h3>${t('buy.find')} ${item.name || item.title}</h3>
                <p class="buy-search-query">${query}</p>
            </div>`;
        } else {
            html += `<div class="buy-modal-header">
                <h3>${t('buy.browseStores')}</h3>
                <p class="buy-search-query">${t('buy.browseDesc')}</p>
            </div>`;
        }

        // Store buttons
        html += '<div class="store-links-grid">';

        stores.forEach(store => {
            const url = item ? store.buildUrl(query) : store.baseUrl;
            html += `
                <a href="${url}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="store-link-btn"
                   style="--store-color: ${store.color}"
                   data-store="${store.name}">
                    <span class="store-icon">${store.icon}</span>
                    <span class="store-name">${store.name}</span>
                    <span class="store-arrow">→</span>
                </a>
            `;
        });

        html += '</div>';

        // Info footer
        html += `<div class="buy-modal-footer">
            <p>${t('buy.linksNewTab')}</p>
            <p>${t('buy.resultsVary')}</p>
        </div>`;

        html += '</div>';

        return html;
    },

    /**
     * Generuj prosty HTML z pojedynczym linkiem
     * Używane do szybkiego inline linku w kartach
     * @param {Object} item - Przedmiot
     * @param {string} collectionType - Typ kolekcji
     * @param {string} storeName - Nazwa sklepu (np. 'BrickLink')
     * @returns {string} - URL do sklepu
     */
    getStoreUrl(item, collectionType, storeName) {
        const stores = this.getStores(collectionType);
        const store = stores.find(s => s.name.toLowerCase() === storeName.toLowerCase());

        if (!store) return '#';

        const query = this.generateSearchQuery(item, collectionType);
        return store.buildUrl(query);
    },

    /**
     * Sprawdź czy kategoria ma zdefiniowane sklepy
     * @param {string} collectionType - Typ kolekcji
     * @returns {boolean}
     */
    hasStores(collectionType) {
        return this.getStores(collectionType).length > 0;
    }
};

