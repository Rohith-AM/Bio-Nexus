# 🧬 Bio-Nexus

**Biology Meets Intelligence.**

> An open-source research platform built for students and field biologists — aggregating biology's most powerful free tools and databases into one place, because knowledge shouldn't be scattered.

[![Live Platform](https://img.shields.io/badge/Live-bio--nexus--teal.vercel.app-teal?style=flat-square)](https://bio-nexus-teal.vercel.app)
[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)](https://github.com/Rohith-AM/bio-nexus)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Open Source](https://img.shields.io/badge/open--source-always%20free-orange?style=flat-square)](https://github.com/Rohith-AM/bio-nexus)

---

## Why Bio-Nexus?

Biology has incredible free resources — GBIF, iNaturalist, PubMed, Xeno-Canto, OpenAlex, ITIS, NCBI. Most biology students have never heard of them. The ones who have spend hours jumping between disconnected interfaces.

Bio-Nexus is the aggregation layer. One search. Every source. Zero cost. Always open.

---

## What's Inside

### 🧠 Bio-Intelligence
AI-powered species and research search. Search any species by common or scientific name and get a unified knowledge profile:

- **Taxa & Info** — Evolutionary lineage, Wikipedia abstract, species photo
- **Distribution** — Live GBIF occurrence map via CARTO/Leaflet
- **Literature** — Research papers from PubMed and OpenAlex, sorted by date
- **Bio-Acoustics** — Bird calls and wildlife audio from Xeno-Canto

### 🧪 BioLab — Research Tools & Analysis Suite

**DNA Tools**
- **Sequence Analyzer** — Analyze DNA sequences: GC%, transcription, translation
- **Restriction Mapper** — Find EcoRI, BamHI and other restriction enzyme cut sites
- **Rev-Comp Generator** — Reverse complement strand generator

**Structure & Ecology**
- **3D Mol-Viewer** — Visualize PDB protein structures in 3D
- **Species Explorer** — GBIF occurrence data + Xeno-Canto wildlife audio
- **BioSheet** — R-powered biology spreadsheet for data analysis

### 🌿 BioField *(coming soon)*
Field observation logger with GPS tagging, photo upload, and iNaturalist sync.

---

## APIs Integrated

| Source | Data Type | Auth Required |
|--------|-----------|---------------|
| [GBIF](https://www.gbif.org) | Species occurrence, distribution | No |
| [iNaturalist](https://www.inaturalist.org) | Community observations, photos | No |
| [PubMed (NCBI)](https://pubmed.ncbi.nlm.nih.gov) | Research literature | No |
| [OpenAlex](https://openalex.org) | Open access research papers | No |
| [Xeno-Canto](https://xeno-canto.org) | Wildlife audio, bird calls | No |
| [Wikipedia](https://www.wikipedia.org) | Species summaries | No |
| [OpenStax](https://openstax.org) | Open biology textbooks | No |
| [CARTO](https://carto.com) | Spatial/map visualization | Free tier |

**Coming soon:** ITIS (full taxonomy hierarchy), NCBI E-utilities (genome data), EOL (Encyclopedia of Life), BOLD Systems (species barcoding)

---

## Getting Started

### Use the live platform
No setup needed. Just open:
```
https://bio-nexus-teal.vercel.app
```

### Run locally
```bash
git clone https://github.com/Rohith-AM/bio-nexus.git
cd bio-nexus
# Open index.html in your browser — no build step needed
```

Bio-Nexus is intentionally built as vanilla HTML/CSS/JS with no framework dependencies, so it runs anywhere without a build pipeline.

---

## Self-Host

Since there's no backend and no build step, self-hosting is as simple as:

```bash
# Option 1: Python simple server
python3 -m http.server 8000

# Option 2: Deploy to Vercel (one click)
# Fork the repo → import into Vercel → done

# Option 3: GitHub Pages
# Enable Pages in repo settings → serves automatically
```

---

## Project Structure

```
bio-nexus/
├── index.html                    # Main landing page
├── tools/
│   ├── dna-converter.html        # Sequence Analyzer
│   ├── restriction.html          # Restriction Mapper
│   ├── reverse.html              # Rev-Comp Generator
│   ├── mol-viewer.html           # 3D Mol-Viewer
│   └── species-explorer.html     # Species Explorer
├── Bio-Nexus Intelligence/
│   └── index.html                # Bio-Intelligence interface
└── assets/
```

---

## Contributing

Bio-Nexus is open to contributions of all kinds — new tools, API integrations, bug fixes, UI improvements, or documentation.

```bash
# Fork the repo
git checkout -b feature/your-feature-name
# Make your changes
git commit -m "add: your feature description"
git push origin feature/your-feature-name
# Open a Pull Request
```

**Ideas for contribution:**
- ITIS taxonomy API integration
- NCBI genome data panel
- EOL (Encyclopedia of Life) species traits
- BioField GPS logger implementation
- Mobile-responsive improvements
- Translations / i18n for regional language support

---

## Philosophy

> 70% of biology students don't know GBIF exists. Most have never used iNaturalist's API. Xeno-Canto, OpenAlex, ITIS — these are world-class free resources that remain invisible because everything is scattered.

Bio-Nexus exists to fix that. Every feature is free. Every data source is open. No account required. No premium tier. Ever.

Built by a biology student, for biology students — on a 2018 laptop, with zero budget, during summer break.

---

## Built By

**Rohith AM** — B.Sc Hons Biology, Azim Premji University, Bangalore  
GitHub: [@Rohith-AM](https://github.com/Rohith-AM)

Also building:
- [ZiBase](https://github.com/Rohith-AM/zibase) — Markdown tables as living databases (Obsidian plugin, live in community)
- [Vellum](https://github.com/Rohith-AM/vellum) — Obsidian theme (live in community)

---

## License

MIT — use it, fork it, build on it, share it.

---

*Zero budget. Maximum leverage. Built different.* 🔥
