/**
 * Image Handler Module - Firebase Storage Upload
 *
 * Obsługuje:
 * - Walidację plików obrazów
 * - Upload do Firebase Storage
 * - Usuwanie obrazów
 * - Generowanie preview
 * - Opcjonalną kompresję
 */

import { storage } from './firebase-config.js';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const ImageHandler = {
    // Maksymalny rozmiar pliku: 5MB
    MAX_SIZE: 5 * 1024 * 1024,

    // Dozwolone typy plików
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],

    /**
     * Walidacja pliku obrazu
     * @param {File} file - Plik do walidacji
     * @returns {{valid: boolean, error: string|null}}
     */
    validateFile(file) {
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }

        // Sprawdź typ pliku
        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type. Allowed: JPG, PNG, WebP, GIF.\nYour file: ${file.type}`
            };
        }

        // Sprawdź rozmiar
        if (file.size > this.MAX_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            return {
                valid: false,
                error: `File too large (${sizeMB}MB). Maximum size is 5MB.`
            };
        }

        return { valid: true, error: null };
    },

    /**
     * Upload obrazu do Firebase Storage
     * @param {File} file - Plik obrazu
     * @param {string} collectionType - Typ kolekcji ('legoCollection', 'booksCollection', 'gamesCollection')
     * @param {string} itemId - ID przedmiotu
     * @param {string} userId - ID użytkownika
     * @returns {Promise<string>} - URL do pobranego obrazu
     */
    async uploadImage(file, collectionType, itemId, userId) {
        console.log('📤 Uploading image...', { file: file.name, size: file.size, type: file.type });

        // Walidacja
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Sprawdź czy użytkownik jest zalogowany
        if (!userId) {
            throw new Error('User not authenticated');
        }

        try {
            // Określ rozszerzenie pliku
            const ext = file.name.split('.').pop() || 'jpg';

            // Ścieżka w Storage: users/{userId}/{collectionType}/{itemId}.{ext}
            const shortCollection = collectionType.replace('Collection', ''); // 'lego', 'books', 'games'
            const fileName = `${itemId}.${ext}`;
            const storagePath = `users/${userId}/${shortCollection}/${fileName}`;

            console.log('📁 Storage path:', storagePath);

            // Utwórz referencję do Storage
            const storageRef = ref(storage, storagePath);

            // Metadata dla lepszej obsługi
            const metadata = {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000', // Cache 1 rok
                customMetadata: {
                    uploadedAt: new Date().toISOString(),
                    originalName: file.name,
                    itemId: itemId
                }
            };

            // Upload pliku
            console.log('⏳ Uploading to Firebase Storage...');
            const snapshot = await uploadBytes(storageRef, file, metadata);

            console.log('✅ Upload complete!', snapshot.metadata.fullPath);

            // Pobierz publiczny URL
            const downloadURL = await getDownloadURL(snapshot.ref);

            console.log('🔗 Download URL:', downloadURL);

            return downloadURL;
        } catch (error) {
            console.error('❌ Upload error:', error);

            // Przyjazne komunikaty błędów
            if (error.code === 'storage/unauthorized') {
                throw new Error('Not authorized to upload images. Please log in again.');
            } else if (error.code === 'storage/canceled') {
                throw new Error('Upload canceled.');
            } else if (error.code === 'storage/unknown') {
                throw new Error('Upload failed. Check your internet connection.');
            } else {
                throw new Error('Failed to upload image: ' + error.message);
            }
        }
    },

    /**
     * Usuń obraz z Firebase Storage
     * @param {string} imageUrl - URL obrazu do usunięcia
     * @returns {Promise<void>}
     */
    async deleteImage(imageUrl) {
        if (!imageUrl || !imageUrl.includes('firebasestorage')) {
            console.log('ℹ️ Not a Firebase Storage URL, skipping delete');
            return;
        }

        try {
            console.log('🗑️ Deleting image:', imageUrl);

            // Wyciągnij ścieżkę z URL
            // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
            const url = new URL(imageUrl);
            const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

            if (pathMatch) {
                const storagePath = decodeURIComponent(pathMatch[1]);
                console.log('📁 Extracted path:', storagePath);

                const storageRef = ref(storage, storagePath);
                await deleteObject(storageRef);

                console.log('✅ Image deleted successfully');
            } else {
                console.warn('⚠️ Could not extract storage path from URL');
            }
        } catch (error) {
            // Nie rzucaj błędu - usuwanie obrazu nie jest krytyczne
            console.error('❌ Delete error (non-critical):', error);

            if (error.code === 'storage/object-not-found') {
                console.log('ℹ️ Image already deleted or does not exist');
            }
        }
    },

    /**
     * Utwórz preview obrazu (data URL)
     * @param {File} file - Plik obrazu
     * @returns {Promise<string>} - Data URL do wyświetlenia preview
     */
    async createPreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file for preview'));
            };

            reader.readAsDataURL(file);
        });
    },

    /**
     * Kompresja obrazu (opcjonalnie, dla dużych plików)
     * @param {File} file - Oryginalny plik
     * @param {number} maxWidth - Maksymalna szerokość (px)
     * @param {number} maxHeight - Maksymalna wysokość (px)
     * @param {number} quality - Jakość kompresji (0-1)
     * @returns {Promise<Blob>} - Skompresowany obraz jako Blob
     */
    async compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Oblicz nowe wymiary zachowując proporcje
                if (width > height) {
                    if (width > maxWidth) {
                        height = height * (maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = width * (maxHeight / height);
                        height = maxHeight;
                    }
                }

                // Ustaw rozmiar canvas
                canvas.width = width;
                canvas.height = height;

                // Narysuj i skompresuj
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            console.log(`🗜️ Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB`);
                            resolve(blob);
                        } else {
                            reject(new Error('Compression failed'));
                        }
                    },
                    file.type,
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error('Failed to load image for compression'));
            };

            // Załaduj obraz z pliku
            img.src = URL.createObjectURL(file);
        });
    },

    /**
     * Format rozmiaru pliku dla wyświetlenia
     * @param {number} bytes - Rozmiar w bajtach
     * @returns {string} - Sformatowany string (np. "2.5 MB")
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

export default ImageHandler;
