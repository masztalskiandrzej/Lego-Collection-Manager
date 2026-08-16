/**
 * LOKALNY SERWER FUNKCJI (dev-only, zero zależności, bez Javy)
 *
 * Zamiast pełnego emulatora Firebase (wymaga JDK) udaje protokół callable
 * pod http://localhost:5001 dla JEDNEJ funkcji: lookupLegoItem.
 * Aplikacja na localhost kieruje się tam automatycznie (firebase-config.js).
 *
 * Uruchomienie:  node tools/local-functions-server.js
 * (z katalogu głównego repo; czyta klucz z functions/.env)
 *
 * Uwaga: to nie pełny emulator — brak weryfikacji tokena. Tylko do użytku
 * lokalnego. Chmura pozostaje nienaruszona.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5001;
const PROJECT = 'collectionmanager-database';
const REGION = 'europe-west1';

// Wczytaj klucz z functions/.env
(function () {
    const envPath = path.join(__dirname, '..', 'functions', '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ Brak functions/.env — dodaj REBRICKABLE_API_KEY=...');
        process.exit(1);
    }
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m) process.env[m[1]] = m[2];
    }
})();

const API_KEY = process.env.REBRICKABLE_API_KEY;
const BASE = 'https://rebrickable.com/api/v3/lego';

function decodeUid(req) {
    // Emulatorowo: wyciągnij uid z JWT w Authorization (bez weryfikacji — dev).
    const auth = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
        return payload.user_id || payload.sub || null;
    } catch (e) {
        return null;
    }
}

async function lookupLegoItem(data) {
    const { itemNumber, itemType = 'set', listMinifigs = false, themes = false } = data || {};

    if (!itemNumber && !themes) throw Object.assign(new Error('itemNumber is required'), { code: 'invalid-argument' });
    if (!API_KEY) throw Object.assign(new Error('Lookup service is not configured.'), { code: 'internal' });

    const endpoint = itemType === 'minifigure' ? 'minifigs' : 'sets';

    const fetchItem = async (num) => {
        const res = await fetch(`${BASE}/${endpoint}/${num}/?key=${API_KEY}`);
        if (!res.ok) return null;
        return res.json();
    };

    const fetchSetMinifigs = async (setNum) => {
        const results = [];
        let url = `${BASE}/sets/${setNum}/minifigs/?key=${API_KEY}&page_size=100`;
        while (url) {
            const res = await fetch(url);
            if (!res.ok) return null;
            const json = await res.json();
            results.push(...(json.results || []));
            url = json.next ? json.next.replace('https://rebrickable.com/api/v3/lego', BASE) : null;
        }
        return results.map(r => {
            const raw = r.set_num || r.fig_num || '';
            // Strip variant suffix ("-1", "-2"); keep "fig-002544" intact.
            return {
                figureNumber: raw.replace(/-\d{1,2}$/, ''),
                name: r.set_name || r.name || '',
                quantity: r.quantity || 1,
                imageUrl: r.set_img_url || r.fig_img_url || null
            };
        });
    };

    // Pełna mapa motywów (id -> nazwa)
    if (themes) {
        const map = {};
        let url = `${BASE}/themes/?key=${API_KEY}&page_size=1000`;
        while (url) {
            const res = await fetch(url);
            if (!res.ok) break;
            const json = await res.json();
            for (const th of (json.results || [])) {
                if (th.id != null) map[th.id.toString()] = th.name || '';
            }
            url = json.next ? json.next.replace('https://rebrickable.com/api/v3/lego', BASE) : null;
        }
        if (Object.keys(map).length === 0) return null;
        return { themes: map };
    }

    if (listMinifigs && itemType === 'set') {
        let setNum = itemNumber;
        let minifigs = await fetchSetMinifigs(setNum);
        // Bare set numbers return an EMPTY 200 list (not 404); retry with -1.
        if ((!minifigs || minifigs.length === 0) && !setNum.includes('-')) {
            setNum = `${setNum}-1`;
            minifigs = await fetchSetMinifigs(setNum);
        }
        if (minifigs === null) return null;
        return { minifigs };
    }

    let json = await fetchItem(itemNumber);
    if (!json && itemType === 'set' && !itemNumber.includes('-')) {
        json = await fetchItem(`${itemNumber}-1`);
    }
    if (!json) return null;

    // Mapowanie jak w functions/index.js
    let mapped;
    if (itemType === 'set') {
        const setNumber = (json.set_num || '').split('-')[0];
        mapped = {
            name: json.name || '',
            theme: json.theme_id != null ? json.theme_id.toString() : '',
            year: json.year ? parseInt(json.year) : null,
            imageUrl: json.set_img_url || null,
            setNumber,
            pieceCount: json.num_parts ? parseInt(json.num_parts) : null,
            pricePaid: null
        };
    } else {
        mapped = {
            name: json.name || 'Unknown Minifigure',
            theme: json.theme_id != null ? json.theme_id.toString() : '',
            year: json.year ? parseInt(json.year) : null,
            imageUrl: json.fig_img_url || json.set_img_url || null,
            figureNumber: (json.fig_num || json.set_num || '').replace(/-\d{1,2}$/, '')
        };
    }

    // Rozwiąż numeryczne theme_id na nazwę (np. 171 -> Star Wars)
    if (json.theme_id != null) {
        try {
            const res = await fetch(`${BASE}/themes/${json.theme_id}/?key=${API_KEY}`);
            if (res.ok) {
                const theme = await res.json();
                if (theme.name) mapped.themeName = theme.name;
            }
        } catch (e) { /* nazwa motywu opcjonalna */ }
    }

    return mapped;
}

const HANDLERS = { lookupLegoItem };

// CORS: przeglądarka (localhost:8765) -> tu (localhost:5001) to żądanie
// cross-origin; SDK wysyła preflight OPTIONS, który musimy obsłużyć.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-version, x-firebase-gmpid',
    'Access-Control-Max-Age': '86400'
};

const server = http.createServer(async (req, res) => {
    // Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
    }

    // Protokół callable: POST /{project}/{region}/{function}
    const m = req.url.match(new RegExp(`/${PROJECT}/${REGION}/([a-zA-Z]+)`));
    if (req.method !== 'POST' || !m || !HANDLERS[m[1]]) {
        res.writeHead(404, Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS));
        res.end(JSON.stringify({ error: { message: 'not found' } }));
        return;
    }

    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
        let data = {};
        try { data = JSON.parse(body).data || {}; } catch (e) {}

        console.log(`→ ${m[1]} ${JSON.stringify(data).slice(0, 120)}`);

        // Wymagaj zalogowania (jak funkcja w chmurze)
        if (!decodeUid(req)) {
            res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS));
            res.end(JSON.stringify({ error: { status: 'UNAUTHENTICATED', message: 'You must be signed in.' } }));
            return;
        }

        try {
            const result = await HANDLERS[m[1]](data);
            res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS));
            res.end(JSON.stringify({ result }));
        } catch (err) {
            res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS));
            res.end(JSON.stringify({ error: { status: err.code || 'INTERNAL', message: err.message } }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ Lokalny serwer lookupLegoItem: http://localhost:${PORT}`);
    console.log('   (aplikacja na localhost użyje go automatycznie)');
});
