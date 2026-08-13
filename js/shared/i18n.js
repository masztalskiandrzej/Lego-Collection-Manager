/**
 * I18N — lekka lokalizacja PL/EN (vanilla JS, bez builda).
 *
 * Użycie:
 *   I18N.t('login.welcomeBack')               -> string w bieżącym języku
 *   I18N.t('msg.imported', {count: 12})        -> podstawienie {count}
 *   I18N.apply(root?)                          -> przetłumacz [data-i18n],
 *                                                  [data-i18n-placeholder], [data-i18n-title]
 *   I18N.setLang('en')                         -> zmień język, zapisz, apply
 *
 * Elementy HTML:
 *   <x data-i18n="key"/>                       -> textContent
 *   <input data-i18n-placeholder="key"/>       -> placeholder
 *   <x data-i18n-title="key"/>                 -> title (tooltip)
 *
 * Przełącznik w UI (automatycznie podpinany):
 *   <button data-lang-btn="pl">PL</button>
 *   <button data-lang-btn="en">EN</button>
 *
 * Domyślny język: 'pl'. Wybór zapamiętany w localStorage('lang').
 */
(function () {
    const STORAGE_KEY = 'lang';
    const DEFAULT_LANG = 'pl';
    const SUPPORTED = ['pl', 'en'];

    const translations = {
        pl: {
            'common.loading': 'Ładowanie...',
            'common.user': 'Użytkownik',
            'common.errorPrefix': 'Błąd: ',

            'index.sets': 'Zestawy',
            'index.setsDesc': 'Zarządzaj kolekcją zestawów LEGO',
            'index.minifigs': 'Minifigurki',
            'index.minifigsDesc': 'Zarządzaj kolekcją minifigurek LEGO',
            'index.logoutConfirm': 'Czy chcesz się wylogować?',
            'index.logoutError': 'Błąd wylogowania: ',

            'login.title': 'Logowanie — LEGO Collection Manager',
            'login.themeToggle': 'Przełącz tryb ciemny',
            'login.subtitle': 'Zarządzaj kolekcją zestawów i minifigurek LEGO',
            'login.welcomeBack': 'Witaj ponownie',
            'login.signinSubtitle': 'Zaloguj się, aby uzyskać dostęp do kolekcji',
            'login.email': 'Adres email',
            'login.emailPh': 'twoj@email.com',
            'login.password': 'Hasło',
            'login.loginBtn': 'Zaloguj się',
            'login.noAccount': 'Nie masz konta?',
            'login.signUp': 'Zarejestruj się',
            'login.createAccount': 'Utwórz konto',
            'login.createSubtitle': 'Dołącz i zacznij organizować swoje kolekcje',
            'login.passwordPh': 'Minimum 6 znaków',
            'login.passwordHint': 'Minimum 6 znaków',
            'login.confirmPassword': 'Potwierdź hasło',
            'login.confirmPh': 'Takie samo hasło',
            'login.haveAccount': 'Masz już konto?',
            'login.verifyTitle': 'Zweryfikuj swój email',
            'login.verifySubtitle': 'Wpisz 4-cyfrowy kod, aby zweryfikować konto',
            'login.verifyInfo': 'Kod weryfikacyjny został wygenerowany. Sprawdź konsolę przeglądarki (F12), aby go zobaczyć.',
            'login.verifyBtn': 'Zweryfikuj',
            'login.resendBtn': 'Wyślij kod ponownie',
            'login.backToLogin': '← Wróć do logowania',
            'login.processing': 'Przetwarzanie...',
            'login.footer': '🔒 Twoje dane są bezpieczne i zaszyfrowane',

            'auth.moduleNotLoadedLong': 'Moduł logowania nie został załadowany. Odśwież stronę.',
            'auth.moduleNotLoaded': 'Moduł logowania nie został załadowany',
            'auth.loginSuccess': 'Zalogowano pomyślnie! Przekierowywanie...',
            'auth.loginFailed': 'Logowanie nieudane',
            'auth.notVerifiedConfirm': 'Twój email nie został zweryfikowany.\n\nCzy chcesz wygenerować nowy kod weryfikacyjny?\n(Sprawdź konsolę F12, aby zobaczyć kod)',
            'auth.newCodeGenerated': 'Nowy kod wygenerowany! Sprawdź konsolę (F12)',
            'auth.passwordsNoMatch': 'Hasła nie są zgodne',
            'auth.registerSuccess': 'Rejestracja udana! Sprawdź konsolę, aby zobaczyć kod weryfikacyjny.',
            'auth.registerFailed': 'Rejestracja nieudana',
            'auth.enterCode': 'Wpisz 4-cyfrowy kod',
            'auth.emailVerified': 'Email zweryfikowany! Przekierowywanie...',
            'auth.invalidCode': 'Nieprawidłowy kod weryfikacyjny',
            'auth.verifyFailed': 'Weryfikacja nieudana',
            'auth.codeResent': 'Nowy kod weryfikacyjny wysłany! Sprawdź konsolę.',
            'auth.resendFailed': 'Nie udało się wysłać kodu ponownie: ',

            'common.all': 'Wszystko',
            'common.cancel': 'Anuluj',
            'common.save': 'Zapisz',
            'common.delete': 'Usuń',
            'common.remove': 'Usuń',
            'common.close': 'Zamknij',
            'common.edit': 'Edytuj',

            'status.owned': 'Posiadane',
            'status.wishlist': 'Lista życzeń',
            'status.sold': 'Sprzedane',
            'condition.new': 'Nowe',
            'condition.used': 'Używane',
            'condition.sealed': 'Zafoliowane',
            'type.set': 'ZESTAW',
            'type.minifig': 'MINIFIG',
            'card.pieces': '{n} szt.',

            'sets.title': 'Kolekcja zestawów — LEGO Manager',
            'sets.h1': 'Zestawy',
            'minifigs.title': 'Kolekcja minifigurek — LEGO Manager',
            'minifigs.h1': 'Minifigurki',

            'nav.navigation': 'Nawigacja',
            'nav.home': 'Strona główna',
            'nav.toMinifigs': 'Przejdź do minifigurek',
            'nav.toSets': 'Przejdź do zestawów',
            'nav.legoCom': 'Odwiedź LEGO.com',

            'header.exportShare': 'Eksport i udostępnianie',
            'header.addSet': '+ Dodaj zestaw',
            'header.addMinifig': '+ Dodaj minifigórkę',
            'header.buy': '🛒 Kup',
            'header.settings': 'Ustawienia',

            'filters.title': 'Filtry',
            'filters.theme': 'Motyw',
            'filters.allThemes': 'Wszystkie motywy',
            'filters.status': 'Status',
            'filters.condition': 'Stan',
            'filters.yearRange': 'Zakres lat',
            'filters.min': 'Od',
            'filters.max': 'Do',
            'filters.clear': 'Wyczyść filtry',

            'toolbar.searchSets': 'Szukaj po nazwie, numerze zestawu lub notatkach...',
            'toolbar.searchMinifigs': 'Szukaj po nazwie, numerze figurki lub notatkach...',
            'toolbar.sortBy': 'Sortuj:',
            'sort.name': 'Nazwa',
            'sort.setNumber': 'Numer zestawu',
            'sort.figureNumber': 'Numer figurki',
            'sort.theme': 'Motyw',
            'sort.year': 'Rok',
            'sort.pieces': 'Liczba elementów',
            'sort.price': 'Cena',
            'sort.dateAdded': 'Data dodania',
            'toolbar.toggleSort': 'Zmień kierunek sortowania',
            'toolbar.gridView': 'Widok siatki',
            'toolbar.listView': 'Widok listy',

            'empty.sets': 'Brak zestawów.',
            'empty.setsHint': 'Dodaj swój pierwszy zestaw lub zmień filtry.',
            'empty.minifigs': 'Brak minifigurek.',
            'empty.minifigsHint': 'Dodaj swoją pierwszą minifigórkę lub zmień filtry.',

            'pagination.first': 'Pierwsza strona',
            'pagination.prev': 'Poprzednia',
            'pagination.next': 'Następna',
            'pagination.last': 'Ostatnia strona',
            'pagination.page': 'Strona',
            'pagination.of': 'z',
            'pagination.itemsSuffix': 'elementów)',

            'footer.setsWord': 'zestawów',
            'footer.minifigsWord': 'minifigurek',
            'footer.totalPieces': 'łącznie elementów',
            'footer.value': 'Wartość:',

            'form.addSetTitle': 'Dodaj zestaw',
            'form.editSetTitle': 'Edytuj zestaw',
            'form.addMinifigTitle': 'Dodaj minifigórkę',
            'form.editMinifigTitle': 'Edytuj minifigórkę',
            'form.name': 'Nazwa *',
            'form.nameSetPh': 'np. Sokół Millennium',
            'form.nameMinifigPh': 'np. Luke Skywalker',
            'form.setNumber': 'Numer zestawu',
            'form.figureNumber': 'Numer figurki',
            'form.numberSetPh': 'np. 75192',
            'form.numberMinifigPh': 'np. sw0999',
            'form.getImage': '📷 Pobierz zdjęcie',
            'form.getImageTitle': 'Pobierz oficjalne zdjęcie z BrickLink',
            'form.getImageHintSet': 'Wpisz numer zestawu i kliknij „Pobierz zdjęcie", aby pobrać oficjalne zdjęcie',
            'form.getImageHintMinifig': 'Wpisz numer figurki i kliknij „Pobierz zdjęcie", aby pobrać oficjalne zdjęcie',
            'form.theme': 'Motyw *',
            'form.themePh': 'np. Star Wars',
            'form.year': 'Rok',
            'form.status': 'Status *',
            'form.pieceCount': 'Liczba elementów',
            'form.piecePh': 'np. 7541',
            'form.price': 'Cena ($)',
            'form.condition': 'Stan',
            'form.location': 'Lokalizacja',
            'form.locationSetPh': 'np. Półka A',
            'form.locationMinifigPh': 'np. Szuflada 3',
            'form.notes': 'Notatki',
            'form.notesPh': 'Dodatkowe notatki...',
            'form.photo': 'Zdjęcie',
            'form.choosePhoto': '📷 Wybierz zdjęcie',
            'form.noFile': 'Brak pliku',
            'form.newImage': 'Nowe zdjęcie wybrane',
            'form.currentImage': 'Bieżące zdjęcie',
            'form.officialImage': 'Oficjalne zdjęcie: {n}',
            'form.previewAlt': 'Podgląd',

            'delete.title': 'Potwierdź usunięcie',
            'delete.confirmSet': 'Czy na pewno chcesz usunąć „{name}"?',
            'delete.warning': 'Tej akcji nie można cofnąć.',
            'delete.confirmPrefix': 'Czy na pewno chcesz usunąć',

            'buy.buySets': '🛒 Kup zestawy',
            'buy.buyMinifigs': '🛒 Kup minifigurki',
            'buy.legoOfficial': 'LEGO.com — sklep oficjalny',
            'buy.itemTitle': 'Szukaj tego elementu w sklepach',

            'export.title': '📤 Eksport i udostępnianie',
            'export.summary': '📊 Podsumowanie kolekcji',
            'export.totalItems': 'Liczba elementów:',
            'export.totalValue': 'Łączna wartość:',
            'export.themes': 'Motywy:',
            'export.withImages': 'Ze zdjęciami:',
            'export.exportData': 'Eksport danych',
            'export.toCsv': 'Eksportuj do CSV',
            'export.csvDesc': 'Format zgodny z arkuszami',
            'export.toJson': 'Eksportuj do JSON',
            'export.jsonDesc': 'Pełna kopia zapasowa z metadanymi',
            'export.social': 'Udostępnianie',
            'export.genCard': 'Wygeneruj kartę kolekcji',
            'export.cardDesc': 'Ładny obraz do mediów społecznościowych',
            'export.genQr': 'Wygeneruj kod QR',
            'export.qrDesc': 'Udostępnij link do kolekcji',
            'export.importData': 'Import danych',
            'export.fromJson': 'Importuj z JSON',
            'export.importDesc': 'Przywróć z pliku kopii zapasowej',
            'export.publicSharing': 'Udostępnianie publiczne',
            'export.genPublicLink': 'Wygeneruj publiczny link',
            'export.publicDesc': 'Utwórz URL kolekcji do udostępnienia',

            'cardPreview.title': '🎨 Twoja karta kolekcji',
            'cardPreview.generating': 'Generowanie karty kolekcji...',
            'cardPreview.download': '📥 Pobierz kartę',
            'cardPreview.shareTwitter': '🐦 Udostępnij na Twitterze',
            'cardPreview.alt': 'Karta kolekcji',

            'settings.title': '⚙️ Ustawienia',
            'settings.appearance': 'Wygląd',
            'settings.darkMode': 'Tryb ciemny',
            'settings.darkModeDesc': 'Włącz ciemny motyw aplikacji',
            'settings.dataMgmt': 'Zarządzanie danymi',
            'settings.exportColl': 'Eksport kolekcji',
            'settings.exportCollDesc': 'Eksportuj dane do CSV lub JSON',
            'settings.exportBtn': '📤 Eksport',
            'settings.importColl': 'Import kolekcji',
            'settings.importCollDesc': 'Importuj dane z pliku kopii zapasowej',
            'settings.importBtn': '📥 Import',

            'msg.logoutConfirm': 'Czy chcesz się wylogować?',
            'msg.logoutError': 'Błąd wylogowania: ',
            'msg.loggedOut': 'Wylogowano',
            'msg.loggedInAs': 'Zalogowany jako {email} — kliknij, aby się wylogować',
            'msg.exportNotAvail': 'Moduł eksportu niedostępny',
            'msg.exportOpenError': 'Błąd otwierania modalu eksportu: ',
            'msg.setUpdated': 'Zestaw zaktualizowany!',
            'msg.setAdded': 'Zestaw dodany!',
            'msg.setDeleted': 'Zestaw usunięty.',
            'msg.minifigUpdated': 'Minifigurka zaktualizowana!',
            'msg.minifigAdded': 'Minifigurka dodana!',
            'msg.minifigDeleted': 'Minifigurka usunięta.',
            'msg.dupSetConfirm': '⚠️ Zestaw z numerem „{n}" już istnieje. Zapisać mimo to?',
            'msg.dupMinifigConfirm': '⚠️ Minifigurka z numerem „{n}" już istnieje. Zapisać mimo to?',
            'msg.selectImage': 'Wybierz plik obrazu',
            'msg.imageTooBig': 'Plik obrazu musi być mniejszy niż 10MB',
            'msg.imageLarge': 'Obraz jest duży. Rozważ użycie mniejszego.',
            'msg.compressed': 'skompresowano',
            'msg.imageLoadError': 'Błąd ładowania obrazu',
            'msg.imageReadError': 'Błąd odczytu pliku obrazu',
            'msg.enterSetNumber': 'Wpisz najpierw numer zestawu (np. 75192)',
            'msg.enterMinifigNumber': 'Wpisz najpierw numer figurki (np. sw0999)',
            'msg.noOfficialImageSet': 'Nie znaleziono oficjalnego zdjęcia dla zestawu „{n}". Upewnij się, że numer jest poprawny. Możesz też wgrać własne zdjęcie.',
            'msg.noOfficialImageMinifig': 'Nie znaleziono oficjalnego zdjęcia dla figurki „{n}". Upewnij się, że numer jest poprawny. Możesz też wgrać własne zdjęcie.',
            'msg.buyNotAvail': 'Funkcja linków zakupu niedostępna',
            'msg.buyOpenError': 'Błąd otwierania modalu zakupu: ',
            'msg.fillAll': 'Wypełnij wszystkie pola',
            'msg.passwordShort': 'Hasło musi mieć min. 6 znaków',
            'msg.regSuccess': 'Rejestracja udana! Sprawdź konsolę (F12), aby zobaczyć kod weryfikacyjny.',
            'msg.emailVerified': 'Email zweryfikowany pomyślnie! Jesteś zalogowany.',
            'msg.codeResent2': 'Kod weryfikacyjny wysłany ponownie! Sprawdź konsolę (F12).',
            'msg.enterNumberShortSet': '⚠️ Wpisz najpierw numer zestawu.',
            'msg.enterNumberShortMinifig': '⚠️ Wpisz najpierw numer figurki.',
            'msg.aivisionNotLoaded': 'Moduł AIVision nie załadowany',
            'msg.notFoundSet': '⚠️ Zestaw „{n}" nie znaleziony w bazie.',
            'msg.notFoundMinifig': '⚠️ Minifigurka „{n}" nie znaleziona w bazie.',
            'msg.notFoundSetShort': 'Zestaw {n} nie znaleziony. Sprawdź numer i spróbuj ponownie.',
            'msg.notFoundMinifigShort': 'Minifigurka {n} nie znaleziona. Sprawdź numer i spróbuj ponownie.',
            'msg.fetching': '🔍 Pobieranie danych...',
            'msg.downloadingImg': '🖼️ Pobieranie oficjalnego obrazu...',
            'msg.loadingEllipsis': 'Ładowanie...',
            'msg.done': '✅ Gotowe!',
            'msg.autofillFailed': 'Auto-Fill nie powiódł się: ',
            'msg.exportCsvOk': 'Kolekcja wyeksportowana do CSV!',
            'msg.exportCsvErr': 'Błąd eksportu do CSV: ',
            'msg.exportJsonOk': 'Kolekcja wyeksportowana do JSON!',
            'msg.exportJsonErr': 'Błąd eksportu do JSON: ',
            'msg.cardErr': 'Błąd generowania karty: ',
            'msg.qrErr': 'Błąd generowania kodu QR: ',
            'msg.importConfirm': 'Spowoduje to import elementów i dodanie ich do istniejącej kolekcji. Kontynuować?',
            'msg.importing': 'Importowanie kolekcji...',
            'msg.imported': 'Pomyślnie zaimportowano {count} elementów!',
            'msg.importErr': 'Błąd importu: ',
            'msg.loginRequiredPublic': 'Musisz być zalogowany, aby tworzyć publiczne linki',
            'msg.publicLinkCopied': 'Publiczny link skopiowany do schowka!',
            'msg.publicLinkErr': 'Błąd tworzenia publicznego linku: ',
            'msg.qrDownloaded': 'Kod QR wygenerowany i pobrany!',
            'msg.cardDownloaded': 'Karta kolekcji pobrana!',
            'msg.storageMissing': 'Moduł Storage nie załadowany. Odśwież stronę i upewnij się, że jesteś zalogowany.',
            'msg.exportMissing': 'Moduł eksportu nie załadowany. Odśwież stronę.',
            'msg.loginToExport': 'Zaloguj się, aby wyeksportować kolekcję.',
            'msg.loginToCard': 'Zaloguj się, aby generować karty kolekcji.',
            'msg.modulesMissing': 'Wymagane moduły nie załadowane. Odśwież stronę.',
            'msg.socialMissing': 'Moduł udostępniania nie załadowany. Odśwież stronę.',
            'msg.loginToImport': 'Zaloguj się, aby importować elementy.',
            'msg.exportModalNotFound': 'Modal eksportu nie znaleziony na stronie',
            'msg.requiredModulesMissing': 'Wymagane moduły niedostępne: {mods}. Odśwież stronę i upewnij się, że jesteś zalogowany.',
            'msg.loginRequiredShort': 'Wymagane logowanie',
            'msg.na': 'N/A',
            'msg.errorShort': 'Błąd'
        },
        en: {
            'common.loading': 'Loading...',
            'common.user': 'User',
            'common.errorPrefix': 'Error: ',

            'index.sets': 'Sets',
            'index.setsDesc': 'Manage your LEGO sets collection',
            'index.minifigs': 'Minifigures',
            'index.minifigsDesc': 'Manage your LEGO minifigures collection',
            'index.logoutConfirm': 'Do you want to log out?',
            'index.logoutError': 'Logout error: ',

            'login.title': 'Log In — LEGO Collection Manager',
            'login.themeToggle': 'Toggle Dark Mode',
            'login.subtitle': 'Manage your LEGO sets and minifigures collection',
            'login.welcomeBack': 'Welcome Back',
            'login.signinSubtitle': 'Sign in to access your collections',
            'login.email': 'Email Address',
            'login.emailPh': 'your@email.com',
            'login.password': 'Password',
            'login.loginBtn': 'Log In',
            'login.noAccount': "Don't have an account?",
            'login.signUp': 'Sign Up',
            'login.createAccount': 'Create Account',
            'login.createSubtitle': 'Join us and start organizing your collections',
            'login.passwordPh': 'At least 6 characters',
            'login.passwordHint': 'Minimum 6 characters',
            'login.confirmPassword': 'Confirm Password',
            'login.confirmPh': 'Same as password',
            'login.haveAccount': 'Already have an account?',
            'login.verifyTitle': 'Verify Your Email',
            'login.verifySubtitle': 'Enter the 4-digit code to verify your account',
            'login.verifyInfo': 'A verification code has been generated. Check the browser console (F12) to see it.',
            'login.verifyBtn': 'Verify',
            'login.resendBtn': 'Resend Code',
            'login.backToLogin': '← Back to Login',
            'login.processing': 'Processing...',
            'login.footer': '🔒 Your data is secure and encrypted',

            'auth.moduleNotLoadedLong': 'Authentication module not loaded. Please refresh the page.',
            'auth.moduleNotLoaded': 'Authentication module not loaded',
            'auth.loginSuccess': 'Login successful! Redirecting...',
            'auth.loginFailed': 'Login failed',
            'auth.notVerifiedConfirm': 'Your email is not verified.\n\nDo you want to generate a new verification code?\n(Check console F12 to see the code)',
            'auth.newCodeGenerated': 'New code generated! Check console (F12)',
            'auth.passwordsNoMatch': 'Passwords do not match',
            'auth.registerSuccess': 'Registration successful! Check console for verification code.',
            'auth.registerFailed': 'Registration failed',
            'auth.enterCode': 'Please enter a 4-digit code',
            'auth.emailVerified': 'Email verified! Redirecting...',
            'auth.invalidCode': 'Invalid verification code',
            'auth.verifyFailed': 'Verification failed',
            'auth.codeResent': 'New verification code sent! Check console.',
            'auth.resendFailed': 'Failed to resend code: ',

            'common.all': 'All',
            'common.cancel': 'Cancel',
            'common.save': 'Save',
            'common.delete': 'Delete',
            'common.remove': 'Remove',
            'common.close': 'Close',
            'common.edit': 'Edit',

            'status.owned': 'Owned',
            'status.wishlist': 'Wishlist',
            'status.sold': 'Sold',
            'condition.new': 'New',
            'condition.used': 'Used',
            'condition.sealed': 'Sealed',
            'type.set': 'SET',
            'type.minifig': 'MINIFIG',
            'card.pieces': '{n} pcs',

            'sets.title': 'Sets Collection — LEGO Manager',
            'sets.h1': 'Sets',
            'minifigs.title': 'Minifigures Collection — LEGO Manager',
            'minifigs.h1': 'Minifigures',

            'nav.navigation': 'Navigation',
            'nav.home': 'Back to Home',
            'nav.toMinifigs': 'Go to Minifigures',
            'nav.toSets': 'Go to Sets',
            'nav.legoCom': 'Visit LEGO.com',

            'header.exportShare': 'Export & Share',
            'header.addSet': '+ Add Set',
            'header.addMinifig': '+ Add Minifigure',
            'header.buy': '🛒 Buy',
            'header.settings': 'Settings',

            'filters.title': 'Filters',
            'filters.theme': 'Theme',
            'filters.allThemes': 'All Themes',
            'filters.status': 'Status',
            'filters.condition': 'Condition',
            'filters.yearRange': 'Year Range',
            'filters.min': 'Min',
            'filters.max': 'Max',
            'filters.clear': 'Clear Filters',

            'toolbar.searchSets': 'Search by name, set number, or notes...',
            'toolbar.searchMinifigs': 'Search by name, figure number, or notes...',
            'toolbar.sortBy': 'Sort:',
            'sort.name': 'Name',
            'sort.setNumber': 'Set Number',
            'sort.figureNumber': 'Figure Number',
            'sort.theme': 'Theme',
            'sort.year': 'Year',
            'sort.pieces': 'Piece Count',
            'sort.price': 'Price',
            'sort.dateAdded': 'Date Added',
            'toolbar.toggleSort': 'Toggle sort order',
            'toolbar.gridView': 'Grid view',
            'toolbar.listView': 'List view',

            'empty.sets': 'No sets found.',
            'empty.setsHint': 'Add your first set or try different filters.',
            'empty.minifigs': 'No minifigures found.',
            'empty.minifigsHint': 'Add your first minifigure or try different filters.',

            'pagination.first': 'First page',
            'pagination.prev': 'Previous',
            'pagination.next': 'Next',
            'pagination.last': 'Last page',
            'pagination.page': 'Page',
            'pagination.of': 'of',
            'pagination.itemsSuffix': 'items)',

            'footer.setsWord': 'sets',
            'footer.minifigsWord': 'minifigures',
            'footer.totalPieces': 'total pieces',
            'footer.value': 'Value:',

            'form.addSetTitle': 'Add Set',
            'form.editSetTitle': 'Edit Set',
            'form.addMinifigTitle': 'Add Minifigure',
            'form.editMinifigTitle': 'Edit Minifigure',
            'form.name': 'Name *',
            'form.nameSetPh': 'e.g., Millennium Falcon',
            'form.nameMinifigPh': 'e.g., Luke Skywalker',
            'form.setNumber': 'Set Number',
            'form.figureNumber': 'Figure Number',
            'form.numberSetPh': 'e.g., 75192',
            'form.numberMinifigPh': 'e.g., sw0999',
            'form.getImage': '📷 Get Image',
            'form.getImageTitle': 'Fetch official image from BrickLink',
            'form.getImageHintSet': 'Enter set number and click "Get Image" to fetch official photo',
            'form.getImageHintMinifig': 'Enter figure number and click "Get Image" to fetch official photo',
            'form.theme': 'Theme *',
            'form.themePh': 'e.g., Star Wars',
            'form.year': 'Year',
            'form.status': 'Status *',
            'form.pieceCount': 'Piece Count',
            'form.piecePh': 'e.g., 7541',
            'form.price': 'Price Paid ($)',
            'form.condition': 'Condition',
            'form.location': 'Location',
            'form.locationSetPh': 'e.g., Display shelf A',
            'form.locationMinifigPh': 'e.g., Minifig drawer 3',
            'form.notes': 'Notes',
            'form.notesPh': 'Additional notes...',
            'form.photo': 'Photo',
            'form.choosePhoto': '📷 Choose Photo',
            'form.noFile': 'No file chosen',
            'form.newImage': 'New image selected',
            'form.currentImage': 'Current image',
            'form.officialImage': 'Official image: {n}',
            'form.previewAlt': 'Preview',

            'delete.title': 'Confirm Delete',
            'delete.confirmSet': 'Are you sure you want to delete "{name}"?',
            'delete.warning': 'This action cannot be undone.',
            'delete.confirmPrefix': 'Are you sure you want to delete',

            'buy.buySets': '🛒 Buy Sets',
            'buy.buyMinifigs': '🛒 Buy Minifigures',
            'buy.legoOfficial': 'LEGO.com Official Store',
            'buy.itemTitle': 'Search for this item in stores',

            'export.title': '📤 Export & Share',
            'export.summary': '📊 Collection Summary',
            'export.totalItems': 'Total Items:',
            'export.totalValue': 'Total Value:',
            'export.themes': 'Themes:',
            'export.withImages': 'With Images:',
            'export.exportData': 'Export Data',
            'export.toCsv': 'Export to CSV',
            'export.csvDesc': 'Spreadsheet-compatible format',
            'export.toJson': 'Export to JSON',
            'export.jsonDesc': 'Full backup with metadata',
            'export.social': 'Social Sharing',
            'export.genCard': 'Generate Collection Card',
            'export.cardDesc': 'Beautiful image for social media',
            'export.genQr': 'Generate QR Code',
            'export.qrDesc': 'Share collection link',
            'export.importData': 'Import Data',
            'export.fromJson': 'Import from JSON',
            'export.importDesc': 'Restore from backup file',
            'export.publicSharing': 'Public Sharing',
            'export.genPublicLink': 'Generate Public Link',
            'export.publicDesc': 'Create shareable collection URL',

            'cardPreview.title': '🎨 Your Collection Card',
            'cardPreview.generating': 'Generating collection card...',
            'cardPreview.download': '📥 Download Card',
            'cardPreview.shareTwitter': '🐦 Share on Twitter',
            'cardPreview.alt': 'Collection Card',

            'settings.title': '⚙️ Settings',
            'settings.appearance': 'Appearance',
            'settings.darkMode': 'Dark Mode',
            'settings.darkModeDesc': 'Enable dark theme for the application',
            'settings.dataMgmt': 'Data Management',
            'settings.exportColl': 'Export Collection',
            'settings.exportCollDesc': 'Export your data to CSV or JSON',
            'settings.exportBtn': '📤 Export',
            'settings.importColl': 'Import Collection',
            'settings.importCollDesc': 'Import data from backup file',
            'settings.importBtn': '📥 Import',

            'msg.logoutConfirm': 'Do you want to log out?',
            'msg.logoutError': 'Logout error: ',
            'msg.loggedOut': 'Logged out successfully',
            'msg.loggedInAs': 'Logged in as {email} - click to log out',
            'msg.exportNotAvail': 'Export module not available',
            'msg.exportOpenError': 'Error opening export modal: ',
            'msg.setUpdated': 'Set updated successfully!',
            'msg.setAdded': 'Set added successfully!',
            'msg.setDeleted': 'Set deleted.',
            'msg.minifigUpdated': 'Minifigure updated successfully!',
            'msg.minifigAdded': 'Minifigure added successfully!',
            'msg.minifigDeleted': 'Minifigure deleted.',
            'msg.dupSetConfirm': '⚠️ A set with number "{n}" already exists. Save anyway?',
            'msg.dupMinifigConfirm': '⚠️ A minifigure with number "{n}" already exists. Save anyway?',
            'msg.selectImage': 'Please select an image file',
            'msg.imageTooBig': 'Image file must be smaller than 10MB',
            'msg.imageLarge': 'Image is large. Consider using a smaller image.',
            'msg.compressed': 'compressed',
            'msg.imageLoadError': 'Error loading image',
            'msg.imageReadError': 'Error reading image file',
            'msg.enterSetNumber': 'Please enter a set number first (e.g., 75192)',
            'msg.enterMinifigNumber': 'Please enter a figure number first (e.g., sw0999)',
            'msg.noOfficialImageSet': 'Could not find official image for set "{n}". Make sure the set number is correct. You can still upload your own photo manually.',
            'msg.noOfficialImageMinifig': 'Could not find official image for figure "{n}". Make sure the figure number is correct. You can still upload your own photo manually.',
            'msg.buyNotAvail': 'Buy Links feature not available',
            'msg.buyOpenError': 'Error opening Buy modal: ',
            'msg.fillAll': 'Please fill in all fields',
            'msg.passwordShort': 'Password must be at least 6 characters',
            'msg.regSuccess': 'Registration successful! Check console (F12) for verification code.',
            'msg.emailVerified': 'Email verified successfully! You are now logged in.',
            'msg.codeResent2': 'Verification code resent! Check console (F12).',
            'msg.enterNumberShortSet': '⚠️ Please enter a set number first.',
            'msg.enterNumberShortMinifig': '⚠️ Please enter a figure number first.',
            'msg.aivisionNotLoaded': 'AIVision module not loaded',
            'msg.notFoundSet': '⚠️ Set "{n}" not found in BrickSet database.',
            'msg.notFoundMinifig': '⚠️ Figure "{n}" not found in BrickSet database.',
            'msg.notFoundSetShort': 'Set {n} not found. Check the number and try again.',
            'msg.notFoundMinifigShort': 'Figure {n} not found. Check the number and try again.',
            'msg.fetching': '🔍 Fetching data from BrickSet...',
            'msg.downloadingImg': '🖼️ Downloading official image from BrickSet...',
            'msg.loadingEllipsis': 'Loading...',
            'msg.done': '✅ Done!',
            'msg.autofillFailed': 'Auto-Fill failed: ',
            'msg.exportCsvOk': 'Collection exported to CSV successfully!',
            'msg.exportCsvErr': 'Error exporting to CSV: ',
            'msg.exportJsonOk': 'Collection exported to JSON successfully!',
            'msg.exportJsonErr': 'Error exporting to JSON: ',
            'msg.cardErr': 'Error generating card: ',
            'msg.qrErr': 'Error generating QR code: ',
            'msg.importConfirm': 'This will import items and add them to your existing collection. Continue?',
            'msg.importing': 'Importing collection...',
            'msg.imported': 'Successfully imported {count} items!',
            'msg.importErr': 'Error importing: ',
            'msg.loginRequiredPublic': 'You must be logged in to create public links',
            'msg.publicLinkCopied': 'Public link copied to clipboard!',
            'msg.publicLinkErr': 'Error creating public link: ',
            'msg.qrDownloaded': 'QR code generated and downloaded!',
            'msg.cardDownloaded': 'Collection card downloaded!',
            'msg.storageMissing': 'Storage module not loaded. Please refresh the page and ensure you are logged in.',
            'msg.exportMissing': 'Export module not loaded. Please refresh the page.',
            'msg.loginToExport': 'Please log in to export your collection.',
            'msg.loginToCard': 'Please log in to generate collection cards.',
            'msg.modulesMissing': 'Required modules not loaded. Please refresh the page.',
            'msg.socialMissing': 'Social sharing module not loaded. Please refresh the page.',
            'msg.loginToImport': 'Please log in to import items.',
            'msg.exportModalNotFound': 'Export modal not found in the page',
            'msg.requiredModulesMissing': 'Required modules not available: {mods}. Please refresh the page and ensure you are logged in.',
            'msg.loginRequiredShort': 'Login required',
            'msg.na': 'N/A',
            'msg.errorShort': 'Error'
        }
    };

    function detectLang() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
        } catch (e) { /* localStorage niedostępny */ }
        return DEFAULT_LANG;
    }

    let current = detectLang();

    function get(key, vars) {
        const dict = translations[current] || translations[DEFAULT_LANG];
        let s = dict[key];
        if (s === undefined) s = translations[DEFAULT_LANG][key];
        if (s === undefined) return key; // brak tłumaczenia -> zwróć klucz (widoczny sygnał)
        if (vars) {
            for (const k in vars) {
                s = s.split('{' + k + '}').join(vars[k]);
            }
        }
        return s;
    }

    function apply(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach(function (el) {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = get(key);
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            el.setAttribute('placeholder', get(el.getAttribute('data-i18n-placeholder')));
        });
        scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            el.setAttribute('title', get(el.getAttribute('data-i18n-title')));
        });
        scope.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
            el.setAttribute('alt', get(el.getAttribute('data-i18n-alt')));
        });
        document.documentElement.setAttribute('lang', current);
    }

    function refreshSwitcher() {
        document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-lang-btn') === current);
        });
    }

    function setLang(lang) {
        if (SUPPORTED.indexOf(lang) === -1 || lang === current) {
            if (SUPPORTED.indexOf(lang) !== -1) return;
        }
        current = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        apply();
        refreshSwitcher();
        document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: lang } }));
    }

    function wireSwitcher() {
        document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
            b.addEventListener('click', function () {
                setLang(b.getAttribute('data-lang-btn'));
            });
        });
        refreshSwitcher();
    }

    function injectStyle() {
        if (document.getElementById('i18n-style')) return;
        const css =
            '.lang-switch{display:inline-flex;gap:2px;background:rgba(0,0,0,.3);border-radius:9px;padding:3px;' +
            'font:600 12px/1 system-ui,sans-serif;vertical-align:middle}' +
            '.lang-switch.is-floating{position:fixed;top:16px;left:16px;z-index:9999;' +
            'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);background:rgba(0,0,0,.35);' +
            'box-shadow:0 2px 8px rgba(0,0,0,.2)}' +
            '.lang-btn{border:none;background:transparent;color:#fff;padding:5px 9px;border-radius:7px;cursor:pointer;' +
            'opacity:.7;transition:opacity .15s}' +
            '.lang-btn:hover{opacity:1}' +
            '.lang-btn.active{background:#fff;color:#111;opacity:1}';
        const style = document.createElement('style');
        style.id = 'i18n-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function init() {
        injectStyle();
        apply();
        wireSwitcher();
    }

    window.I18N = {
        get lang() { return current; },
        t: get,
        apply: apply,
        setLang: setLang,
        supported: SUPPORTED
    };

    // Skrót globalny: t('key', {vars})
    window.t = function (k, v) { return window.I18N ? window.I18N.t(k, v) : k; };

    document.documentElement.setAttribute('lang', current);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
