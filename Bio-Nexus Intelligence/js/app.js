// js/app.js — Bio-Nexus Intelligence Main Controller
import { APICore } from './api-core.js';
import { Autocomplete } from './autocomplete.js';

// ── Application State ───────────────────────────────────────────
const state = {
    sciName: '',
    commonName: '',
    activeTab: 'overview',
    infoData: null,
    audioData: [],
    literatureData: [],
    litFilterQuery: '',
    litSourceFilter: 'all',
};

// ── Global Search Entry Point ───────────────────────────────────
async function doSearch(sciName, commonName = '') {
    sciName = (sciName || '').trim();
    if (!sciName) return;

    state.sciName = sciName;
    state.commonName = commonName || sciName;
    state.activeTab = 'overview';
    state.infoData = null;
    state.audioData = [];
    state.literatureData = [];
    state.litFilterQuery = '';
    state.litSourceFilter = 'all';

    // Hide any autocomplete dropdowns
    document.getElementById('suggestions')?.classList.add('hidden');
    document.getElementById('inlineSuggestions')?.classList.add('hidden');

    // Switch view: Landing → Results
    document.getElementById('searchSection')?.classList.add('hidden');
    document.getElementById('resultsSection')?.classList.remove('hidden');

    // Populate Species Identity Strip
    document.getElementById('speciesCommon').textContent = state.commonName;
    document.getElementById('speciesSci').textContent = sciName;
    document.getElementById('rankBadge').textContent = 'SEARCHING...';
    document.getElementById('taxaBreadcrumb').innerHTML = '';

    // Clear photo until loaded
    const imgEl = document.getElementById('speciesImg');
    const fxEl = document.getElementById('speciesPhotoFx');
    if (imgEl && fxEl) {
        imgEl.classList.add('hidden');
        fxEl.classList.remove('hidden');
        fxEl.textContent = '🧬';
    }

    // Reset tab counters
    updateBadge('mapTabBadge', null);
    updateBadge('audioTabBadge', null);
    updateBadge('litTabBadge', null);

    // Reset tabs UI to overview
    document.querySelectorAll('.ni-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="overview"]')?.classList.add('active');

    // Render overview tab & prefetch auxiliary data for badges
    await renderOverview();
    prefetchBackgroundCounts();
}

// ── Background Prefetching for Live Badges ───────────────────────
async function prefetchBackgroundCounts() {
    const targetSci = state.sciName;

    // Prefetch audio
    APICore.fetchAudio(targetSci).then(records => {
        if (state.sciName === targetSci) {
            state.audioData = records;
            updateBadge('audioTabBadge', records.length);
        }
    }).catch(() => {});

    // Prefetch literature
    APICore.fetchLiterature(targetSci).then(papers => {
        if (state.sciName === targetSci) {
            state.literatureData = papers;
            updateBadge('litTabBadge', papers.length);
        }
    }).catch(() => {});
}

function updateBadge(badgeId, count) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    if (count != null && count > 0) {
        el.textContent = count > 99 ? '99+' : count;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

// ── Tab Controller ──────────────────────────────────────────────
function switchTab(tabId) {
    if (state.activeTab === tabId) return;
    state.activeTab = tabId;

    document.querySelectorAll('.ni-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });

    switch (tabId) {
        case 'overview':   renderOverview();   break;
        case 'map':        renderMap();        break;
        case 'audio':      renderAudio();      break;
        case 'literature': renderLiterature(); break;
    }
}

// ── Tab: Overview ───────────────────────────────────────────────
async function renderOverview() {
    const content = document.getElementById('tabContent');
    showLoader();

    if (!state.infoData) {
        state.infoData = await APICore.fetchInfo(state.sciName);
    }
    const data = state.infoData;

    // Update species strip
    if (data.commonName) {
        state.commonName = data.commonName;
        document.getElementById('speciesCommon').textContent = data.commonName;
    }
    const dispName = data.speciesName || state.sciName;
    document.getElementById('speciesSci').textContent = dispName;

    const rankEl = document.getElementById('rankBadge');
    if (rankEl) {
        rankEl.textContent = (data.rank || 'SPECIES').toUpperCase();
    }

    if (data.image) {
        const img = document.getElementById('speciesImg');
        const fx = document.getElementById('speciesPhotoFx');
        img.src = data.image;
        img.onload = () => {
            img.classList.remove('hidden');
            fx.classList.add('hidden');
        };
        img.onerror = () => {
            img.classList.add('hidden');
            fx.classList.remove('hidden');
        };
    }

    // Breadcrumbs
    if (data.taxa && data.taxa.length > 0) {
        const crumbRanks = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'];
        const crumbs = data.taxa.filter(t => crumbRanks.includes(t.rank));
        const crumbEl = document.getElementById('taxaBreadcrumb');
        crumbEl.innerHTML = crumbs.map((t, i) =>
            `<button class="ni-crumb-btn" onclick="quickSearch('${escAttr(t.name)}', '${escAttr(t.commonName || t.name)}')">${t.name}</button>${i < crumbs.length - 1 ? '<span class="ni-crumb-sep">›</span>' : ''}`
        ).join('');
    }

    let html = '<div class="ni-anim">';

    // 1. Quick Stats Metrics Row
    const obsFormatted = data.observationsCount ? Number(data.observationsCount).toLocaleString() : 'Documented';
    const gbifFormatted = data.gbifOccurrencesCount ? Number(data.gbifOccurrencesCount).toLocaleString() + '+' : 'Cataloged';
    const photosCount = data.photos ? data.photos.length : (data.image ? 1 : 0);
    const iconicGroup = data.iconicTaxon || (data.taxa[0] ? data.taxa[0].name : 'Organism');

    html += `
    <div class="ni-stats-row">
        <div class="ni-stat-card">
            <span class="ni-stat-label">Taxon & Group</span>
            <span class="ni-stat-value">${escHtml(data.rank.toUpperCase())}</span>
            <span class="ni-stat-sub">${escHtml(iconicGroup)}</span>
        </div>
        <div class="ni-stat-card">
            <span class="ni-stat-label">GBIF Occurrences</span>
            <span class="ni-stat-value" style="color:#10B981">${gbifFormatted}</span>
            <span class="ni-stat-sub">Global coordinate records</span>
        </div>
        <div class="ni-stat-card">
            <span class="ni-stat-label">Field Sightings</span>
            <span class="ni-stat-value" style="color:#3B82F6">${obsFormatted}</span>
            <span class="ni-stat-sub">iNaturalist observations</span>
        </div>
    </div>`;

    // 2. Summary & EoL Panel
    if (data.summary) {
        html += `
        <div class="ni-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <p class="ni-panel-label" style="margin:0">Species Summary</p>
                ${data.eolUrl ? `<a href="${data.eolUrl}" target="_blank" class="ni-badge ni-badge--link">Encyclopedia of Life ↗</a>` : ''}
            </div>
            <p class="ni-panel-desc">${data.summary}</p>
        </div>`;
    }

    // 3. Interactive Photo Gallery (if photos available)
    if (data.photos && data.photos.length > 0) {
        const photoCells = data.photos.map((p, idx) => `
            <div class="ni-photo-cell" onclick="openLightbox(${idx})">
                <img src="${p.url}" alt="${escAttr(state.commonName)}" loading="lazy">
                <span class="ni-photo-hover-tag">Click to enlarge</span>
            </div>
        `).join('');

        html += `
        <div class="ni-panel" style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <p class="ni-panel-label" style="margin:0">Specimen Gallery (${data.photos.length} photos)</p>
                <span style="font-size:11px;color:var(--text3)">Natural observations</span>
            </div>
            <div class="ni-photo-grid">${photoCells}</div>
        </div>`;
    }

    // 4. Interactive Evolutionary Lineage (Every item clickable to pivot)
    if (data.taxa && data.taxa.length > 0) {
        const lineageItems = data.taxa.map((t, i) => `
            <button class="ni-lineage-item ni-rank-${t.rank}" onclick="quickSearch('${escAttr(t.name)}', '${escAttr(t.commonName || t.name)}')" title="Explore ${t.name}">
                <span class="ni-rank-label">${t.rank}</span>
                <span class="ni-rank-name">${t.name}</span>
                ${t.commonName ? `<span class="ni-rank-common">${t.commonName}</span>` : ''}
            </button>
            ${i < data.taxa.length - 1 ? '<span class="ni-lineage-sep">›</span>' : ''}
        `).join('');

        html += `
        <div class="ni-panel" style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <p class="ni-panel-label" style="margin:0">Evolutionary Lineage</p>
                <span style="font-size:11px;color:var(--text3)">Click any taxon to navigate tree</span>
            </div>
            <div class="ni-lineage">${lineageItems}</div>
        </div>`;
    }

    // 5. Related Species in Same Genus/Family
    if (data.relatedTaxa && data.relatedTaxa.length > 0) {
        const chips = data.relatedTaxa.map(rt => `
            <button class="ni-related-chip" onclick="quickSearch('${escAttr(rt.name)}', '${escAttr(rt.commonName)}')">
                ${rt.photo ? `<img src="${rt.photo}" class="ni-related-photo" alt="${escAttr(rt.commonName)}">` : ''}
                <div style="text-align:left">
                    <span class="ni-related-name">${escHtml(rt.commonName)}</span>
                    <span class="ni-related-sci">${escHtml(rt.name)}</span>
                </div>
            </button>
        `).join('');

        html += `
        <div class="ni-panel" style="margin-top:12px">
            <p class="ni-panel-label" style="margin-bottom:12px">Related in this Group</p>
            <div class="ni-related-row">${chips}</div>
        </div>`;
    }

    html += '</div>';
    content.innerHTML = html;
}

// ── Tab: Distribution Map ───────────────────────────────────────
function renderMap() {
    const content = document.getElementById('tabContent');
    content.innerHTML = `
        <div class="ni-anim">
            <div class="ni-panel">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
                    <div>
                        <p class="ni-panel-label" style="margin:0">GBIF Global Occurrence Records</p>
                        <p style="font-size:12px;color:var(--text2);margin-top:2px">Georeferenced specimen & wild observation coordinates</p>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button class="ni-btn-secondary" onclick="window.fitNexusMap()">Fit Points</button>
                        <button class="ni-btn-secondary" onclick="window.resetNexusMap()">Reset Zoom</button>
                    </div>
                </div>

                <div class="ni-map-wrap" id="mapWrap">
                    <div id="nexusMap" style="width:100%;height:460px"></div>
                </div>

                <div class="ni-map-stats" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                    <div style="display:flex;align-items:center;gap:6px">
                        <span class="ni-map-stat-dot"></span>
                        <span id="mapCountNote" style="font-size:12px;color:var(--text2)">Plotting coordinate points from GBIF...</span>
                    </div>
                    <span style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">ESRI Dark Canvas · English Labels</span>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        APICore.renderMap('nexusMap', state.sciName, (info) => {
            const noteEl = document.getElementById('mapCountNote');
            if (noteEl) {
                noteEl.innerHTML = `Plotted <b>${info.displayed}</b> coordinates across global observation sites`;
            }
            updateBadge('mapTabBadge', info.displayed);
        });
    }, 150);
}

window.fitNexusMap = () => APICore.fitMapBounds();
window.resetNexusMap = () => APICore.resetMapZoom();

// ── Tab: Bioacoustics ───────────────────────────────────────────
async function renderAudio() {
    const content = document.getElementById('tabContent');
    showLoader();

    if (!state.audioData || state.audioData.length === 0) {
        state.audioData = await APICore.fetchAudio(state.sciName);
    }
    const audios = state.audioData;
    updateBadge('audioTabBadge', audios.length);

    if (audios.length === 0) {
        content.innerHTML = `
        <div class="ni-anim">
            <div class="ni-panel ni-empty-card">
                <div style="font-size:36px;margin-bottom:8px">🔇</div>
                <p class="ni-empty-title">No Acoustic Signatures Cataloged</p>
                <p class="ni-empty-desc">No verified audio recordings found for <em>${escHtml(state.sciName)}</em> in Xeno-canto or iNaturalist repositories.</p>
                <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">
                    <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((state.commonName || state.sciName) + ' call sound')}" target="_blank" class="ni-link-btn">
                        Search YouTube ↗
                    </a>
                    <a href="https://xeno-canto.org/explore?query=${encodeURIComponent(state.sciName)}" target="_blank" class="ni-link-btn">
                        Search Xeno-canto ↗
                    </a>
                </div>
            </div>
        </div>`;
        return;
    }

    const audioCards = audios.map((rec, i) => {
        const srcClass = rec.source.toLowerCase().replace(/[^a-z]/g, '');
        return `
        <div class="ni-audio-card">
            <div class="ni-audio-header">
                <div>
                    <span class="ni-audio-title">${escHtml(rec.title)}</span>
                    <p style="font-size:11px;color:var(--text3);margin-top:2px">📍 ${escHtml(rec.location)} · 👤 ${escHtml(rec.recordist)}</p>
                </div>
                <span class="ni-badge ni-badge--${srcClass}">${rec.source}</span>
            </div>
            <audio controls class="ni-audio-player" onplay="handleAudioPlay(this)">
                <source src="${rec.file}">
                Your browser does not support audio.
            </audio>
        </div>`;
    }).join('');

    content.innerHTML = `
    <div class="ni-anim">
        <div class="ni-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                <p class="ni-panel-label" style="margin:0">${audios.length} Verified Recordings</p>
                <span style="font-size:11px;color:var(--text3)">Xeno-canto & iNaturalist</span>
            </div>
            <div class="ni-audio-list">${audioCards}</div>
        </div>
    </div>`;
}

window.handleAudioPlay = (activePlayer) => {
    document.querySelectorAll('audio.ni-audio-player').forEach(player => {
        if (player !== activePlayer) player.pause();
    });
};

// ── Tab: Literature (Interactive Instant Search & Clean Grid) ───
async function renderLiterature() {
    const content = document.getElementById('tabContent');
    showLoader();

    if (!state.literatureData || state.literatureData.length === 0) {
        state.literatureData = await APICore.fetchLiterature(state.sciName);
    }
    const papers = state.literatureData;
    updateBadge('litTabBadge', papers.length);

    if (!papers || papers.length === 0) {
        content.innerHTML = `
        <div class="ni-anim">
            <div class="ni-panel ni-empty-card">
                <div style="font-size:36px;margin-bottom:8px">📚</div>
                <p class="ni-empty-title">No Open-Access Studies Indexed</p>
                <p class="ni-empty-desc">No direct papers retrieved from PubMed or OpenAlex for <em>${escHtml(state.sciName)}</em>.</p>
                <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(state.sciName)}" target="_blank" class="ni-link-btn" style="margin:16px auto 0">
                    Search Google Scholar ↗
                </a>
            </div>
        </div>`;
        return;
    }

    content.innerHTML = `
    <div class="ni-anim">
        <div class="ni-panel">
            <!-- Header with Search & Filter Controls -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:12px">
                <div>
                    <p class="ni-panel-label" style="margin:0">Research Literature</p>
                    <p id="litStatsText" style="font-size:12px;color:var(--text2);margin-top:2px">Showing ${papers.length} peer-reviewed works</p>
                </div>

                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <button class="ni-filter-pill active" onclick="setLitSourceFilter('all', this)">All (${papers.length})</button>
                    <button class="ni-filter-pill" onclick="setLitSourceFilter('pubmed', this)">PubMed</button>
                    <button class="ni-filter-pill" onclick="setLitSourceFilter('openalex', this)">OpenAlex</button>
                </div>
            </div>

            <!-- Instant Search Input inside Literature Tab -->
            <div class="ni-lit-search-wrap">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--text3)">
                    <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" id="litSearchInput" class="ni-lit-search-input" placeholder="Filter papers by keyword (e.g. genetics, disease, diet, habitat)..." oninput="handleLitSearch(this.value)">
            </div>

            <!-- Paper Cards Grid -->
            <div id="litCardsGrid" class="ni-papers-grid"></div>
        </div>
    </div>`;

    renderLitCards();
}

function renderLitCards() {
    const grid = document.getElementById('litCardsGrid');
    if (!grid) return;

    const query = (state.litFilterQuery || '').toLowerCase().trim();
    const sourceFilter = state.litSourceFilter;

    let filtered = state.literatureData.filter(p => {
        const matchesSource = sourceFilter === 'all' || p.source.toLowerCase() === sourceFilter;
        if (!matchesSource) return false;

        if (!query) return true;
        const text = `${p.title} ${p.author} ${p.snippet || ''} ${p.year}`.toLowerCase();
        return text.includes(query);
    });

    const statsText = document.getElementById('litStatsText');
    if (statsText) {
        statsText.textContent = `Showing ${filtered.length} of ${state.literatureData.length} papers`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:36px 0;color:var(--text3)">
                <p style="font-size:14px;color:var(--text2)">No papers match "${escHtml(query)}"</p>
                <p style="font-size:12px;margin-top:4px">Try another keyword or reset the filter.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const srcClass = p.source.toLowerCase();
        return `
        <a href="${p.link}" target="_blank" class="ni-paper-card" rel="noopener noreferrer">
            <div class="ni-paper-meta">
                <span class="ni-badge ni-badge--${srcClass}">${p.source}</span>
                <span class="ni-paper-year">${p.year || 'Recent'}</span>
            </div>
            <p class="ni-paper-title">${escHtml(p.title || 'Untitled Research')}</p>
            ${p.snippet ? `<p style="font-size:11px;color:var(--text2);margin-top:6px;line-height:1.4">${escHtml(p.snippet)}</p>` : ''}
            <p class="ni-paper-author">✍️ ${escHtml(p.author || 'Various Authors')}</p>
        </a>`;
    }).join('');
}

window.handleLitSearch = (val) => {
    state.litFilterQuery = val;
    renderLitCards();
};

window.setLitSourceFilter = (source, btn) => {
    state.litSourceFilter = source;
    document.querySelectorAll('.ni-filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLitCards();
};

// ── Interactive Lightbox Modal ──────────────────────────────────
window.openLightbox = (photoIdx) => {
    if (!state.infoData?.photos?.[photoIdx]) return;
    const photo = state.infoData.photos[photoIdx];
    const modal = document.getElementById('lightboxModal');
    const img = document.getElementById('lightboxImg');
    const caption = document.getElementById('lightboxCaption');

    if (modal && img) {
        img.src = photo.largeUrl || photo.url;
        if (caption) {
            caption.textContent = `${state.commonName} (${state.sciName}) · Photo: ${photo.attribution}`;
        }
        modal.classList.remove('hidden');
    }
};

window.closeLightbox = () => {
    document.getElementById('lightboxModal')?.classList.add('hidden');
};

// ── Helpers ──────────────────────────────────────────────────────
function showLoader() {
    document.getElementById('tabContent').innerHTML = `
        <div class="ni-loader">
            <div class="ni-spinner"></div>
            <p>Querying global databases...</p>
        </div>`;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Initializer ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Autocomplete for landing page input AND inline strip input
    Autocomplete.init((sciName, commonName) => doSearch(sciName, commonName));

    // Landing Search Button
    document.getElementById('searchBtn')?.addEventListener('click', () => {
        doSearch(document.getElementById('searchInput')?.value);
    });

    // Enter key on Landing input
    document.getElementById('searchInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSearch(document.getElementById('searchInput')?.value);
    });

    // Enter key on Inline Results input
    document.getElementById('inlineSearchInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSearch(document.getElementById('inlineSearchInput')?.value);
    });

    // Tabs clicks
    document.querySelectorAll('.ni-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // New Search / Home button
    document.getElementById('newSearchBtn')?.addEventListener('click', () => {
        document.getElementById('resultsSection')?.classList.add('hidden');
        document.getElementById('searchSection')?.classList.remove('hidden');
        const inp = document.getElementById('searchInput');
        if (inp) {
            inp.value = '';
            inp.focus();
        }
    });

    // Lightbox modal close listeners
    document.getElementById('lightboxCloseBtn')?.addEventListener('click', window.closeLightbox);
    document.getElementById('lightboxOverlay')?.addEventListener('click', window.closeLightbox);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') window.closeLightbox();
    });

    // Check URL search params for ?q= from homepage
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    if (initialQuery) {
        doSearch(initialQuery);
    }
});

// Exposed for example buttons & lineage pills
window.quickSearch = (query, common = '') => doSearch(query, common);