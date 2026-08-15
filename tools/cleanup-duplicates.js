/**
 * JEDNORAZOWE CZYSZCZENIE DUPLIKATÓW (sets + minifigs)
 *
 * Jak użyć:
 * 1. Otwórz aplikację lokalnie (np. http://localhost:8765/sets.html) i ZALOGUJ SIĘ.
 * 2. Otwórz DevTools (F12) -> zakładka Console.
 * 3. Wklej CAŁĄ zawartość tego pliku i naciśnij Enter.
 * 4. Skrypt pokaże raport duplikatów (wg numeru zestawu/figurki) i poprosi o
 *    potwierdzenie przed usunięciem. Zosatwia najstarszy wpis (dateAdded),
 *    usuwa późniejsze kopie.
 *
 * Bezpieczeństwo: działa przez klienta Firebase na zalogowanym koncie —
 * dotyczy wyłącznie Twoich danych. Nic nie robi bez potwierdzenia.
 */
(async () => {
    const db = window.getFirebaseDb();
    const uid = window.Auth && window.Auth.getUserId();
    if (!db || !uid) {
        console.error('❌ Brak bazy lub nie jesteś zalogowany. Otwórz stronę aplikacji i zaloguj się.');
        return;
    }

    const report = {};
    let totalDupes = 0;

    for (const coll of ['setsCollection', 'minifigsCollection']) {
        const snap = await db.collection(`users/${uid}/${coll}`).get();
        const byNumber = {};

        snap.forEach(d => {
            const data = d.data();
            const num = (data.setNumber || data.figureNumber || '').toString().trim().toLowerCase();
            if (!num) return;
            (byNumber[num] = byNumber[num] || []).push({
                id: d.id,
                dateAdded: data.dateAdded || '9999-12-31', // brak daty = traktuj jako najnowszy
                name: data.name || '(bez nazwy)'
            });
        });

        const dups = {};
        for (const num in byNumber) {
            if (byNumber[num].length > 1) {
                // Sortuj: najstarszy pierwszy (zostanie)
                byNumber[num].sort((a, b) => (a.dateAdded < b.dateAdded ? -1 : 1));
                dups[num] = byNumber[num];
                totalDupes += byNumber[num].length - 1;
            }
        }
        report[coll] = dups;
    }

    if (totalDupes === 0) {
        console.log('✅ Brak duplikatów — obie kolekcje są czyste.');
        return;
    }

    // Raport w konsoli
    console.log('📋 RAPORT DUPLIKATÓW:');
    for (const coll in report) {
        const dups = report[coll];
        const n = Object.keys(dups).length;
        if (!n) continue;
        console.log(`\n${coll} — ${n} numer(ów) z duplikatami:`);
        for (const num in dups) {
            console.group(`  ${num}`);
            dups[num].forEach((x, i) => console.log(
                `${i === 0 ? 'ZOSTAJE' : 'DO USUNIĘCIA'} | ${x.dateAdded} | ${x.name} | id=${x.id}`
            ));
            console.groupEnd();
        }
    }
    console.log(`\nŁącznie do usunięcia: ${totalDupes} elementów.`);

    if (!confirm(`Znaleziono ${totalDupes} duplikatów.\n\nZostanie najstarszy wpis z każdego numeru, pozostałe kopie zostaną USUNIĘTE.\nSzczegóły w konsoli (F12).\n\nKontynuować?`)) {
        console.log('Anulowano — nic nie usunięto.');
        return;
    }

    let deleted = 0;
    for (const coll in report) {
        for (const num in report[coll]) {
            const group = report[coll][num];
            for (let i = 1; i < group.length; i++) { // 0 = najstarszy, zostaje
                await db.collection(`users/${uid}/${coll}`).doc(group[i].id).delete();
                deleted++;
                console.log(`🗑️ Usunięto duplikat: ${coll} ${num} (${group[i].name})`);
            }
        }
    }

    console.log(`✅ Gotowe. Usunięto ${deleted} duplikatów. Odśwież stronę, aby zobaczyć efekt.`);
    alert(`Usunięto ${deleted} duplikatów. Odśwież stronę.`);
})();
