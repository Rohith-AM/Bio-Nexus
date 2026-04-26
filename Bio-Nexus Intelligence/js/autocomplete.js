// js/autocomplete.js
export const Autocomplete = {
    timer: null,
    
    init(onSelect) {
        const input = document.getElementById('globalSearch');
        const box = document.getElementById('searchSuggestions');

        input.addEventListener('input', () => {
            clearTimeout(this.timer);
            const query = input.value.trim();

            if (query.length < 3) {
                box.classList.add('hidden');
                return;
            }

            this.timer = setTimeout(async () => {
                try {
                    const res = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&limit=6`);
                    const data = await res.json();
                    
                    box.innerHTML = '';
                    if (data.results && data.results.length > 0) {
                        box.classList.remove('hidden');
                        data.results.forEach(item => {
                            const div = document.createElement('div');
                            div.className = "p-4 border-b border-slate-800 hover:bg-indigo-500/20 cursor-pointer flex justify-between items-center transition-colors group";
                            
                            const common = item.preferred_common_name || "";
                            const sci = item.name;
                            
                            div.innerHTML = `
                                <div>
                                    <p class="text-sm font-bold text-slate-200 capitalize group-hover:text-indigo-300">${common}</p>
                                    <p class="text-[10px] text-slate-500 italic">${sci}</p>
                                </div>
                                <span class="text-[9px] bg-slate-800 px-2 py-1 rounded text-slate-400 uppercase tracking-tighter">${item.rank}</span>
                            `;
                            
                            div.onclick = () => {
                                input.value = sci;
                                box.classList.add('hidden');
                                onSelect(sci); // Trigger search
                            };
                            box.appendChild(div);
                        });
                    } else {
                        box.classList.add('hidden');
                    }
                } catch(e) { console.warn("Autocomplete error"); }
            }, 300);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!box.contains(e.target) && e.target !== input) box.classList.add('hidden');
        });
    }
};