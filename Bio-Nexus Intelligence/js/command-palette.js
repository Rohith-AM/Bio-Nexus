// js/command-palette.js
export const CommandPalette = {
    init(uiController) {
        const overlay = document.getElementById('cmdOverlay');
        const input = document.getElementById('cmdInput');
        const cmdBtn = document.getElementById('cmdBtn');

        const togglePalette = () => {
            if (overlay.classList.contains('hidden')) {
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
                input.focus();
            } else {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
                input.value = '';
            }
        };

        cmdBtn.addEventListener('click', togglePalette);

        // Changed from Ctrl to Alt to prevent browser conflicts
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'k') {
                e.preventDefault(); // Stop default browser actions
                togglePalette();
            }
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                togglePalette();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = input.value.toLowerCase().trim();
                if (val === 'map' || val === 'audio') {
                    togglePalette(); 
                    uiController.open(val); 
                } else {
                    input.value = "Command not recognized...";
                    setTimeout(() => input.value = "", 1000);
                }
            }
        });
    }
};