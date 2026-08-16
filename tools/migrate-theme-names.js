/**
 * JEDNORAZOWA MIGRACJA MOTYWÓW: liczby -> nazwy (sets + minifigs)
 *
 * Stare wpisy mają w polu theme numeryczne ID Rebrickable (np. "158").
 * Skrypt pobiera mapę motywów (id -> nazwa) i przepisuje je na nazwy
 * (np. "Star Wars"). Nowe wpisy (po Auto-Fill ✨) już mają nazwy — nie są
 * ruszane. Aktualizowane jest TYLKO pole theme.
 *
 * Jak użyć:
 * 1. Uruchom lokalny serwer funkcji: node tools/local-functions-server.js
 * 2. Otwórz aplikację (http://localhost:8765), zaloguj się.
 * 3. DevTools (F12) -> Console -> wklej całą treść tego pliku -> Enter.
 * 4. Zobaczysz raport i prośbę o potwierdzenie. Bez „OK" nic nie zmienia.
 */
(async () => {
    const db = window.getFirebaseDb();
    const uid = window.Auth && window.Auth.getUserId();
    const fn = window.getFirebaseFunctions();
    if (!db || !uid || !fn) {
        console.error('❌ Zaloguj się w aplikacji i uruchom lokalny serwer funkcji (tools/local-functions-server.js).');
        return;
    }

    console.log('⏳ Pobieram mapę motywów z Rebrickable...');
    const lookup = fn.httpsCallable('lookupLegoItem');
    const res = await lookup({ themes: true });
    const themeMap = (res.data && res.data.themes) || null;
    if (!themeMap) {
        console.error('❌ Nie udało się pobrać mapy motywów.');
        return;
    }
    console.log(`✅ Mapa motywów: ${Object.keys(themeMap).length} pozycji.`);

    const isNumeric = v => v !== null && v !== undefined && /^\d+$/.test(String(v).trim());
    const report = {};
    let total = 0;

    for (const coll of ['setsCollection', 'minifigsCollection']) {
        const snap = await db.collection(`users/${uid}/${coll}`).get();
        const items = [];
        snap.forEach(d => {
            const data = d.data();
            if (isNumeric(data.theme)) {
                const name = themeMap[String(data.theme).trim()];
                items.push({ id: d.id, oldTheme: data.theme, name: name, label: data.name || '(bez nazwy)' });
            }
        });
        report[coll] = items;
        total += items.length;
    }

    if (total === 0) {
        console.log('✅ Żaden element nie ma cyfrowego motywu — migracja niepotrzebna.');
        return;
    }

    console.log('📋 ELEMENTY DO MIGRACJI:');
    for (const coll in report) {
        if (!report[coll].length) continue;
        console.log(`\n${coll}:`);
        report[coll].forEach(x =>
            console.log(`  "${x.label}" | motyw: ${x.oldTheme} -> ${x.name || '???'}`)
        );
    }
    const unknown = Object.values(report).flat().filter(x => !x.name).length;
    if (unknown > 0) console.warn(`⚠️ ${unknown} motywów nie ma w mapie — zostaną pominięte.`);

    if (!confirm(`Znaleziono ${total} elementów z cyfrowym motywem.\n\nPole theme zostanie przepisane na nazwy.\nKontynuować?`)) {
        console.log('Anulowano — nic nie zmieniono.');
        return;
    }

    let migrated = 0, skipped = 0;
    for (const coll in report) {
        for (const x of report[coll]) {
            if (!x.name) { skipped++; continue; }
            await db.collection(`users/${uid}/${coll}`).doc(x.id).update({ theme: x.name });
            migrated++;
            console.log(`✏️ ${coll}: ${x.label} — "${x.oldTheme}" -> "${x.name}"`);
        }
    }

    console.log(`✅ Gotowe. Zmigrowano: ${migrated}, pominięto: ${skipped}. Odśwież stronę.`);
    alert(`Zmigrowano ${migrated} elementów. Odśwież stronę.`);
})();
