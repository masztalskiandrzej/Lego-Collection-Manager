/**
 * Firebase Configuration (Compat Version - works with file:// protocol)
 *
 * INSTRUKCJA KONFIGURACJI:
 * 1. Wejdź na https://console.firebase.google.com
 * 2. Utwórz nowy projekt (lub użyj istniejącego)
 * 3. W Project Settings > General, skopiuj firebaseConfig
 * 4. Zastąp poniższe wartości "YOUR_..." swoimi danymi z Firebase Console
 *
 * WYMAGANE USŁUGI FIREBASE:
 * - Authentication (włącz Email/Password provider)
 * - Firestore Database (utwórz bazę w trybie produkcyjnym)
 */

// Firebase Configuration (connected to your project)
const firebaseConfig = {
    apiKey: "AIzaSyAZuxceyXMyjEFV0VvvcpnbBIj83JUTBe0",
    authDomain: "collectionmanager-database.firebaseapp.com",
    projectId: "collectionmanager-database",
    storageBucket: "collectionmanager-database.firebasestorage.app",
    messagingSenderId: "921942220912",
    appId: "1:921942220912:web:86bb6aa57ad256a55714b5",
    measurementId: "G-4RGEWE46BP"
};

// Initialize Firebase (using compat SDK loaded in HTML)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseFunctions = null;

function initFirebase() {
    if (typeof firebase === 'undefined') {
        return false;
    }

    try {
        // Check if already initialized
        if (firebase.apps.length === 0) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
        } else {
            firebaseApp = firebase.app();
        }

        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();

        // Initialize Firebase Functions (if SDK loaded)
        if (typeof firebase.functions === 'function') {
            // Use Europe region (same as Cloud Functions deployment)
            firebaseFunctions = firebase.app().functions('europe-west1');
        } else {
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Make available globally
window.firebaseConfig = firebaseConfig;
window.initFirebase = initFirebase;
window.getFirebaseAuth = function() { return firebaseAuth; };
window.getFirebaseDb = function() { return firebaseDb; };
window.getFirebaseFunctions = function() { return firebaseFunctions; };

