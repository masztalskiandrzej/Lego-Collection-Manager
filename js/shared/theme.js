/**
 * Theme Module - Dark Mode Management
 * Handles theme switching, persistence, and system preference detection
 */
const Theme = {
    STORAGE_KEY: 'lego-theme-preference',
    THEMES: { LIGHT: 'light', DARK: 'dark', SYSTEM: 'system' },

    currentTheme: 'light',
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)'),

    /**
     * Initialize theme module
     */
    init() {
        console.log('🎨 Theme module initializing...');

        // Load saved preference or use system default
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved && (saved === 'light' || saved === 'dark')) {
            this.setTheme(saved);
        } else {
            // Use system preference
            this.setTheme(this.prefersDark.matches ? 'dark' : 'light');
        }

        // Listen for system preference changes
        this.prefersDark.addEventListener('change', (e) => {
            // Only auto-switch if no manual preference was set
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.applyTheme(e.matches ? 'dark' : 'light');
                this.updateToggleIcon();
            }
        });

        console.log('🎨 Theme module initialized:', this.currentTheme);
    },

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        console.log('🎨 Theme toggled to:', newTheme);
    },

    /**
     * Set specific theme
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.applyTheme(theme);
        this.updateToggleIcon();
    },

    /**
     * Apply theme to document
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Also add class to body for additional styling hooks
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    },

    /**
     * Update toggle button icon
     */
    updateToggleIcon() {
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            const icon = this.currentTheme === 'dark' ? '☀️' : '🌙';
            btn.textContent = icon;
            btn.title = this.currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    },

    /**
     * Check if dark mode is active
     * @returns {boolean}
     */
    isDark() {
        return this.currentTheme === 'dark';
    },

    /**
     * Get current theme
     * @returns {string} 'light' or 'dark'
     */
    getTheme() {
        return this.currentTheme;
    }
};

// Make globally available
window.Theme = Theme;

console.log('🎨 Theme module loaded');
