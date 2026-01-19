# LEGO Collection Manager

Aplikacja webowa do zarządzania kolekcją LEGO - setów i minifigurek. Zbudowana w czystym HTML/CSS/JavaScript z wykorzystaniem Firebase jako backendu.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.8.0-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Spis treści

- [Funkcjonalności](#funkcjonalności)
- [Technologie](#technologie)
- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Konfiguracja Firebase](#konfiguracja-firebase)
- [Uruchomienie](#uruchomienie)
- [Struktura projektu](#struktura-projektu)
- [Użytkowanie](#użytkowanie)
- [Screenshots](#screenshots)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Funkcjonalności

### Zarządzanie kolekcją
- **Dwie kategorie**: Sety LEGO i Minifigurki
- **CRUD**: Dodawanie, edycja, usuwanie i przeglądanie elementów
- **Upload zdjęć**: Możliwość dodawania zdjęć do każdego elementu
- **AI Vision**: Rozpoznawanie numeru seta/minifigurki ze zdjęcia
- **Import z LEGO.com**: Automatyczne pobieranie danych i obrazów ze strony LEGO.com

### Wyszukiwanie i filtrowanie
- **Wyszukiwanie**: Szybkie wyszukiwanie po nazwie, numerze, theme
- **Filtry**: Status (owned/wishlist/sold), kondycja, theme, rok
- **Sortowanie**: Po nazwie, numerze, roku, cenie, dacie dodania
- **Widoki**: Grid lub lista

### System użytkowników
- **Rejestracja**: Z weryfikacją emaila (kod 6-cyfrowy)
- **Logowanie**: Bezpieczna autentykacja Firebase
- **Chmura**: Dane synchronizowane z Firestore
- **Prywatność**: Każdy użytkownik widzi tylko swoje dane

### Dodatkowe funkcje
- **Buy Links**: Szybkie linki do BrickLink, Allegro, Amazon
- **Statystyki**: Podsumowanie kolekcji (ilość, wartość)
- **Responsywność**: Działa na desktopie, tablecie i telefonie
- **Offline fallback**: Lokalne przechowywanie gdy brak internetu

---

## Technologie

| Kategoria | Technologia |
|-----------|-------------|
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Backend | Firebase (Auth, Firestore, Storage, Functions) |
| Email | Resend API (przez Cloud Functions) |
| AI | OpenAI Vision API (opcjonalnie) |

**Bez zewnętrznych frameworków** - czysty vanilla JS dla maksymalnej wydajności.

---

## Wymagania

### Wymagania minimalne
- Przeglądarka: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Połączenie internetowe (do synchronizacji z Firebase)

### Do uruchomienia lokalnego serwera
- **Python 3.x** (do prostego serwera HTTP) lub
- **Node.js 16+** (do live-server) lub
- **Dowolny serwer HTTP** (np. XAMPP, WAMP)

### Do konfiguracji Firebase
- Konto Google
- Projekt Firebase (darmowy plan Spark wystarczy)

---

## Instalacja

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/masztalskiandrzej/Lego-Collection-Manager.git
cd Lego-Collection-Manager
```

### 2. Struktura po sklonowaniu

```
Lego-Collection-Manager/
├── index.html              # Strona główna
├── login.html              # Strona logowania
├── sets.html               # Kolekcja setów
├── minifigs.html           # Kolekcja minifigurek
├── css/
│   ├── styles.css          # Główne style
│   ├── home.css            # Style strony głównej
│   └── login.css           # Style logowania
├── js/
│   ├── sets/               # Moduły dla setów
│   │   ├── app.js
│   │   ├── storage.js
│   │   ├── ui.js
│   │   └── data.js
│   ├── minifigs/           # Moduły dla minifigurek
│   │   ├── app.js
│   │   ├── storage.js
│   │   ├── ui.js
│   │   └── data.js
│   ├── shared/             # Wspólne moduły
│   │   ├── firebase-config.js
│   │   ├── auth.js
│   │   ├── firestore-storage.js
│   │   ├── image-handler.js
│   │   ├── ai-vision.js
│   │   └── buy-links.js
│   └── login.js            # Logika logowania
├── images/                 # Ikony i zasoby graficzne
├── functions/              # Firebase Cloud Functions
│   └── index.js
├── firebase.json           # Konfiguracja Firebase
└── README.md
```

---

## Konfiguracja Firebase

Aplikacja wymaga projektu Firebase do działania. Postępuj zgodnie z poniższymi krokami:

### Krok 1: Utwórz projekt Firebase

1. Wejdź na [Firebase Console](https://console.firebase.google.com)
2. Kliknij **"Create a project"**
3. Wpisz nazwę projektu (np. "lego-collection-manager")
4. Możesz wyłączyć Google Analytics (opcjonalnie)
5. Kliknij **"Create project"**

### Krok 2: Włącz Authentication

1. W menu bocznym wybierz **Build → Authentication**
2. Kliknij **"Get started"**
3. W zakładce **"Sign-in method"** włącz **"Email/Password"**
4. Zapisz zmiany

### Krok 3: Utwórz Firestore Database

1. W menu wybierz **Build → Firestore Database**
2. Kliknij **"Create database"**
3. Wybierz **"Start in production mode"**
4. Wybierz region (zalecane: `europe-west3` dla Polski)
5. Kliknij **"Enable"**

### Krok 4: Skonfiguruj Security Rules (Firestore)

W zakładce **Rules** wklej:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Kliknij **"Publish"**.

### Krok 5: Włącz Storage (opcjonalnie - dla zdjęć)

1. W menu wybierz **Build → Storage**
2. Kliknij **"Get started"**
3. Wybierz **"Start in production mode"**
4. W zakładce **Rules** wklej:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId
                         && request.resource.size < 5 * 1024 * 1024
                         && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### Krok 6: Pobierz konfigurację

1. Kliknij ikonę **⚙️ (Settings)** → **Project settings**
2. Przewiń do sekcji **"Your apps"**
3. Jeśli nie ma aplikacji Web, kliknij ikonę **</> (Web)**
4. Zarejestruj aplikację (nazwa: "Collection Manager")
5. Skopiuj obiekt `firebaseConfig`

### Krok 7: Wprowadź konfigurację do projektu

Otwórz plik `js/shared/firebase-config.js` i zamień konfigurację:

```javascript
const firebaseConfig = {
    apiKey: "TWÓJ_API_KEY",
    authDomain: "TWÓJ_PROJECT_ID.firebaseapp.com",
    projectId: "TWÓJ_PROJECT_ID",
    storageBucket: "TWÓJ_PROJECT_ID.appspot.com",
    messagingSenderId: "TWÓJ_SENDER_ID",
    appId: "TWÓJ_APP_ID"
};
```

---

## Uruchomienie

### Metoda 1: Python (najprostsza)

```bash
# W katalogu projektu
python -m http.server 8000
```

Otwórz przeglądarkę: `http://localhost:8000`

### Metoda 2: Node.js z live-server

```bash
# Instalacja live-server globalnie
npm install -g live-server

# Uruchomienie
live-server
```

Przeglądarka otworzy się automatycznie.

### Metoda 3: Skrypty pomocnicze (Windows)

W projekcie znajdują się gotowe skrypty:

**PowerShell:**
```powershell
.\start-server.ps1
```

**Batch:**
```cmd
start-server.bat
```

### Metoda 4: Bezpośrednio w przeglądarce

> **Uwaga:** Niektóre funkcje (ES6 modules) mogą nie działać przy otwieraniu plików bezpośrednio (`file://` protocol). Zalecane jest użycie lokalnego serwera.

---

## Struktura projektu

### Główne pliki HTML

| Plik | Opis |
|------|------|
| `index.html` | Strona główna z panelami wyboru kategorii |
| `login.html` | Strona logowania i rejestracji |
| `sets.html` | Pełna aplikacja do zarządzania setami |
| `minifigs.html` | Pełna aplikacja do zarządzania minifigurkami |

### Moduły JavaScript

#### `/js/shared/` - Wspólne moduły

| Moduł | Funkcja |
|-------|---------|
| `firebase-config.js` | Konfiguracja i inicjalizacja Firebase |
| `auth.js` | Autentykacja (login, register, verify) |
| `firestore-storage.js` | Operacje CRUD na Firestore |
| `image-handler.js` | Upload i zarządzanie obrazami |
| `ai-vision.js` | Integracja z OpenAI Vision API |
| `buy-links.js` | Generowanie linków do sklepów |

#### `/js/sets/` i `/js/minifigs/` - Moduły per kategoria

| Moduł | Funkcja |
|-------|---------|
| `app.js` | Główna logika aplikacji, event handlers |
| `storage.js` | Adapter storage (Firestore/localStorage) |
| `ui.js` | Renderowanie interfejsu użytkownika |
| `data.js` | Przykładowe dane początkowe |

### Style CSS

| Plik | Opis |
|------|------|
| `styles.css` | Główne style aplikacji |
| `home.css` | Style strony głównej (panele) |
| `login.css` | Style strony logowania |

---

## Użytkowanie

### Pierwsza wizyta

1. Otwórz aplikację w przeglądarce
2. Kliknij **"Zarejestruj się"**
3. Wprowadź email i hasło (min. 6 znaków)
4. Sprawdź email - otrzymasz 6-cyfrowy kod weryfikacyjny
5. Wprowadź kod i potwierdź
6. Zaloguj się swoimi danymi

### Dodawanie elementów

1. Na stronie głównej wybierz kategorię (Sets/Minifigures)
2. Kliknij przycisk **"+ Add Item"**
3. Wypełnij formularz:
   - **Nazwa** (wymagane)
   - **Numer** seta/figurki
   - **Theme** (np. Star Wars, City)
   - **Rok**
   - **Status** (owned/wishlist/sold)
   - **Cena** zapłacona
   - **Kondycja** (new/used/sealed)
   - **Lokalizacja**
   - **Notatki**
   - **Zdjęcie** (opcjonalnie)
4. Kliknij **"Save"**

### Import z LEGO.com

1. Kliknij **"🌐 Fetch from LEGO.com"**
2. Wklej URL produktu z lego.com
3. Aplikacja automatycznie pobierze:
   - Nazwę seta
   - Numer
   - Cenę
   - Liczbę części
   - Zdjęcie

### AI Vision (rozpoznawanie ze zdjęcia)

1. Kliknij **"🔍 AI Vision"**
2. Wybierz zdjęcie seta lub minifigurki
3. AI rozpozna numer produktu
4. Potwierdź i uzupełnij dane

### Wyszukiwanie i filtrowanie

- **Wyszukiwarka**: Wpisz fragment nazwy lub numer
- **Filtry**: Kliknij na filtr w sidebarze
- **Sortowanie**: Wybierz z dropdown'a (nazwa, rok, cena...)
- **Widok**: Przełącz między Grid/List

### Buy Links

1. Na karcie elementu kliknij **"🛒 Buy"**
2. Otworzy się modal z linkami do sklepów:
   - BrickLink (marketplace LEGO)
   - Allegro
   - Amazon

---

## Screenshots

### Strona główna
Panele wyboru kategorii z efektem hover.

### Kolekcja setów
Grid z kartami setów, filtry, wyszukiwarka.

### Formularz dodawania
Modal z wszystkimi polami i upload zdjęcia.

### Widok mobilny
Responsywny layout dostosowany do telefonów.

---

## Rozwiązywanie problemów

### Problem: "Firebase not initialized"

**Przyczyna:** Nieprawidłowa konfiguracja Firebase.

**Rozwiązanie:**
1. Sprawdź plik `js/shared/firebase-config.js`
2. Upewnij się, że wszystkie wartości są wypełnione (nie "YOUR_...")
3. Sprawdź konsolę przeglądarki (F12) - powinno być: "✅ Firebase zainicjalizowany pomyślnie"

### Problem: "Permission denied" w Firestore

**Przyczyna:** Security Rules blokują dostęp.

**Rozwiązanie:**
1. Sprawdź Rules w Firebase Console → Firestore
2. Upewnij się, że reguły zezwalają zalogowanym użytkownikom
3. Sprawdź czy użytkownik jest zalogowany

### Problem: Email weryfikacyjny nie przychodzi

**Przyczyna:** Cloud Functions mogą nie być skonfigurowane.

**Rozwiązanie:**
1. Sprawdź konsolę przeglądarki (F12) - kod może być wyświetlony tam
2. Skonfiguruj Firebase Cloud Functions z Resend API
3. Zobacz plik `DEPLOYMENT.md` dla szczegółów

### Problem: Aplikacja nie działa przy otwieraniu pliku bezpośrednio

**Przyczyna:** Protokół `file://` blokuje ES6 modules (CORS).

**Rozwiązanie:**
Użyj lokalnego serwera HTTP (zobacz sekcję [Uruchomienie](#uruchomienie)).

### Problem: Zdjęcia się nie wgrywają

**Przyczyna:** Firebase Storage nie skonfigurowany lub limit rozmiaru.

**Rozwiązanie:**
1. Włącz Storage w Firebase Console
2. Sprawdź Security Rules dla Storage
3. Upewnij się, że plik < 5MB i jest obrazem (jpg, png, webp)

---

## Cloud Functions (opcjonalnie)

Dla pełnej funkcjonalności wysyłania emaili weryfikacyjnych, skonfiguruj Firebase Cloud Functions:

### Instalacja

```bash
cd functions
npm install
```

### Konfiguracja Resend API

```bash
firebase functions:secrets:set RESEND_API_KEY
# Wprowadź klucz API z https://resend.com
```

### Deployment

```bash
firebase deploy --only functions
```

Szczegóły w pliku `DEPLOYMENT.md`.

---

## Limity (darmowy plan Firebase)

| Usługa | Limit dzienny |
|--------|---------------|
| Firestore reads | 50,000 |
| Firestore writes | 20,000 |
| Storage | 5 GB total |
| Functions invocations | 125,000/month |

Wystarczające dla osobistego użytku.

---

## Licencja

MIT License - możesz używać, modyfikować i dystrybuować.

---

## Autor

Projekt stworzony jako aplikacja do zarządzania osobistą kolekcją LEGO.

---

## Wsparcie

Masz pytania lub znalazłeś błąd? Utwórz [Issue](https://github.com/masztalskiandrzej/Lego-Collection-Manager/issues) na GitHubie.
