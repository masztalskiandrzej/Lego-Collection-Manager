# Plan Implementacji 5 Funkcjonalności

## Przegląd

Implementacja 5 funkcjonalności dla LEGO Collection Manager:
1. **Dark Mode** - przełącznik jasny/ciemny motyw
2. **Export/Import** - eksport JSON/CSV, import JSON
3. **Duplicate Detection** - wykrywanie duplikatów przy dodawaniu
4. **Wishlist → Owned** - przycisk "Got It!" na kartach wishlist
5. **Keyboard Shortcuts** - rozszerzone skróty klawiszowe

---

## Pliki do Utworzenia (3 nowe moduły)

| Plik | Opis |
|------|------|
| `js/shared/theme.js` | Moduł Dark Mode (~100 linii) |
| `js/shared/export-import.js` | Moduł Export/Import (~200 linii) |
| `js/shared/keyboard-shortcuts.js` | Moduł skrótów klawiszowych (~120 linii) |

---

## Pliki do Modyfikacji

| Plik | Zmiany |
|------|--------|
| `css/styles.css` | CSS variables dla dark mode, style dropdownów, progress bar, kbd |
| `css/home.css` | Dark mode dla strony głównej |
| `css/login.css` | Dark mode dla logowania |
| `sets.html` | Przyciski w headerze, modale (import, duplicate, shortcuts) |
| `minifigs.html` | Identyczne zmiany jak sets.html |
| `index.html` | Include theme.js |
| `js/sets/app.js` | Handlery dla wszystkich 5 funkcji |
| `js/minifigs/app.js` | Identyczne handlery |
| `js/sets/ui.js` | Przycisk "Got It!" w szablonie karty |
| `js/minifigs/ui.js` | Identyczny przycisk |
| `js/sets/storage.js` | Metoda `findByNumber()` |
| `js/minifigs/storage.js` | Identyczna metoda |

---

## Kolejność Implementacji

### Faza 1: Dark Mode
1. Utworzenie `js/shared/theme.js`
2. Dodanie CSS variables do `styles.css` (sekcja `[data-theme="dark"]`)
3. Dodanie dark mode do `home.css` i `login.css`
4. Dodanie przycisku toggle w headerze HTML
5. Include skryptu i inicjalizacja

### Faza 2: Keyboard Shortcuts
1. Utworzenie `js/shared/keyboard-shortcuts.js`
2. Dodanie stylów dla `kbd` i modalu pomocy
3. Include skryptu w HTML
4. Integracja z app.js (callbacks)

### Faza 3: Export/Import
1. Utworzenie `js/shared/export-import.js`
2. Dodanie CSS dla dropdown menu i progress bar
3. Dodanie przycisków i modalu importu w HTML
4. Handlery w app.js

### Faza 4: Duplicate Detection
1. Dodanie `findByNumber()` do storage.js
2. Dodanie modalu ostrzeżenia w HTML
3. Modyfikacja `handleFormSubmit()` w app.js
4. CSS dla highlight animation

### Faza 5: Wishlist → Owned
1. Modyfikacja `createItemCard()` w ui.js
2. Dodanie handlera `handleGotIt()` w app.js
3. CSS dla `.btn-success`

---

## Kluczowe Szczegóły Techniczne

### Dark Mode - CSS Variables
```css
[data-theme="dark"] {
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --text-primary: #e8e8e8;
    --text-secondary: #b0b0b0;
    --card-bg: #16213e;
    --input-bg: #0f3460;
}
```

### Keyboard Shortcuts
| Klawisz | Akcja |
|---------|-------|
| `N` | Nowy element |
| `S` lub `/` | Focus na wyszukiwarkę |
| `G` | Widok siatki |
| `L` | Widok listy |
| `D` | Toggle dark mode |
| `1-4` | Filtry statusu |
| `?` | Pomoc |
| `Esc` | Zamknij modal |

### Export/Import - Struktura JSON
```javascript
{
    version: "1.0",
    exportDate: "2026-01-19T...",
    collectionType: "setsCollection",
    itemCount: 42,
    items: [...]
}
```

### Duplicate Detection - Flow
1. User wprowadza numer setu
2. `handleFormSubmit()` wywołuje `Storage.findByNumber()`
3. Jeśli znaleziono → wyświetl modal ostrzeżenia
4. User wybiera: Cancel / View Existing / Add Anyway

### Wishlist Button - Warunkowe renderowanie
```javascript
const gotItButton = item.status === 'wishlist'
    ? `<button class="btn btn-success got-it-btn" data-id="${item.id}">✓ Got It!</button>`
    : '';
```

---

## Weryfikacja

### Checklist testowy:
- [ ] Dark Mode: toggle działa, preferencja zapisana, system preference
- [ ] Export: JSON i CSV poprawnie generowane
- [ ] Import: pliki importowane, duplikaty obsłużone, progress bar
- [ ] Duplicate: ostrzeżenie wyświetlane, highlight istniejącego
- [ ] Got It!: przycisk tylko na wishlist, zmiana statusu, powiadomienie
- [ ] Shortcuts: wszystkie skróty działają, help modal, brak konfliktów z inputami
- [ ] Responsive: wszystko działa na mobile
- [ ] Obie strony: sets.html i minifigs.html

---

## Szacowany Zakres

- **Nowy kod:** ~420 linii JS (3 moduły)
- **Nowy CSS:** ~250 linii
- **Zmiany HTML:** ~150 linii per strona
- **Zmiany app.js:** ~150 linii per plik
