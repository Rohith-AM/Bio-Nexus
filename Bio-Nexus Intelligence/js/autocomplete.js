// js/autocomplete.js
export const Autocomplete = {
    timer: null,
    activeIndex: -1,
    items: [],
    
    init(onSelect) {
        const input = document.getElementById('globalSearch');
        const box = document.getElementById('searchSuggestions');

        const renderResults = (results) => {
            this.items = results;
            box.innerHTML = '';
            this.activeIndex = -1;

            if (!results.length) {
                box.classList.add('hidden');
                return;
            }

            box.classList.remove('hidden');
            results.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = "p-3 border-b border-slate-800 hover:bg-indigo-500/20 cursor-pointer flex gap-3 items-center transition-colors group";
                div.dataset.index = index;

                const common = item.preferred_common_name || item.name;
                const sci = item.name;
                const photo = item.default_photo?.medium_url || item.default_photo?.square_url || '';

                div.innerHTML = `
                    <div class="w-14 h-14 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                        ${photo ? `<img src="${photo}" class="w-full h-full object-cover" alt="${common}">` : `<div class="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">No image</div>`}
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-200 truncate capitalize group-hover:text-indigo-300">${common}</p>
                        <p class="text-[10px] text-slate-400 italic truncate">${sci}</p>
                        <span class="inline-flex mt-1 px-2 py-0.5 rounded bg-slate-800 text-[9px] uppercase tracking-wider text-slate-400">${item.rank}</span>
                    </div>
                `;

                div.addEventListener('mouseenter', () => this.highlight(index));
                div.addEventListener('mouseleave', () => this.unhighlight(index));
                div.addEventListener('click', () => {
                    input.value = sci;
                    box.classList.add('hidden');
                    onSelect(sci);
                });

                box.appendChild(div);
            });
        };

        const fetchSuggestions = async (query) => {
            if (!query || query.length < 3) {
                box.classList.add('hidden');
                return;
            }

            try {
                const res = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&limit=6`);
                const data = await res.json();
                renderResults(data.results || []);
            } catch (e) {
                console.warn("Autocomplete error", e);
                box.classList.add('hidden');
            }
        };

        input.addEventListener('input', () => {
            clearTimeout(this.timer);
            const query = input.value.trim();
            this.timer = setTimeout(() => fetchSuggestions(query), 250);
        });

        input.addEventListener('keydown', (e) => {
            if (box.classList.contains('hidden')) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.activeIndex = Math.min(this.activeIndex + 1, this.items.length - 1);
                this.updateActiveItem(box);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.activeIndex = Math.max(this.activeIndex - 1, 0);
                this.updateActiveItem(box);
            } else if (e.key === 'Enter' && this.activeIndex >= 0) {
                e.preventDefault();
                const selected = this.items[this.activeIndex];
                if (selected) {
                    input.value = selected.name;
                    box.classList.add('hidden');
                    onSelect(selected.name);
                }
            } else if (e.key === 'Escape') {
                box.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!box.contains(e.target) && e.target !== input) {
                box.classList.add('hidden');
            }
        });
    },

    highlight(index) {
        this.activeIndex = index;
        const box = document.getElementById('searchSuggestions');
        if (box) this.updateActiveItem(box);
    },

    unhighlight(index) {
        if (this.activeIndex === index) {
            this.activeIndex = -1;
            const box = document.getElementById('searchSuggestions');
            if (box) this.updateActiveItem(box);
        }
    },

    updateActiveItem(box) {
        const children = Array.from(box.children);
        children.forEach((child, index) => {
            if (index === this.activeIndex) {
                child.classList.add('bg-indigo-500/30');
                child.classList.remove('hover:bg-indigo-500/20');
                child.scrollIntoView({ block: 'nearest' });
            } else {
                child.classList.remove('bg-indigo-500/30');
                child.classList.add('hover:bg-indigo-500/20');
            }
        });
    }
};