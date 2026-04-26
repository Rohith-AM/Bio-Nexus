// js/app.js
import { DrawerSystem } from './ui-drawer.js';
import { CommandPalette } from './command-palette.js';
import { Autocomplete } from './autocomplete.js'; // Import new module

document.addEventListener('DOMContentLoaded', () => {
    CommandPalette.init(DrawerSystem);
    
    // Trigger main search function
    const performSearch = async (query) => {
        const searchInput = document.getElementById('globalSearch');
        searchInput.value = query;
        searchInput.blur();
        
        // UI Transitions
        document.getElementById('welcomeScreen').classList.add('opacity-0', '-translate-y-10', 'pointer-events-none');
        document.getElementById('searchContainer').classList.remove('top-1/2', '-translate-y-1/2');
        document.getElementById('searchContainer').classList.add('bottom-0', 'translate-y-16');
        
        document.getElementById('coreNodeContainer').classList.remove('hidden');
        document.getElementById('coreNodeContainer').classList.add('flex');
        document.getElementById('nodeTitle').innerHTML = `<span class="text-indigo-400 text-sm animate-pulse">Scanning Biosphere...</span>`;
        
        try {
            const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&limit=1`);
            const data = await res.json();
            
            if(data.results && data.results.length > 0) {
                const taxon = data.results[0];
                const sciName = taxon.name;
                const commonName = taxon.preferred_common_name || sciName;
                const photoUrl = taxon.default_photo ? taxon.default_photo.medium_url : null;
                
                // IMPORTANT: Update state before showing buttons
                DrawerSystem.currentSpecies = sciName; 
                DrawerSystem.isBird = (taxon.iconic_taxon_name === 'Aves');
                
                document.getElementById('nodeTitle').innerHTML = `${commonName} <br> <span class="text-emerald-400 font-normal italic text-xs">${sciName}</span>`;
                
                const imgTag = document.getElementById('nodeImage');
                const iconSpan = document.getElementById('nodeIcon');
                if(photoUrl) {
                    imgTag.src = photoUrl; imgTag.classList.remove('hidden'); iconSpan.classList.add('hidden');
                } else {
                    imgTag.classList.add('hidden'); iconSpan.classList.remove('hidden'); iconSpan.innerText = "🦠";
                }

                // Show orbital nodes
                setTimeout(() => {
                    document.getElementById('orbitalNodes').classList.remove('hidden');
                    document.getElementById('orbitalNodes').classList.add('block');
                }, 500);
            }
        } catch(err) { console.error(err); }
    };

    // Initialize Autocomplete with our search function
    Autocomplete.init(performSearch);

    // Enter key search
    document.getElementById('globalSearch').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });

    // Wire up Drawer buttons
    document.getElementById('btnMap').addEventListener('click', () => DrawerSystem.open('map'));
    document.getElementById('btnAudio').addEventListener('click', () => DrawerSystem.open('audio'));
    document.getElementById('btnInfo').addEventListener('click', () => DrawerSystem.open('info'));
    document.getElementById('btnLit').addEventListener('click', () => DrawerSystem.open('literature'));
    document.getElementById('btnCloseDrawer').addEventListener('click', () => DrawerSystem.close());
});