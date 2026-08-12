# Collection Manager - Instrukcja Wdrożenia

## Spis treści
1. [Wymagania](#wymagania)
2. [Konfiguracja Resend (Email)](#konfiguracja-resend)
3. [Konfiguracja Rebrickable (wyszukiwanie zestawów)](#konfiguracja-rebrickable)
4. [Deployment Firebase Functions](#deployment-functions)
5. [Deployment Firebase Hosting](#deployment-hosting)
6. [Weryfikacja działania](#weryfikacja)
7. [Troubleshooting](#troubleshooting)

---

## Wymagania

### Wymagane narzędzia:
```bash
# Node.js (v18 lub nowszy)
node --version  # Powinno być v18.x.x lub wyższe

# npm
npm --version

# Firebase CLI
npm install -g firebase-tools

# Zaloguj się do Firebase
firebase login
```

### Konta wymagane:
- **Firebase** - https://console.firebase.google.com (już skonfigurowane)
- **Resend** - https://resend.com (darmowe - 100 emaili/dzień)
- **Rebrickable** - https://rebrickable.com/api/ (darmowy tier - auto-fill danych zestawów i minifigurek)

---

## Konfiguracja Resend

### Krok 1: Utwórz konto Resend

1. Wejdź na https://resend.com
2. Kliknij "Get Started" i zarejestruj się
3. Potwierdź email

### Krok 2: Pobierz API Key

1. W dashboardzie Resend przejdź do **API Keys**
2. Kliknij **Create API Key**
3. Nazwa: `collection-manager-production`
4. Permission: `Sending access`
5. Skopiuj klucz (zaczyna się od `re_`)

### Krok 3: Skonfiguruj domenę (WAŻNE!)

**Opcja A: Użyj własnej domeny (zalecane dla produkcji)**
1. W Resend → **Domains** → **Add Domain**
2. Dodaj swoją domenę (np. `collectionmanager.app`)
3. Skonfiguruj rekordy DNS zgodnie z instrukcją Resend:
   - SPF record
   - DKIM record
   - DMARC record (opcjonalnie)
4. Poczekaj na weryfikację (~5-10 minut)
5. Zmień adres "from" w `functions/index.js`:
   ```javascript
   from: 'Collection Manager <noreply@twoja-domena.pl>'
   ```

**Opcja B: Użyj domeny testowej Resend (tylko dla testów)**
- Możesz wysyłać tylko na swój własny email (ten z konta Resend)
- Adres "from": `onboarding@resend.dev`

### Krok 4: Zapisz API Key w Firebase

```bash
cd "C:\Users\Admin\Documents\PLIKI-PULPIT\Projekt test"

firebase functions:config:set resend.api_key="re_TWOJ_KLUCZ_API"
```

Sprawdź czy zostało zapisane:
```bash
firebase functions:config:get
```

---

## Konfiguracja Rebrickable

Funkcja `lookupLegoItem` wyszukuje dane zestawów i minifigurek po numerze
(auto-fill w formularzu dodawania). Wywołuje API Rebrickable **po stronie serwera**,
dzięki czemu klucz API nie trafia do przeglądarki.

### Krok 1: Pobierz API Key

1. Wejdź na https://rebrickable.com/api/
2. Zaloguj się / zarejestruj (darmowe konto)
3. Skopiuj swój **API key** (Settings → API)

### Krok 2: Zapisz API Key w functions/.env

Klucz Rebrickable **nie może** znajdować się w kodzie klienta (jest publicznie widoczny).
Przechowujemy go w pliku `functions/.env` — funkcja `lookupLegoItem` czyta go przez
`process.env.REBRICKABLE_API_KEY`. Plik `functions/.env` jest w `.gitignore`, więc
nigdy nie trafia do repozytorium.

```
REBRICKABLE_API_KEY=twoj_klucz_rebrickable
```

> **Plan Blaze:** po przejściu na plan Blaze można użyć Secret Manager
> (`firebase functions:secrets:set REBRICKABLE_API_KEY` + `runWith({ secrets })`)
> — zalecane, zanim aplikacja stanie się publiczna.

---

## Deployment Functions

### Krok 1: Zainstaluj zależności

```bash
cd functions
npm install
```

### Krok 2: Zdeployuj Cloud Functions

```bash
cd ..  # Wróć do głównego folderu projektu
firebase deploy --only functions
```

**Oczekiwany output:**
```
✔  functions[sendVerificationEmail(europe-west1)]: Successful create operation.
✔  functions[resendVerificationCode(europe-west1)]: Successful create operation.
✔  functions[lookupLegoItem(europe-west1)]: Successful create operation.
✔  Deploy complete!
```

### Krok 3: Sprawdź w Firebase Console

1. Wejdź na https://console.firebase.google.com
2. Wybierz projekt `collectionmanager-database`
3. Przejdź do **Functions**
4. Powinieneś zobaczyć:
   - `sendVerificationEmail` (europe-west1)
   - `resendVerificationCode` (europe-west1)
   - `lookupLegoItem` (europe-west1)

---

## Deployment Hosting

### Krok 1: Zdeployuj stronę

```bash
firebase deploy --only hosting
```

**Oczekiwany output:**
```
✔  Deploy complete!

Hosting URL: https://collectionmanager-database.web.app
```

### Krok 2: Sprawdź deployment

Otwórz w przeglądarce:
- https://collectionmanager-database.web.app

---

## Pełny Deployment (Functions + Hosting)

Możesz zdeployować wszystko jednym poleceniem:

```bash
cd "C:\Users\Admin\Documents\PLIKI-PULPIT\Projekt test"
firebase deploy
```

---

## Weryfikacja działania

### Test 1: Sprawdź stronę
1. Otwórz https://collectionmanager-database.web.app
2. Powinien przekierować na stronę logowania

### Test 2: Zarejestruj nowe konto
1. Kliknij "Register"
2. Wprowadź email i hasło
3. Sprawdź skrzynkę email (lub spam)
4. Powinieneś otrzymać email z kodem weryfikacyjnym
5. Wprowadź kod i zaloguj się

### Test 3: Sprawdź logi w Firebase Console
1. Firebase Console → Functions → Logs
2. Szukaj wpisów:
   - `✅ Verification email sent to...`
   - lub błędów jeśli coś nie działa

---

## Troubleshooting

### Problem: "Resend API key not configured"

**Przyczyna:** Klucz API nie został ustawiony

**Rozwiązanie:**
```bash
firebase functions:config:set resend.api_key="re_TWOJ_KLUCZ"
firebase deploy --only functions
```

### Problem: "Email sending not configured"

**Przyczyna:** Domena nie jest zweryfikowana w Resend

**Rozwiązanie:**
1. Wejdź do Resend → Domains
2. Zweryfikuj swoją domenę
3. Lub użyj `onboarding@resend.dev` tylko dla testów

### Problem: Email nie dochodzi

**Sprawdź:**
1. Folder SPAM
2. Logi w Firebase Console → Functions → Logs
3. Dashboard Resend → Emails (sprawdź status wysyłki)

### Problem: "Function not found"

**Przyczyna:** Functions nie zostały zdeployowane

**Rozwiązanie:**
```bash
firebase deploy --only functions
```

### Problem: "CORS error" w konsoli przeglądarki

**Przyczyna:** Functions używają innego regionu

**Rozwiązanie:** Sprawdź czy `firebase-config.js` używa `europe-west1`:
```javascript
firebaseFunctions = firebase.app().functions('europe-west1');
```

---

## Koszty

### Firebase (darmowy tier - Spark Plan):
- **Hosting**: 10 GB/miesiąc bandwidth
- **Firestore**: 50K reads/day, 20K writes/day
- **Auth**: Unlimited users
- **Functions**: 2M invocations/month

### Resend (darmowy tier):
- 100 emaili/dzień
- 3,000 emaili/miesiąc

**Wniosek:** Dla małej aplikacji (~100 użytkowników) darmowe plany są wystarczające.

---

## Linki

- **Aplikacja**: https://collectionmanager-database.web.app
- **Firebase Console**: https://console.firebase.google.com/project/collectionmanager-database
- **Resend Dashboard**: https://resend.com/emails

---

## Szybki Start (TL;DR)

```bash
# 1. Skonfiguruj Resend API key
firebase functions:config:set resend.api_key="re_TWOJ_KLUCZ"

# 2. Skonfiguruj Rebrickable API key (auto-fill danych zestawów)
#    Dodaj do functions/.env (plik jest gitignored):
#    REBRICKABLE_API_KEY=twoj_klucz

# 3. Zainstaluj zależności functions
cd functions && npm install && cd ..

# 4. Deploy wszystkiego
firebase deploy

# 5. Gotowe!
# Otwórz: https://collectionmanager-database.web.app
```
