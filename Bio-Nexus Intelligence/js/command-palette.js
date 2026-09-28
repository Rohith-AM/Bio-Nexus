// command-palette.js — Alt+K now just focuses the search bar
// No longer a modal overlay. Kept for keyboard shortcut only.
export const CommandPalette = {
    init() {
        document.addEventListener('keydown', e => {
            if (e.altKey && e.key === 'k') {
                e.preventDefault();
                const searchSection = document.getElementById('searchSection');
                const resultsSection = document.getElementById('resultsSection');
                if (resultsSection && !resultsSection.classList.contains('hidden')) {
                    // If on results, click "New Search" to go back
                    document.getElementById('newSearchBtn')?.click();
                } else {
                    document.getElementById('searchInput')?.focus();
                }
            }
        });
    }
};