// js/api-core.js
export const APICore = {
    // 🌍 Render Map with Resize Fix
    renderMap(containerId, speciesName) {
        const container = document.getElementById(containerId);
        container.innerHTML = "<div id='nexusMap' class='w-full h-80 rounded-xl z-10'></div>";

        setTimeout(() => {
            const map = L.map('nexusMap').setView([20.5937, 78.9629], 3);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CARTO'
            }).addTo(map);

            fetch(`https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(speciesName)}&limit=150&hasCoordinate=true`)
                .then(res => res.json())
                .then(data => {
                    data.results.forEach(obs => {
                        if(obs.decimalLatitude) {
                            L.circleMarker([obs.decimalLatitude, obs.decimalLongitude], {
                                color: '#34d399', radius: 4, fillOpacity: 0.6, weight: 1, stroke: false
                            }).addTo(map);
                        }
                    });
                    // Critical: Force Leaflet to recalculate size inside drawer
                    setTimeout(() => map.invalidateSize(), 400);
                });
        }, 400); 
    },

    // 📚 Literature: Fetching 40+ Papers
    async fetchLiterature(sciName) {
        let papers = [];
        const query = encodeURIComponent(sciName);
        try {
            // Increased page size to 30 for both APIs
            const alexPromise = fetch(`https://api.openalex.org/works?search=${query}&per-page=30&filter=has_doi:true`).then(r => r.json());
            const pmcPromise = fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${query}&format=json&pageSize=30`).then(r => r.json());

            const [alexRes, pmcRes] = await Promise.allSettled([alexPromise, pmcPromise]);

            if (pmcRes.status === 'fulfilled' && pmcRes.value.resultList?.result) {
                pmcRes.value.resultList.result.forEach(p => {
                    papers.push({
                        title: p.title, author: p.authorString || "Various", year: p.pubYear,
                        source: "PubMed", link: `https://europepmc.org/article/${p.source}/${p.id}`, color: "text-blue-400 border-blue-500"
                    });
                });
            }
            if (alexRes.status === 'fulfilled' && alexRes.value.results) {
                alexRes.value.results.forEach(p => {
                    let link = p.open_access?.oa_url || p.doi;
                    if(link) {
                        papers.push({
                            title: p.title, author: p.authorships?.[0]?.author?.display_name || "Various", 
                            year: p.publication_year, source: "OpenAlex", link: link, color: "text-purple-400 border-purple-500"
                        });
                    }
                });
            }
        } catch(e) { console.error("Lit error"); }
        return papers.sort((a, b) => (b.year || 0) - (a.year || 0)); // Sort newest first
    },

    // (Keep your fetchAudio and fetchInfo as they were...)
};