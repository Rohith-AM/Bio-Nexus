// js/ui-drawer.js
import { APICore } from './api-core.js';

export const DrawerSystem = {
    isOpen: false,
    currentSpecies: "",
    isBird: false,
    
    async open(moduleName) {
        const drawer = document.getElementById('sideDrawer');
        const wrapper = document.getElementById('mainWrapper'); // The Shift Container
        const content = document.getElementById('drawerContent');
        const title = document.getElementById('drawerTitle');
        
        this.isOpen = true;
        
        // SPLIT VIEW: Drawer open aagumbodhu main content-ah left-la move panrom
        drawer.classList.remove('translate-x-full');
        if(wrapper) wrapper.classList.add('md:-translate-x-[250px]'); // Half the drawer width shift
        
        // Title formatting
        title.innerText = moduleName.replace('-', ' ') + " Intelligence";
        
        // Initial Loading State
        content.innerHTML = `<div class="flex flex-col items-center justify-center h-40"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div><div class="text-indigo-400 font-mono text-sm animate-pulse">Querying Global Databases...</div></div>`;
        
        // 1. MAP LOGIC
        if(moduleName === 'map') {
            content.innerHTML = `<div id="mapContainer" class="w-full bg-slate-800 rounded-xl border border-slate-700 shadow-inner"></div>`;
            APICore.renderMap('mapContainer', this.currentSpecies);
            
        // 2. AUDIO LOGIC
        } else if(moduleName === 'audio') {
            const audios = await APICore.fetchAudio(this.currentSpecies, this.isBird);
            content.innerHTML = ''; 
            if(audios.length === 0) {
                content.innerHTML = `<div class="text-center mt-10"><span class="text-4xl mb-3 block opacity-50">🔕</span><p class="text-slate-400 text-sm">No acoustic signatures recorded.</p></div>`;
                return;
            }
            audios.forEach(rec => {
                content.innerHTML += `<div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-3 shadow-inner"><div class="flex justify-between items-center mb-3"><p class="text-slate-200 font-bold text-sm truncate pr-2 capitalize">${rec.title}</p><span class="text-[10px] ${rec.color} bg-slate-900 border border-slate-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">${rec.source}</span></div><audio controls class="w-full h-8 outline-none rounded"><source src="${rec.file}"></audio></div>`;
            });

        // 3. TAXA & INFO LOGIC (NEW)
        } else if(moduleName === 'info') {
            const data = await APICore.fetchInfo(this.currentSpecies);
            content.innerHTML = '';

            if (data.image) {
                content.innerHTML += `
                    <div class="mb-6 rounded-3xl overflow-hidden border border-slate-700 shadow-inner bg-slate-900">
                        <img src="${data.image}" alt="${data.commonName || data.speciesName || this.currentSpecies}" class="w-full h-56 object-cover">
                    </div>
                `;
            }

            if (data.taxa && data.taxa.length > 0) {
                const rankStyle = (rank) => {
                    const styles = {
                        kingdom: 'text-purple-300 border-purple-400 bg-purple-950/30',
                        phylum: 'text-sky-300 border-sky-400 bg-sky-950/30',
                        class: 'text-cyan-300 border-cyan-400 bg-cyan-950/30',
                        order: 'text-emerald-300 border-emerald-400 bg-emerald-950/30',
                        family: 'text-amber-300 border-amber-400 bg-amber-950/30',
                        genus: 'text-orange-300 border-orange-400 bg-orange-950/30',
                        species: 'text-fuchsia-300 border-fuchsia-400 bg-fuchsia-950/30 italic',
                        subspecies: 'text-pink-300 border-pink-400 bg-pink-950/30 italic',
                        variety: 'text-lime-300 border-lime-400 bg-lime-950/30',
                        form: 'text-slate-300 border-slate-500 bg-slate-950/30',
                        unknown: 'text-slate-300 border-slate-600 bg-slate-950/30'
                    };
                    return styles[rank] || styles.unknown;
                };

                let taxaHtml = `<div class="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 shadow-inner"><h3 class="text-sm font-bold text-blue-400 mb-3 border-b border-slate-700 pb-2">Evolutionary Lineage</h3><div class="flex flex-wrap gap-2 text-xs font-mono">`;
                data.taxa.forEach((t, i) => {
                    const commonLabel = t.commonName ? `<br><span class="text-[10px] text-slate-400 italic">${t.commonName}</span>` : '';
                    const style = rankStyle(t.rank);
                    taxaHtml += `<span class="px-3 py-2 rounded-2xl border ${style} group relative cursor-help min-w-[110px]">`;
                    taxaHtml += `<span class="block text-[10px] uppercase tracking-[0.18em] text-slate-400">${t.rank}</span>`;
                    taxaHtml += `<span class="block font-semibold text-sm mt-1 ${t.rank === 'species' ? 'italic' : ''}">${t.name}</span>`;
                    if (commonLabel) taxaHtml += `<span class="block mt-1 text-[10px] text-slate-400 italic">${t.commonName}</span>`;
                    taxaHtml += `</span>`;
                    if(i < data.taxa.length - 1) taxaHtml += `<span class="text-slate-600 mt-1">▶</span>`;
                });
                taxaHtml += `</div></div>`;
                content.innerHTML += taxaHtml;
            } else {
                content.innerHTML += `<div class="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 shadow-inner text-slate-400 text-sm">Taxonomic lineage not available for this entry.</div>`;
            }

            content.innerHTML += `
                <div class="p-5 bg-slate-800/50 rounded-xl border-l-4 border-yellow-500 shadow-inner">
                    <h3 class="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2">Wikipedia Abstract</h3>
                    <p class="text-slate-300 text-sm leading-relaxed">${data.summary || 'Summary not available for this entity.'}</p>
                </div>
            `;

            if (data.eolUrl) {
                content.innerHTML += `
                    <div class="mt-4 p-4 bg-slate-800/60 rounded-xl border border-green-500 shadow-inner">
                        <h3 class="text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Encyclopedia of Life</h3>
                        <a href="${data.eolUrl}" target="_blank" class="inline-flex items-center gap-2 text-sm font-semibold text-green-200 hover:text-white bg-slate-900/70 px-4 py-3 rounded-xl border border-green-600 transition">Open EoL Page</a>
                    </div>
                `;
            }

        // 4. LITERATURE LOGIC (NEW)
        } else if(moduleName === 'literature') {
            const papers = await APICore.fetchLiterature(this.currentSpecies);
            content.innerHTML = '';
            
            if(!papers || papers.length === 0) {
                content.innerHTML = `<div class="text-center mt-10"><span class="text-4xl mb-3 block opacity-50">📚</span><p class="text-slate-400 text-sm">No open-access literature found.</p></div>`;
                return;
            }

            papers.forEach(p => {
                content.innerHTML += `
                    <a href="${p.link}" target="_blank" class="block p-4 bg-slate-800/40 rounded-xl border border-slate-700 mb-3 shadow-inner hover:-translate-y-1 hover:border-purple-500/50 transition-all group cursor-pointer">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-700 bg-slate-900 ${p.color}">${p.source}</span>
                            <span class="text-xs text-slate-400 font-mono">${p.year || 'N/A'}</span>
                        </div>
                        <h4 class="font-bold text-slate-200 text-sm mb-2 leading-relaxed group-hover:text-purple-300 transition-colors">${p.title}</h4>
                        <p class="text-xs text-slate-400 italic">✍️ ${p.author}</p>
                    </a>
                `;
            });
        }
    },

    close() {
        const drawer = document.getElementById('sideDrawer');
        const wrapper = document.getElementById('mainWrapper');
        
        this.isOpen = false;
        drawer.classList.add('translate-x-full');
        if(wrapper) wrapper.classList.remove('md:-translate-x-[250px]'); // Reset shift
        
        // Clean up content after animation completes
        setTimeout(() => { document.getElementById('drawerContent').innerHTML = ''; }, 500);
    }
};