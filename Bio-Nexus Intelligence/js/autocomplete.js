// js/autocomplete.js — Bio-Nexus Intelligence Autocomplete
// Direct iNaturalist taxa autocomplete with photo previews & keyboard navigation

export const Autocomplete = {
    bind(inputId, boxId, onSelect) {
        const input = document.getElementById(inputId);
        const box = document.getElementById(boxId);
        if (!input || !box) return;

        let timer = null;
        let activeIndex = -1;
        let items = [];

        const closeBox = () => {
            box.classList.add('hidden');
            box.innerHTML = '';
            activeIndex = -1;
            items = [];
        };

        const highlight = () => {
            Array.from(box.children).forEach((child, i) => {
                child.classList.toggle('active', i === activeIndex);
                if (i === activeIndex) child.scrollIntoView({ block: 'nearest' });
            });
        };

        const selectItem = (item) => {
            if (!item) return;
            input.value = item.name;
            closeBox();
            const commonName = item.preferred_common_name || item.name;
            if (onSelect) onSelect(item.name, commonName);
        };

        const render = (results) => {
            items = results;
            activeIndex = -1;
            box.innerHTML = '';

            if (!results.length) {
                closeBox();
                return;
            }

            box.classList.remove('hidden');

            results.forEach((item, index) => {
                const common = item.preferred_common_name || item.name;
                const sci = item.name;
                const photo = item.default_photo?.square_url || item.default_photo?.medium_url || '';

                const div = document.createElement('div');
                div.className = 'ni-suggestion';
                div.innerHTML = `
                    ${photo
                        ? `<img class="ni-sug-photo" src="${photo}" alt="${common}" loading="lazy">`
                        : `<div class="ni-sug-nophoto">🧬</div>`
                    }
                    <div class="ni-sug-text">
                        <div class="ni-sug-common">${common}</div>
                        <div class="ni-sug-sci">${sci}</div>
                    </div>
                    <span class="ni-sug-rank">${item.rank || 'taxon'}</span>
                `;

                div.addEventListener('mouseenter', () => {
                    activeIndex = index;
                    highlight();
                });

                div.addEventListener('click', () => selectItem(item));

                box.appendChild(div);
            });
        };

        const fetchSuggestions = async (query) => {
            try {
                const res = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&limit=7`);
                const data = await res.json();
                render(data.results || []);
            } catch (_) {
                closeBox();
            }
        };

        input.addEventListener('input', () => {
            const q = input.value.trim();
            clearTimeout(timer);
            if (q.length < 2) {
                closeBox();
                return;
            }
            timer = setTimeout(() => fetchSuggestions(q), 250);
        });

        input.addEventListener('keydown', e => {
            if (box.classList.contains('hidden')) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                highlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                highlight();
            } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                selectItem(items[activeIndex]);
            } else if (e.key === 'Escape') {
                closeBox();
            }
        });

        document.addEventListener('click', e => {
            if (!box.contains(e.target) && e.target !== input) {
                closeBox();
            }
        });
    },

    init(onSelect) {
        this.bind('searchInput', 'suggestions', onSelect);
        this.bind('inlineSearchInput', 'inlineSuggestions', onSelect);
    }
};