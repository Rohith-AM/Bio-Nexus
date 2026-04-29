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

    // � Audio: Xeno-canto fallback to iNaturalist sounds
    async fetchAudio(sciName, isBird = false) {
        if (!sciName) return [];

        let records = [];
        const encodedName = encodeURIComponent(sciName);

        try {
            const xenoUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.xeno-canto.org/api/2/recordings?query=${encodedName}`)}`;
            const xenoRes = await fetch(xenoUrl);
            const xenoData = await xenoRes.json();

            if (xenoData.recordings && xenoData.recordings.length > 0) {
                records = xenoData.recordings.slice(0, 4).map(rec => ({
                    title: rec.en || sciName,
                    source: 'Xeno-canto',
                    file: rec.file,
                    color: 'text-orange-400 border-orange-500'
                }));
            }
        } catch (e) {
            console.warn('Xeno-canto fetch failed', e);
        }

        if (records.length === 0) {
            try {
                const iNatUrl = `https://api.inaturalist.org/v1/observations?taxon_name=${encodedName}&has[]=sounds&per_page=5`;
                const iNatRes = await fetch(iNatUrl);
                const iNatData = await iNatRes.json();

                (iNatData.results || []).forEach(obs => {
                    if (obs.sounds && obs.sounds.length > 0 && obs.sounds[0].file_url) {
                        records.push({
                            title: obs.species_guess || sciName,
                            source: 'iNaturalist',
                            file: obs.sounds[0].file_url,
                            color: 'text-emerald-400 border-emerald-500'
                        });
                    }
                });
            } catch (e) {
                console.warn('iNaturalist audio fetch failed', e);
            }
        }

        return records;
    },

    // 🧬 Taxa & summary info
    async fetchInfo(sciName) {
        const payload = { taxa: [], summary: '', image: '', commonName: '', speciesName: '', eolUrl: '' };
        if (!sciName) return payload;

        const encodedName = encodeURIComponent(sciName);

        try {
            const taxRes = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodedName}&is_active=true&per_page=1`);
            const taxData = await taxRes.json();

            if (taxData.results && taxData.results.length > 0) {
                const taxon = taxData.results[0];
                payload.commonName = taxon.preferred_common_name || '';
                payload.speciesName = taxon.name || sciName;
                payload.image = taxon.default_photo?.medium_url || taxon.default_photo?.square_url || '';

                const taxonId = taxon.id;
                let ancestors = [];
                if (taxonId) {
                    try {
                        const ancRes = await fetch(`https://api.inaturalist.org/v1/taxa/${taxonId}/ancestors?per_page=30`);
                        const ancData = await ancRes.json();
                        ancestors = ancData.results || [];
                    } catch (e) {
                        console.warn('Ancestor fetch failed', e);
                        ancestors = taxon.ancestors || [];
                    }
                } else {
                    ancestors = taxon.ancestors || [];
                }

                const lineage = [...ancestors, taxon]
                    .filter(item => item && item.name && item.name !== 'Life')
                    .sort((a, b) => {
                        const order = ['kingdom','phylum','class','order','family','genus','subgenus','species','subspecies','variety','form','unknown'];
                        const ai = order.indexOf(a.rank || 'unknown');
                        const bi = order.indexOf(b.rank || 'unknown');
                        return Math.max(ai, 0) - Math.max(bi, 0);
                    });

                payload.taxa = lineage.map(item => ({
                    rank: item.rank || 'unknown',
                    name: item.name || 'Unknown',
                    commonName: item.preferred_common_name || ''
                }));

                if (!payload.image && taxon.taxon_photos && taxon.taxon_photos.length > 0) {
                    payload.image = taxon.taxon_photos[0].photo.medium_url || payload.image;
                }

                // GBIF fallback when iNaturalist only returns species-level lineage
                if (payload.taxa.length <= 1 && taxon.name) {
                    try {
                        const matchRes = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(taxon.name)}`);
                        const matchData = await matchRes.json();
                        if (matchData.usageKey) {
                            const classRes = await fetch(`https://api.gbif.org/v1/species/${matchData.usageKey}/classification`);
                            const classData = await classRes.json();
                            const classification = (classData || []).filter(item => item && item.rank && item.name);
                            if (classification.length > 1) {
                                payload.taxa = classification.map(item => ({
                                    rank: item.rank.toLowerCase(),
                                    name: item.name,
                                    commonName: ''
                                }));
                            }
                        }
                    } catch (e) {
                        console.warn('GBIF taxonomy fallback failed', e);
                    }
                }

                // EoL fallback: try to find an Encyclopedia of Life page for this species
                if (!payload.eolUrl && taxon.name) {
                    try {
                        const eolSearchRes = await fetch(`https://eol.org/api/search/1.0.json?q=${encodeURIComponent(taxon.name)}&page=1`);
                        const eolSearchData = await eolSearchRes.json();
                        if (eolSearchData.results && eolSearchData.results.length > 0) {
                            const eolId = eolSearchData.results[0].id;
                            payload.eolUrl = `https://eol.org/pages/${eolId}`;

                            try {
                                const eolPageRes = await fetch(`https://eol.org/api/pages/1.0/${eolId}.json?images_per_page=0&details=true&taxonomy=true&language=en`);
                                const eolPageData = await eolPageRes.json();
                                const classification = (eolPageData.taxonomy || eolPageData.taxonConcepts || []).filter(item => item && item.rank && item.name);
                                if (classification.length > payload.taxa.length) {
                                    payload.taxa = classification.map(item => ({
                                        rank: (item.rank || item.taxonRank || 'unknown').toLowerCase(),
                                        name: item.name || item.scientificName || item.taxonName || 'Unknown',
                                        commonName: item.commonName || item.vernacularName || ''
                                    }));
                                }
                            } catch (innerE) {
                                console.warn('EoL page fetch failed', innerE);
                            }
                        }
                    } catch (e) {
                        console.warn('EoL taxonomy fallback failed', e);
                    }
                }
            }
        } catch (e) {
            console.warn('Taxa fetch failed', e);
        }

        try {
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedName}`);
            const wikiData = await wikiRes.json();
            payload.summary = wikiData.extract || payload.summary || 'Summary not available for this entity.';
            if (!payload.image && wikiData.thumbnail?.source) {
                payload.image = wikiData.thumbnail.source;
            }
        } catch (e) {
            if (!payload.summary) payload.summary = 'Summary not available for this entity.';
        }

        return payload;
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
    }
};