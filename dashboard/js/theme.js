// public/js/theme.js
// Handles Light / Dark mode toggling and saves preference to localStorage.

const THEME_KEY = 'upbs_theme';

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    // Default to dark mode if no saved theme
    const theme = savedTheme === 'light' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeIcon(newTheme);
    
    // Fire a custom event so map.js knows to swap the tile layer
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        // Show Moon in light mode (to click and go dark)
        // Show Sun in dark mode (to click and go light)
        btn.textContent = theme === 'light' ? '🌙' : '☀️';
        btn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    }
}

// Run immediately to prevent flash of wrong theme
initTheme();

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
});
