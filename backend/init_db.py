#!/usr/bin/env python3
"""
Bio-Nexus Database Initialization & Seeding Engine
===================================================
Creates and populates high-performance SQLite database: backend/bionexus.db
- Table 1: proteins (253,205 PDB entries) with B-Tree Index & FTS5 (Full-Text Search)
- Table 2: glossary (Biological Terms & Definitions) with Category Index & FTS5

Author: Rohith & Bio-Nexus Core
"""

import os
import sys
import time
import json
import sqlite3
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "backend" / "bionexus.db"
PROTEIN_JSON = BASE_DIR / "tools" / "protein-index.json"

# Core foundational biology terms (Expanding the original 24 from index.html)
INITIAL_GLOSSARY = [
    # Genetics & Molecular Biology
    {"term": "Allele", "category": "Genetics", "definition": "Alternative form of a gene at a given locus.", "source": "OpenStax Biology"},
    {"term": "Chromosome", "category": "Genetics", "definition": "Thread-like structure of DNA and histone proteins carrying genetic information.", "source": "OpenStax Biology"},
    {"term": "DNA", "category": "Molecular Biology", "definition": "Deoxyribonucleic acid — double-helix molecule carrying genetic instructions.", "source": "OpenStax Biology"},
    {"term": "RNA", "category": "Molecular Biology", "definition": "Ribonucleic acid — single-stranded nucleic acid involved in protein synthesis and gene regulation.", "source": "OpenStax Biology"},
    {"term": "Gene", "category": "Genetics", "definition": "Basic unit of heredity; sequence of nucleotides in DNA that encodes the synthesis of a gene product.", "source": "OpenStax Biology"},
    {"term": "Genotype", "category": "Genetics", "definition": "The complete genetic makeup of an organism for a specific gene or set of genes.", "source": "OpenStax Biology"},
    {"term": "Phenotype", "category": "Genetics", "definition": "Observable physical or biochemical characteristics of an organism, determined by genotype and environment.", "source": "OpenStax Biology"},
    {"term": "Mutation", "category": "Genetics", "definition": "Permanent alteration in the nucleotide sequence of the genome.", "source": "OpenStax Biology"},
    {"term": "Transcription", "category": "Molecular Biology", "definition": "Process of copying a segment of DNA into messenger RNA (mRNA) by RNA polymerase.", "source": "OpenStax Biology"},
    {"term": "Translation", "category": "Molecular Biology", "definition": "Process of synthesizing polypeptide protein chains from mRNA codons at the ribosome.", "source": "OpenStax Biology"},
    {"term": "Codon", "category": "Molecular Biology", "definition": "Sequence of three consecutive nucleotides that specifies an amino acid or stop signal.", "source": "OpenStax Biology"},
    {"term": "Polymerase Chain Reaction (PCR)", "category": "Biotechnology", "definition": "Technique used to amplify millions of copies of a specific DNA segment.", "source": "OpenStax Biology"},
    {"term": "Restriction Enzyme", "category": "Biotechnology", "definition": "Endonuclease that cleaves DNA molecules at specific palindromic recognition sequences.", "source": "OpenStax Biology"},
    {"term": "Plasmid", "category": "Biotechnology", "definition": "Small circular double-stranded DNA molecule distinct from chromosomal DNA, commonly used as cloning vectors.", "source": "OpenStax Biology"},
    {"term": "Epigenetics", "category": "Genetics", "definition": "Study of heritable phenotype changes that do not involve alterations in the DNA sequence (e.g. methylation).", "source": "OpenStax Biology"},
    
    # Cell Biology
    {"term": "Mitosis", "category": "Cell Biology", "definition": "Nuclear cell division producing two genetically identical diploid daughter cells.", "source": "OpenStax Biology"},
    {"term": "Meiosis", "category": "Cell Biology", "definition": "Specialized cell division producing four genetically distinct haploid gametes.", "source": "OpenStax Biology"},
    {"term": "Osmosis", "category": "Cell Biology", "definition": "Net movement of water molecules across a selectively permeable membrane toward higher solute concentration.", "source": "OpenStax Biology"},
    {"term": "Diffusion", "category": "Cell Biology", "definition": "Passive net movement of particles from an area of higher concentration to lower concentration.", "source": "OpenStax Biology"},
    {"term": "Active Transport", "category": "Cell Biology", "definition": "Movement of ions or molecules across a cell membrane against concentration gradient, requiring cellular energy (ATP).", "source": "OpenStax Biology"},
    {"term": "Homeostasis", "category": "Cell Biology", "definition": "State of steady internal physical and chemical conditions maintained by living organisms.", "source": "OpenStax Biology"},
    {"term": "Endocytosis", "category": "Cell Biology", "definition": "Cellular process in which substances are brought into the cell by engulfing them in a membrane vesicle.", "source": "OpenStax Biology"},
    {"term": "Mitochondria", "category": "Cell Biology", "definition": "Double-membrane-bound organelle that generates most of the chemical energy needed to power cellular reactions (ATP).", "source": "OpenStax Biology"},
    {"term": "Ribosome", "category": "Cell Biology", "definition": "Macromolecular machine found in all cells that performs biological protein synthesis.", "source": "OpenStax Biology"},
    {"term": "Endoplasmic Reticulum", "category": "Cell Biology", "definition": "Network of membranous tubules involved in protein synthesis (rough ER) and lipid synthesis (smooth ER).", "source": "OpenStax Biology"},
    {"term": "Golgi Apparatus", "category": "Cell Biology", "definition": "Organelle that packages, sorts, and modifies proteins for secretion or intracellular delivery.", "source": "OpenStax Biology"},

    # Biochemistry
    {"term": "Protein", "category": "Biochemistry", "definition": "Large biomolecule composed of one or more long chains of amino acid residues folded into specific 3D structures.", "source": "OpenStax Biology"},
    {"term": "Enzyme", "category": "Biochemistry", "definition": "Biological catalyst (typically protein) that speeds up chemical reactions by lowering activation energy.", "source": "OpenStax Biology"},
    {"term": "Nucleotide", "category": "Biochemistry", "definition": "Monomeric unit of nucleic acids, consisting of a nitrogenous base, five-carbon sugar, and phosphate group.", "source": "OpenStax Biology"},
    {"term": "Photosynthesis", "category": "Biochemistry", "definition": "Process by which autotrophs convert solar radiant energy into chemical energy stored in glucose molecules.", "source": "OpenStax Biology"},
    {"term": "Cellular Respiration", "category": "Biochemistry", "definition": "Metabolic reactions converting biochemical energy from nutrients into ATP, releasing waste products.", "source": "OpenStax Biology"},
    {"term": "Glycolysis", "category": "Biochemistry", "definition": "Metabolic pathway converting glucose into pyruvate, generating ATP and NADH in the cytoplasm.", "source": "OpenStax Biology"},
    {"term": "Krebs Cycle", "category": "Biochemistry", "definition": "Series of chemical reactions used by aerobic organisms to generate energy through oxidation of acetyl-CoA.", "source": "OpenStax Biology"},
    {"term": "ATP (Adenosine Triphosphate)", "category": "Biochemistry", "definition": "High-energy organic compound providing energy to drive many cellular processes in living organisms.", "source": "OpenStax Biology"},
    {"term": "Allosteric Regulation", "category": "Biochemistry", "definition": "Regulation of an enzyme by binding an effector molecule at a site other than the active site.", "source": "OpenStax Biology"},

    # Ecology & Evolution
    {"term": "Biodiversity", "category": "Ecology", "definition": "Variety and variability of life on Earth across genetic, species, and ecosystem levels.", "source": "OpenStax Biology"},
    {"term": "Ecosystem", "category": "Ecology", "definition": "Dynamic complex of plant, animal, and microorganism communities and their non-living environment interacting as a functional unit.", "source": "OpenStax Biology"},
    {"term": "Natural Selection", "category": "Evolution", "definition": "Differential survival and reproduction of individuals due to differences in phenotype.", "source": "OpenStax Biology"},
    {"term": "Hardy-Weinberg", "category": "Evolution", "definition": "Principle stating allele and genotype frequencies in a population remain constant in the absence of evolutionary influences.", "source": "OpenStax Biology"},
    {"term": "Shannon Index", "category": "Ecology", "definition": "Information statistic index (H') measuring species diversity taking into account abundance and evenness.", "source": "OpenStax Biology"},
    {"term": "Species Richness", "category": "Ecology", "definition": "Total count of different species represented in an ecological community, landscape, or region.", "source": "OpenStax Biology"},
    {"term": "Trophic Level", "category": "Ecology", "definition": "Hierarchical position an organism occupies in a food chain (e.g. primary producer, primary consumer).", "source": "OpenStax Biology"},
    {"term": "Carrying Capacity", "category": "Ecology", "definition": "Maximum population size of a biological species that a particular environment can sustain indefinitely.", "source": "OpenStax Biology"},
    {"term": "Symbiosis", "category": "Ecology", "definition": "Any close and long-term biological interaction between two different biological organisms.", "source": "OpenStax Biology"},
    {"term": "Speciation", "category": "Evolution", "definition": "Evolutionary process by which populations evolve into distinct, reproductively isolated species.", "source": "OpenStax Biology"},
    {"term": "Phylogeny", "category": "Evolution", "definition": "Evolutionary history and relationships among or within groups of organisms.", "source": "OpenStax Biology"}
]


def init_database():
    """Initializes tables, B-Tree indexes, and FTS5 virtual tables."""
    print(f"[*] Initializing SQLite Database at: {DB_PATH}")
    
    # Ensure directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    
    # High-performance PRAGMAs for bulk ingestion
    cur.execute("PRAGMA synchronous = NORMAL;")
    cur.execute("PRAGMA journal_mode = WAL;")  # Write-Ahead Logging for speed & concurrent reads
    cur.execute("PRAGMA foreign_keys = ON;")
    
    # --- 1. PROTEINS TABLE (B-Tree + External Content FTS5) ---
    cur.execute("""
    CREATE TABLE IF NOT EXISTS proteins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_proteins_code ON proteins(code);")
    
    # Virtual table for Full-Text Search (FTS5) using external content
    cur.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS proteins_fts USING fts5(
        name,
        content='proteins',
        content_rowid='id',
        tokenize='porter unicode61'
    );
    """)
    
    # --- 2. GLOSSARY TABLE (B-Tree + FTS5) ---
    cur.execute("""
    CREATE TABLE IF NOT EXISTS glossary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        definition TEXT NOT NULL,
        source TEXT DEFAULT 'OpenStax Biology'
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_glossary_category ON glossary(category);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_glossary_term ON glossary(term);")
    
    cur.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS glossary_fts USING fts5(
        term,
        definition,
        content='glossary',
        content_rowid='id',
        tokenize='porter unicode61'
    );
    """)
    
    conn.commit()
    conn.close()
    print("[+] Database schema successfully created with B-Tree indexes and FTS5 virtual tables.")


def seed_glossary():
    """Populates initial glossary terms and updates FTS index."""
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    
    print(f"[*] Seeding {len(INITIAL_GLOSSARY)} initial biology glossary terms...")
    records = [
        (g["term"], g["category"], g["definition"], g.get("source", "OpenStax Biology"))
        for g in INITIAL_GLOSSARY
    ]
    
    cur.executemany("""
    INSERT OR REPLACE INTO glossary (term, category, definition, source)
    VALUES (?, ?, ?, ?)
    """, records)
    
    # Rebuild FTS index for glossary
    cur.execute("INSERT INTO glossary_fts(glossary_fts) VALUES('rebuild');")
    conn.commit()
    
    cur.execute("SELECT count(*) FROM glossary;")
    count = cur.fetchone()[0]
    conn.close()
    print(f"[+] Glossary ready. Total terms in database: {count}")


def seed_proteins():
    """Ingests 253,205 protein records from tools/protein-index.json into SQLite."""
    if not PROTEIN_JSON.exists():
        print(f"[!] Warning: {PROTEIN_JSON} not found. Skipping protein ingestion.")
        return
        
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    
    # Check if already populated
    cur.execute("SELECT count(*) FROM proteins;")
    existing_count = cur.fetchone()[0]
    if existing_count > 10000:
        print(f"[+] Proteins table already contains {existing_count} records. Skipping re-ingestion.")
        conn.close()
        return
        
    print(f"[*] Reading {PROTEIN_JSON} (~31MB JSON)...")
    t0 = time.time()
    with open(PROTEIN_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"[+] Loaded {len(data):,} records from JSON into RAM in {time.time()-t0:.2f}s")
    
    print("[*] Inserting records into SQLite (with batching)...")
    t1 = time.time()
    
    records = []
    for item in data:
        code = item.get("code")
        name = item.get("name")
        if code and name:
            records.append((code.strip().upper(), name.strip()))
            
    # Bulk insert into main table
    cur.execute("PRAGMA synchronous = OFF;")
    cur.execute("BEGIN TRANSACTION;")
    cur.executemany("INSERT OR IGNORE INTO proteins (code, name) VALUES (?, ?);", records)
    conn.commit()
    print(f"[+] Main table populated ({len(records):,} records) in {time.time()-t1:.2f}s")
    
    # Build FTS5 inverted index
    print("[*] Building FTS5 inverted search index...")
    t2 = time.time()
    cur.execute("INSERT INTO proteins_fts(proteins_fts) VALUES('rebuild');")
    conn.commit()
    print(f"[+] FTS5 index rebuilt in {time.time()-t2:.2f}s")
    
    cur.execute("SELECT count(*) FROM proteins;")
    final_count = cur.fetchone()[0]
    conn.close()
    
    size_mb = DB_PATH.stat().st_size / (1024 * 1024)
    print(f"[+] DONE! Total proteins in database: {final_count:,} (Database file size: {size_mb:.2f} MB)")


def test_queries():
    """Runs verification queries to show speed and query results."""
    print("\n" + "=" * 55)
    print("🚀 RUNNING LIVE SQL BENCHMARKS & VERIFICATION")
    print("=" * 55)
    
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    
    # 1. PDB Code Lookup (B-Tree Index)
    test_code = "1XED"
    t0 = time.time()
    cur.execute("SELECT code, name FROM proteins WHERE code = ?", (test_code,))
    res = cur.fetchone()
    pdb_time = (time.time() - t0) * 1000
    print(f"\n1. B-Tree Primary Key Lookup for '{test_code}':")
    print(f"   Result: {res}")
    print(f"   ⚡ Speed: {pdb_time:.3f} ms")
    
    # 2. Protein Keyword Search (FTS5 Inverted Index)
    keyword = "hemoglobin*"
    t1 = time.time()
    cur.execute("""
    SELECT p.code, p.name
    FROM proteins_fts f
    JOIN proteins p ON p.id = f.rowid
    WHERE proteins_fts MATCH ?
    LIMIT 5;
    """, (keyword,))
    results = cur.fetchall()
    fts_time = (time.time() - t1) * 1000
    print(f"\n2. FTS5 Keyword Search across 2.53 Lakh proteins for '{keyword}':")
    for r in results:
        print(f"   - [{r[0]}] {r[1][:65]}...")
    print(f"   ⚡ Speed: {fts_time:.3f} ms")
    
    # 3. Glossary Search
    t2 = time.time()
    cur.execute("""
    SELECT g.term, g.category, g.definition
    FROM glossary_fts f
    JOIN glossary g ON g.id = f.rowid
    WHERE glossary_fts MATCH 'enzyme* OR catalyst*'
    LIMIT 3;
    """)
    glossary_res = cur.fetchall()
    glossary_time = (time.time() - t2) * 1000
    print(f"\n3. Glossary FTS5 Search for 'enzyme* OR catalyst*':")
    for r in glossary_res:
        print(f"   - {r[0]} ({r[1]}): {r[2][:75]}...")
    print(f"   ⚡ Speed: {glossary_time:.3f} ms")
    
    print("\n" + "=" * 55)
    conn.close()


if __name__ == "__main__":
    init_database()
    seed_glossary()
    seed_proteins()
    test_queries()
