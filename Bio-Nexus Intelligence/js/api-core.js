// js/api-core.js — Bio-Nexus Intelligence Data Layer
// Map: Free OSM tiles + CSS dark filter (zero API key needed)
// Literature: PubMed (EuropePMC) + OpenAlex (direct client-side)
// Audio: Xeno-canto (via corsproxy) + iNaturalist
// Taxa & Photos: iNaturalist + GBIF + Wikipedia

export const APICore = {
    currentMap: null,
    currentMarkersLayer: null,
    currentPoints: [],

    // ── Distribution Map ──────────────────────────────────────────
    renderMap(containerId, speciesName, onCountUpdated = null) {
        const el = document.getElementById(containerId);
        if (!el) return;

        // Clean up previous map instance if re-rendering
        if (this.currentMap) {
            try {
                this.currentMap.remove();
            } catch (_) {}
            this.currentMap = null;
        }

        const map = L.map(el, {
            zoomControl: true,
            scrollWheelZoom: true,
            minZoom: 1,
            maxZoom: 18
        }).setView([20, 10], 2);

        this.currentMap = map;
        this.currentPoints = [];

        // ESRI World Dark Gray Canvas with 100% English labels (No API key required)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri, DeLorme, NAVTEQ · GBIF',
            maxNativeZoom: 16,
            maxZoom: 18
        }).addTo(map);

        // English Reference layer (Country names, boundaries & cities in English)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
            maxNativeZoom: 16,
            maxZoom: 18
        }).addTo(map);

        const markersLayer = L.featureGroup().addTo(map);
        this.currentMarkersLayer = markersLayer;

        fetch(`https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(speciesName)}&limit=250&hasCoordinate=true`)
            .then(r => r.json())
            .then(data => {
                const results = data.results || [];
                const points = [];

                results.forEach(obs => {
                    if (obs.decimalLatitude != null && obs.decimalLongitude != null) {
                        const lat = obs.decimalLatitude;
                        const lng = obs.decimalLongitude;
                        points.push([lat, lng]);

                        const country = obs.country || 'Unknown Region';
                        const year = obs.year ? `Year: ${obs.year}` : '';
                        const basis = obs.basisOfRecord ? obs.basisOfRecord.replace('_', ' ') : 'OBSERVATION';

                        const circle = L.circleMarker([lat, lng], {
                            color: '#10B981',
                            fillColor: '#10B981',
                            fillOpacity: 0.75,
                            radius: 5,
                            weight: 1
                        });

                        circle.bindPopup(`
                            <div style="font-family:'Space Grotesk',sans-serif;font-size:12px;color:#1e293b;line-height:1.4">
                                <b style="color:#0f172a;font-size:13px">${speciesName}</b><br>
                                <span>📍 ${country}</span><br>
                                <span style="font-size:11px;color:#64748b">${basis} ${year ? '· ' + year : ''}</span>
                            </div>
                        `);

                        circle.bindTooltip(`${country}`, { sticky: true });
                        markersLayer.addLayer(circle);
                    }
                });

                this.currentPoints = points;

                if (onCountUpdated) {
                    onCountUpdated({
                        displayed: points.length,
                        totalEstimated: data.count || points.length
                    });
                }

                if (points.length > 0) {
                    map.fitBounds(markersLayer.getBounds().pad(0.15));
                }

                setTimeout(() => map.invalidateSize(), 300);
            })
            .catch(() => {
                setTimeout(() => map.invalidateSize(), 300);
            });
    },

    fitMapBounds() {
        if (this.currentMap && this.currentMarkersLayer && this.currentPoints.length > 0) {
            this.currentMap.fitBounds(this.currentMarkersLayer.getBounds().pad(0.15));
        }
    },

    resetMapZoom() {
        if (this.currentMap) {
            this.currentMap.setView([20, 10], 2);
        }
    },

    // ── Bioacoustics ──────────────────────────────────────────────
    async fetchAudio(sciName) {
        if (!sciName) return [];
        let records = [];
        const enc = encodeURIComponent(sciName);

        // Xeno-canto via corsproxy.io
        try {
            const url = `https://corsproxy.io/?${encodeURIComponent(`https://www.xeno-canto.org/api/2/recordings?query=${sciName}`)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.recordings && data.recordings.length > 0) {
                records = data.recordings.slice(0, 6).map(r => ({
                    title: r.en || sciName,
                    source: 'Xeno-canto',
                    file: r.file,
                    recordist: r.rec || 'Unknown Contributor',
                    location: r.loc || r.cnt || 'Global Record'
                }));
            }
        } catch (e) { console.warn('Xeno-canto failed', e); }

        // iNaturalist fallback
        if (records.length === 0) {
            try {
                const res = await fetch(`https://api.inaturalist.org/v1/observations?taxon_name=${enc}&has[]=sounds&per_page=6`);
                const data = await res.json();
                (data.results || []).forEach(obs => {
                    if (obs.sounds?.[0]?.file_url) {
                        records.push({
                            title: obs.species_guess || sciName,
                            source: 'iNaturalist',
                            file: obs.sounds[0].file_url,
                            recordist: obs.user?.name || obs.user?.login || 'Community Observer',
                            location: obs.place_guess || 'Observation Site'
                        });
                    }
                });
            } catch (e) { console.warn('iNat audio failed', e); }
        }

        return records;
    },

    // ── Taxa & Summary ────────────────────────────────────────────
    async fetchInfo(sciName) {
        const out = {
            taxa: [],
            summary: '',
            image: '',
            commonName: '',
            speciesName: '',
            eolUrl: '',
            photos: [],
            relatedTaxa: [],
            observationsCount: 0,
            gbifOccurrencesCount: 0,
            rank: 'species',
            iconicTaxon: ''
        };

        if (!sciName) return out;
        const enc = encodeURIComponent(sciName);

        // 1. iNaturalist taxon info + gallery photos + ancestors
        try {
            const taxRes = await fetch(`https://api.inaturalist.org/v1/taxa?q=${enc}&is_active=true&per_page=1`);
            const taxData = await taxRes.json();

            if (taxData.results?.length > 0) {
                const taxon = taxData.results[0];
                out.commonName = taxon.preferred_common_name || '';
                out.speciesName = taxon.name || sciName;
                out.image = taxon.default_photo?.medium_url || taxon.default_photo?.square_url || '';
                out.observationsCount = taxon.observations_count || 0;
                out.rank = taxon.rank || 'species';
                out.iconicTaxon = taxon.iconic_taxon_name || '';

                // Extract multiple high quality photos for interactive gallery
                if (taxon.taxon_photos && taxon.taxon_photos.length > 0) {
                    out.photos = taxon.taxon_photos.slice(0, 8).map(tp => ({
                        url: tp.photo?.medium_url || '',
                        largeUrl: tp.photo?.large_url || tp.photo?.medium_url || '',
                        attribution: tp.photo?.attribution || 'iNaturalist Observer'
                    })).filter(p => !!p.url);
                }

                // Ancestors lineage
                let ancestors = [];
                if (taxon.id) {
                    try {
                        const ancRes = await fetch(`https://api.inaturalist.org/v1/taxa/${taxon.id}/ancestors?per_page=30`);
                        const ancData = await ancRes.json();
                        ancestors = ancData.results || [];
                    } catch (_) { ancestors = taxon.ancestors || []; }
                }

                const rankOrder = ['kingdom','phylum','class','order','family','genus','subgenus','species','subspecies'];
                const lineage = [...ancestors, taxon]
                    .filter(item => item?.name && item.name !== 'Life')
                    .sort((a, b) => {
                        const ai = rankOrder.indexOf(a.rank || '');
                        const bi = rankOrder.indexOf(b.rank || '');
                        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
                    });

                out.taxa = lineage.map(item => ({
                    rank: item.rank || 'unknown',
                    name: item.name || 'Unknown',
                    commonName: item.preferred_common_name || '',
                }));

                // Fetch sibling species (related taxa) for instant pivoting
                const parentId = taxon.parent_id;
                if (parentId) {
                    try {
                        const relRes = await fetch(`https://api.inaturalist.org/v1/taxa?parent_id=${parentId}&per_page=6&is_active=true`);
                        const relData = await relRes.json();
                        if (relData.results) {
                            out.relatedTaxa = relData.results
                                .filter(t => t.name.toLowerCase() !== sciName.toLowerCase())
                                .slice(0, 5)
                                .map(t => ({
                                    name: t.name,
                                    commonName: t.preferred_common_name || t.name,
                                    rank: t.rank || '',
                                    photo: t.default_photo?.square_url || ''
                                }));
                        }
                    } catch (_) {}
                }

                // GBIF classification fallback if lineage is sparse
                if (out.taxa.length <= 1) {
                    try {
                        const matchRes = await fetch(`https://api.gbif.org/v1/species/match?name=${enc}`);
                        const matchData = await matchRes.json();
                        if (matchData.usageKey) {
                            const classRes = await fetch(`https://api.gbif.org/v1/species/${matchData.usageKey}/classification`);
                            const classData = await classRes.json();
                            if (Array.isArray(classData) && classData.length > 1) {
                                out.taxa = classData
                                    .filter(item => item?.rank && item?.name)
                                    .map(item => ({
                                        rank: item.rank.toLowerCase(),
                                        name: item.name,
                                        commonName: '',
                                    }));
                            }
                        }
                    } catch (_) {}
                }
            }
        } catch (e) { console.warn('iNat taxa fetch failed', e); }

        // 2. Wikipedia summary + image fallback
        try {
            const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`);
            const wikiData = await wikiRes.json();
            out.summary = wikiData.extract || '';
            if (!out.image && wikiData.thumbnail?.source) {
                out.image = wikiData.thumbnail.source;
            }
        } catch (_) { out.summary = out.summary || 'No summary available.'; }

        // 3. EoL link
        try {
            const eolRes = await fetch(`https://eol.org/api/search/1.0.json?q=${enc}&page=1`);
            const eolData = await eolRes.json();
            if (eolData.results?.length > 0) {
                out.eolUrl = `https://eol.org/pages/${eolData.results[0].id}`;
            }
        } catch (_) {}

        // 4. Quick GBIF occurrence total count
        try {
            const gbifRes = await fetch(`https://api.gbif.org/v1/occurrence/search?scientificName=${enc}&limit=0`);
            const gbifData = await gbifRes.json();
            out.gbifOccurrencesCount = gbifData.count || 0;
        } catch (_) {}

        return out;
    },

    // ── Research Literature ───────────────────────────────────────
    async fetchLiterature(sciName) {
        let papers = [];
        const q = encodeURIComponent(sciName);

        const [alexRes, pmcRes] = await Promise.allSettled([
            fetch(`https://api.openalex.org/works?search=${q}&per-page=30&filter=has_doi:true`).then(r => r.json()),
            fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${q}&format=json&pageSize=30`).then(r => r.json()),
        ]);

        if (pmcRes.status === 'fulfilled' && pmcRes.value.resultList?.result) {
            pmcRes.value.resultList.result.forEach(p => {
                papers.push({
                    title: p.title || 'Untitled PubMed Study',
                    author: p.authorString || 'Various Researchers',
                    year: p.pubYear || 'Recent',
                    source: 'PubMed',
                    link: `https://europepmc.org/article/${p.source}/${p.id}`,
                    snippet: p.journalTitle || 'Biomedical Journal'
                });
            });
        }

        if (alexRes.status === 'fulfilled' && alexRes.value.results) {
            alexRes.value.results.forEach(p => {
                const link = p.open_access?.oa_url || p.doi;
                if (link) {
                    papers.push({
                        title: p.title || 'Untitled Research Work',
                        author: p.authorships?.[0]?.author?.display_name || 'Academic Group',
                        year: p.publication_year || 'Recent',
                        source: 'OpenAlex',
                        link,
                        snippet: p.primary_location?.source?.display_name || 'Open Science Publication'
                    });
                }
            });
        }

        // Sort newest first, deduplicate by title
        const seen = new Set();
        return papers
            .sort((a, b) => (b.year || 0) - (a.year || 0))
            .filter(p => {
                const key = (p.title || '').toLowerCase().trim().slice(0, 80);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    },
};