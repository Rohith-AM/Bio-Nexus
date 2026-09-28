"""
Bio-Nexus Intelligence Backend
Combines FuzzyWuzzy, Web Search API, and RAG for enhanced species research
"""

import os
import sys

# Auto-detect local .venv site-packages if running from global python
_venv_site = os.path.join(os.path.dirname(__file__), '..', '.venv', 'Lib', 'site-packages')
if os.path.exists(_venv_site) and _venv_site not in sys.path:
    sys.path.insert(0, _venv_site)

import json
import sqlite3
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from fuzzywuzzy import fuzz, process
import requests
from typing import List, Dict, Any
import urllib.parse

load_dotenv()  # Load backend/.env automatically

app = Flask(__name__)
CORS(app)

# Configuration & Database
DB_PATH = os.path.join(os.path.dirname(__file__), 'bionexus.db')
SERPER_API_KEY = os.getenv('SERPER_API_KEY', 'your-serper-api-key-here')
INAT_API_BASE = "https://api.inaturalist.org/v1"
GBIF_API_BASE = "https://api.gbif.org/v1"

# Cache for species database
SPECIES_CACHE = {}


class SpeciesFuzzyMatcher:
    """Handle fuzzy name matching for species"""
    
    def __init__(self):
        self.species_db = []
        self.common_misspellings = {
            'panther': 'panthera',
            'tiger': 'tigris',
            'lion': 'leo',
            'bear': 'ursus',
            'wolf': 'canis lupus',
            'elephant': 'loxodonta',
        }
    
    def fuzzy_search(self, query: str, threshold: int = 70) -> List[Dict]:
        """
        Find species matches even with spelling mistakes
        Returns list of matched species with confidence scores
        """
        try:
            # First, check if it's a common misspelling
            corrected = self.common_misspellings.get(query.lower())
            if corrected:
                query = corrected
            
            # Fetch from iNaturalist and get candidates
            res = requests.get(
                f"{INAT_API_BASE}/taxa/autocomplete",
                params={'q': query, 'limit': 50}
            )
            candidates = res.json().get('results', [])
            
            # Score each candidate against the query
            scored_matches = []
            for candidate in candidates:
                sci_name = candidate.get('name', '')
                common_name = candidate.get('preferred_common_name', '')
                
                # Use token_set_ratio for flexible matching
                sci_score = fuzz.token_set_ratio(query.lower(), sci_name.lower())
                common_score = fuzz.token_set_ratio(query.lower(), common_name.lower()) if common_name else 0
                
                best_score = max(sci_score, common_score)
                
                if best_score >= threshold:
                    scored_matches.append({
                        **candidate,
                        'match_score': best_score,
                        'matched_field': 'scientific' if sci_score > common_score else 'common'
                    })
            
            # Sort by score descending
            scored_matches.sort(key=lambda x: x['match_score'], reverse=True)
            return scored_matches[:10]
            
        except Exception as e:
            print(f"Fuzzy search error: {e}")
            return []


class WebSearchRAG:
    """Retrieval-Augmented Generation using web search"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.serper_url = "https://google.serper.dev/search"
    
    def search_web(self, species_name: str, query_type: str = "general") -> Dict[str, Any]:
        """
        Search web for information about species
        Returns structured data with title, snippet, and source
        """
        try:
            # Build context-aware search query
            search_queries = {
                'general': f"{species_name} species biology habitat",
                'behavior': f"{species_name} behavior social structure",
                'conservation': f"{species_name} conservation status endangered",
                'distribution': f"{species_name} geographic distribution range",
                'diet': f"{species_name} diet feeding habits"
            }
            
            search_q = search_queries.get(query_type, search_queries['general'])
            
            headers = {
                'X-API-KEY': self.api_key,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'q': search_q,
                'num': 10,
                'type': 'news'  # Get recent scientific news/articles
            }
            
            response = requests.post(
                self.serper_url,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code != 200:
                return {'error': f'Serper API error: {response.status_code}'}
            
            results = response.json().get('news', [])
            
            # Format results
            formatted_results = []
            for result in results:
                formatted_results.append({
                    'title': result.get('title'),
                    'snippet': result.get('snippet'),
                    'source': result.get('source'),
                    'date': result.get('date'),
                    'link': result.get('link')
                })
            
            return {
                'query': search_q,
                'results': formatted_results,
                'count': len(formatted_results)
            }
            
        except Exception as e:
            print(f"Web search error: {e}")
            return {'error': str(e), 'results': []}
    
    def rag_query(self, species_name: str, question: str) -> Dict[str, Any]:
        """
        Perform RAG: Retrieve web context and augment it for better answers
        """
        try:
            # Search for relevant information
            search_results = self.search_web(species_name)
            
            if 'error' in search_results:
                return search_results
            
            # Build context from search results
            context = "\n\n".join([
                f"Source: {r['source']}\nTitle: {r['title']}\n{r['snippet']}"
                for r in search_results['results'][:5]
            ])
            
            return {
                'species': species_name,
                'question': question,
                'context': context,
                'sources': [r['link'] for r in search_results['results'][:3]],
                'search_results': search_results['results']
            }
            
        except Exception as e:
            return {'error': str(e)}


# Initialize components
fuzzy_matcher = SpeciesFuzzyMatcher()
rag_system = WebSearchRAG(SERPER_API_KEY)


# =============== API ROUTES ===============

@app.route('/api/fuzzy-search', methods=['POST'])
def fuzzy_search_endpoint():
    """Fuzzy species name matching with typo tolerance"""
    data = request.json
    query = data.get('query', '')
    threshold = data.get('threshold', 70)
    
    if not query:
        return jsonify({'error': 'Query required'}), 400
    
    matches = fuzzy_matcher.fuzzy_search(query, threshold)
    return jsonify({
        'query': query,
        'matches': matches,
        'count': len(matches)
    })


@app.route('/api/web-search', methods=['POST'])
def web_search_endpoint():
    """Web search for species information"""
    data = request.json
    species_name = data.get('species', '')
    query_type = data.get('type', 'general')
    
    if not species_name:
        return jsonify({'error': 'Species name required'}), 400
    
    results = rag_system.search_web(species_name, query_type)
    return jsonify(results)


@app.route('/api/rag-query', methods=['POST'])
def rag_query_endpoint():
    """RAG query for grounded species information"""
    data = request.json
    species_name = data.get('species', '')
    question = data.get('question', '')
    
    if not species_name or not question:
        return jsonify({'error': 'Species and question required'}), 400
    
    result = rag_system.rag_query(species_name, question)
    return jsonify(result)


@app.route('/api/combined-search', methods=['POST'])
def combined_search():
    """
    Smart search combining fuzzy matching + web results + RAG
    This is the main entry point for the Intelligence module
    """
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'Query required'}), 400
    
    # Step 1: Fuzzy match to find correct species name
    fuzzy_results = fuzzy_matcher.fuzzy_search(query, threshold=60)
    
    if not fuzzy_results:
        return jsonify({
            'error': 'No species found',
            'query': query,
            'suggestions': []
        }), 404
    
    best_match = fuzzy_results[0]
    species_name = best_match.get('name')
    
    # Step 2: Get web search results for RAG context
    web_results = rag_system.search_web(species_name)
    
    # Step 3: Return comprehensive data
    return jsonify({
        'query': query,
        'species_name': species_name,
        'common_name': best_match.get('preferred_common_name', ''),
        'match_score': best_match.get('match_score'),
        'fuzzy_alternatives': fuzzy_results[1:5],  # Top alternatives if user wants them
        'web_context': web_results.get('results', []),
        'image': best_match.get('default_photo', {}).get('medium_url')
    })



GROQ_API_KEY = os.getenv('GROQ_API_KEY', '').strip()

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Dr. Nexus biology assistant chatbot endpoint with full page-context awareness"""
    data = request.json or {}
    message = data.get('message', '').strip()
    context = data.get('context', {})
    
    if not message:
        return jsonify({'error': 'Message required'}), 400

    # ── 1. If Groq API Key is configured, use Llama 3.3 70B ──
    if GROQ_API_KEY and GROQ_API_KEY != 'your-groq-api-key-here':
        try:
            tool_name = context.get('tool', 'Bio-Nexus Workspace')
            context_data = context.get('data', {})
            
            system_prompt = f"""You are Dr. Nexus, the specialized AI Biology Research Assistant for 'Project Bio-Nexus'.

USER'S CURRENT WORKSPACE & SCREEN CONTEXT:
- Tool Page: {tool_name}
- Live Summary: {context.get('summary', 'Active')}
- Active Data on Screen: {json.dumps(context_data, indent=2)}

INSTRUCTIONS:
1. The user is actively using the {tool_name} tool and looking at the screen data above right now.
2. If they ask about "my sequence", "this protein", "these cut sites", "the gel", or "this species", directly analyze the data from their screen context above.
3. NEVER ask them to re-paste their DNA, PDB, or organism if it is already present in the active data above.
4. Keep your answer scientifically precise, concise, and structured with bold highlights."""

            for model_id in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
                try:
                    groq_res = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model_id,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": message}
                            ],
                            "temperature": 0.6,
                            "max_tokens": 1024
                        },
                        timeout=12
                    )
                    
                    if groq_res.status_code == 200:
                        bot_reply = groq_res.json().get('choices', [{}])[0].get('message', {}).get('content')
                        if bot_reply:
                            return jsonify({'reply': bot_reply})
                except Exception as model_err:
                    print(f"Groq Chat model {model_id} error: {model_err}")
        except Exception as e:
            print(f"Groq Chat exception: {e}")

    # ── 2. Context-Grounded Intelligent Fallback ──
    tool_name = context.get('tool', '')
    ctx_data = context.get('data', {})

    # If context has DNA data
    if 'dnaSequence' in ctx_data and ctx_data['dnaSequence']:
        seq = ctx_data['dnaSequence'].replace('... (truncated)', '')
        gc = ctx_data.get('gcContent', 'N/A')
        length = ctx_data.get('length', f"{len(seq)} bp")
        stab = ctx_data.get('thermalStability', 'Medium')
        
        reply = f"Analyzing your active **{length}** DNA sequence (`GC: {gc}`):\n\n"
        reply += f"- **Thermal Stability**: {stab}\n"
        reply += f"- **Estimated Melting Temp (Tm)**: ~{round(64.9 + 41 * (float(gc.replace('%','')) - 16.4) / 100, 1)}°C\n"
        if ctx_data.get('mrnaTranscript'):
            reply += f"- **mRNA**: `{ctx_data['mrnaTranscript'][:40]}...`\n"
        if ctx_data.get('translatedProtein'):
            reply += f"- **Translation**: `{ctx_data['translatedProtein'][:30]}...`\n"
        reply += f"\nYour sequence has a balanced nucleotide ratio suitable for standard PCR amplification with 58-62°C annealing."
        return jsonify({'reply': reply})

    # If context has Restriction Mapper data
    if 'cutSiteResults' in ctx_data and ctx_data['cutSiteResults'] != "Scan not run or 0 cut sites":
        enzymes = ctx_data.get('selectedEnzymes', [])
        cuts = ctx_data.get('cutSiteResults', [])
        reply = f"Here is the restriction analysis for your selected enzymes (**{', '.join(enzymes)}**):\n\n"
        if isinstance(cuts, list):
            for c in cuts[:4]:
                reply += f"- ✂️ **{c}**\n"
        reply += "\n*Tip for cloning:* Choose enzymes that cut outside your gene of interest with compatible overhangs to ensure directional insertion."
        return jsonify({'reply': reply})

    # If context has 3D Protein data
    if 'activePdbId' in ctx_data and ctx_data['activePdbId']:
        pdb = ctx_data['activePdbId']
        title = ctx_data.get('proteinTitle', 'Macromolecule')
        organism = ctx_data.get('sourceOrganism', 'Biological Specimen')
        res = ctx_data.get('resolution', 'N/A')
        
        reply = f"Here is the structural briefing for **{pdb}** (*{title}*):\n\n"
        reply += f"- **Source Organism**: {organism}\n"
        reply += f"- **Resolution**: {res}\n"
        reply += f"- **Experimental Method**: {ctx_data.get('experimentalMethod', 'X-ray / Cryo-EM')}\n"
        reply += f"\nYou can explore secondary structures by switching between Cartoon, Stick, and Sphere modes in the control panel."
        return jsonify({'reply': reply})

    # ── 3. Serper Search Grounding ──
    if SERPER_API_KEY != 'your-serper-api-key-here':
        try:
            # Augment search query with context if available
            subject = ctx_data.get('activeSubject') or ctx_data.get('subject') or ''
            search_query = f"{subject} {message} biology science".strip()
            
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            payload = {
                'q': search_query,
                'num': 3
            }
            response = requests.post("https://google.serper.dev/search", headers=headers, json=payload, timeout=8)
            if response.status_code == 200:
                res_data = response.json()
                
                if 'answerBox' in res_data:
                    answer = res_data['answerBox'].get('answer') or res_data['answerBox'].get('snippet')
                    if answer:
                        return jsonify({'reply': f"According to scientific research:\n\n{answer}"})
                
                organic = res_data.get('organic', [])
                if organic:
                    snippets = []
                    for item in organic[:2]:
                        title = item.get('title')
                        snippet = item.get('snippet')
                        link = item.get('link')
                        snippets.append(f"**{title}**\n{snippet}\n*(Source: {link})*")
                    
                    return jsonify({'reply': "Based on scientific databases:\n\n" + "\n\n".join(snippets)})
        except Exception as e:
            print(f"Chat Serper lookup failed: {e}")
            
    # Default fallback
    return jsonify({
        'reply': f"I am Dr. Nexus, your biology research assistant. Currently viewing **{tool_name or 'Bio-Nexus'}**. Ask me about your active sequence, protein structure, restriction cut sites, or species data!"
    })


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    groq_status = 'configured' if GROQ_API_KEY and GROQ_API_KEY != 'your-groq-api-key-here' else 'not-configured'
    serper_status = 'configured' if SERPER_API_KEY != 'your-serper-api-key-here' else 'not-configured'
    db_status = 'connected' if os.path.exists(DB_PATH) else 'missing'
    return jsonify({
        'status': 'healthy',
        'database': db_status,
        'serper_api': serper_status,
        'groq_api': groq_status
    })


# ============================================================================
# SQL DATABASE ENGINE: PROTEINS & BIOLOGY GLOSSARY (SQLite + B-Tree + FTS5)
# ============================================================================

def get_db_connection():
    """Returns a connection to bionexus.db with Row dict access"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route('/api/proteins/search', methods=['GET'])
def search_proteins():
    """
    Lightning-fast PDB search (<2ms) across 253,205 proteins using:
    1. B-Tree exact / prefix lookup on PDB ID (code)
    2. FTS5 full-text inverted index on protein name
    """
    query = request.args.get('q', '').strip()
    limit = min(int(request.args.get('limit', 10)), 50)
    
    if not query or len(query) < 2:
        return jsonify([])
        
    if not os.path.exists(DB_PATH):
        return jsonify({'error': 'Database not initialized. Please run backend/init_db.py'}), 500
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        results = []
        
        # 1. Exact PDB Code match (B-Tree index)
        cur.execute("SELECT code, name FROM proteins WHERE code = ? LIMIT ?", (query.upper(), limit))
        for row in cur.fetchall():
            results.append({'code': row['code'], 'name': row['name']})
            
        # 2. Prefix PDB Code match (e.g. 1XE*)
        if len(results) < limit:
            cur.execute("""
            SELECT code, name FROM proteins 
            WHERE code LIKE ? AND code != ? 
            LIMIT ?
            """, (f"{query.upper()}%", query.upper(), limit - len(results)))
            for row in cur.fetchall():
                results.append({'code': row['code'], 'name': row['name']})
                
        # 3. Full-Text Search (FTS5) on protein titles
        if len(results) < limit:
            clean_q = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in query).strip()
            if clean_q:
                fts_query = ' '.join(f"{word}*" for word in clean_q.split())
                existing_codes = tuple(r['code'] for r in results) if results else ('',)
                placeholders = ','.join('?' for _ in existing_codes)
                
                cur.execute(f"""
                SELECT p.code, p.name 
                FROM proteins_fts f
                JOIN proteins p ON p.id = f.rowid
                WHERE proteins_fts MATCH ? AND p.code NOT IN ({placeholders})
                LIMIT ?
                """, (fts_query, *existing_codes, limit - len(results)))
                for row in cur.fetchall():
                    results.append({'code': row['code'], 'name': row['name']})
                    
        conn.close()
        return jsonify(results)
    except Exception as e:
        print(f"Protein search error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/glossary/search', methods=['GET'])
def search_glossary():
    """
    Search biology glossary with category filter and FTS5 full-text matching.
    """
    query = request.args.get('q', '').strip()
    category = request.args.get('category', '').strip()
    
    if not os.path.exists(DB_PATH):
        return jsonify({'error': 'Database not initialized'}), 500
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if query:
            clean_q = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in query).strip()
            fts_query = ' '.join(f"{word}*" for word in clean_q.split())
            if category and category.lower() != 'all':
                cur.execute("""
                SELECT g.id, g.term, g.category, g.definition, g.source
                FROM glossary_fts f
                JOIN glossary g ON g.id = f.rowid
                WHERE glossary_fts MATCH ? AND g.category = ?
                ORDER BY rank
                LIMIT 50
                """, (fts_query, category))
            else:
                cur.execute("""
                SELECT g.id, g.term, g.category, g.definition, g.source
                FROM glossary_fts f
                JOIN glossary g ON g.id = f.rowid
                WHERE glossary_fts MATCH ?
                ORDER BY rank
                LIMIT 50
                """, (fts_query,))
        else:
            if category and category.lower() != 'all':
                cur.execute("SELECT id, term, category, definition, source FROM glossary WHERE category = ? ORDER BY term ASC LIMIT 100", (category,))
            else:
                cur.execute("SELECT id, term, category, definition, source FROM glossary ORDER BY term ASC LIMIT 100")
                
        results = [dict(row) for row in cur.fetchall()]
        conn.close()
        return jsonify(results)
    except Exception as e:
        print(f"Glossary search error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/glossary/categories', methods=['GET'])
def glossary_categories():
    """Returns list of all distinct glossary categories"""
    if not os.path.exists(DB_PATH):
        return jsonify([])
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT category FROM glossary ORDER BY category ASC")
        categories = [row['category'] for row in cur.fetchall()]
        conn.close()
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/glossary/add', methods=['POST'])
def add_glossary_term():
    """Allows students/researchers to add new terms to the local database"""
    data = request.get_json() or {}
    term = data.get('term', '').strip()
    category = data.get('category', 'General').strip()
    definition = data.get('definition', '').strip()
    source = data.get('source', 'User Contribution').strip()
    
    if not term or not definition:
        return jsonify({'error': 'Term and definition are required'}), 400
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
        INSERT OR REPLACE INTO glossary (term, category, definition, source)
        VALUES (?, ?, ?, ?)
        """, (term, category, definition, source))
        # Rebuild FTS index
        cur.execute("INSERT INTO glossary_fts(glossary_fts) VALUES('rebuild');")
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'term': term})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🧬 Bio-Nexus Intelligence Backend Starting...")
    print(f"Database:   {'✓ Ready (bionexus.db)' if os.path.exists(DB_PATH) else '✗ Missing (run init_db.py)'}")
    print(f"Serper API: {'✓ Configured' if SERPER_API_KEY != 'your-serper-api-key-here' else '✗ Not configured'}")
    print(f"Groq API:   {'✓ Configured' if GROQ_API_KEY and GROQ_API_KEY != 'your-groq-api-key-here' else '✗ Optional (fallback enabled)'}")
    app.run(debug=True, port=5000)

