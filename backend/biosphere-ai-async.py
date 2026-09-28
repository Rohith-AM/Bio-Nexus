"""
Bio-Nexus Intelligence Backend (Async Version)
Advanced implementation with proper async/await support
"""

import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from fuzzywuzzy import fuzz, process
import aiohttp
import asyncio
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
SERPER_API_KEY = os.getenv('SERPER_API_KEY', 'your-serper-api-key-here')
INAT_API_BASE = "https://api.inaturalist.org/v1"
GBIF_API_BASE = "https://api.gbif.org/v1"

# Request session (will be created in async context)
SESSION = None


async def get_session():
    """Get or create aiohttp session"""
    global SESSION
    if SESSION is None:
        SESSION = aiohttp.ClientSession()
    return SESSION


class SpeciesFuzzyMatcher:
    """Handle fuzzy name matching for species"""
    
    def __init__(self):
        self.species_db = {}
        self.common_misspellings = {
            'panther': 'panthera leo',
            'tiger': 'panthera tigris',
            'lion': 'panthera leo',
            'bear': 'ursus',
            'wolf': 'canis lupus',
            'elephant': 'loxodonta africana',
            'monkey': 'cercopithecidae',
            'snake': 'serpentes',
            'bird': 'aves',
            'fish': 'pisces',
            'whale': 'cetacea',
            'penguin': 'spheniscidae',
            'dolphin': 'delphinidae',
            'shark': 'selachimorpha',
            'platapus': 'ornithorhynchus anatinus',
            'africain': 'africana',
            'afican': 'africana'
        }
    
    async def fuzzy_search(self, query: str, threshold: int = 70) -> List[Dict]:
        """
        Find species matches even with spelling mistakes
        Returns list of matched species with confidence scores
        """
        try:
            session = await get_session()
            
            # Check if it's a common misspelling
            for misspelling, correct in self.common_misspellings.items():
                if misspelling.lower() in query.lower():
                    query = correct
                    break
            
            # Fetch from iNaturalist with async
            async with session.get(
                f"{INAT_API_BASE}/taxa/autocomplete",
                params={'q': query, 'limit': 50}
            ) as resp:
                data = await resp.json()
            
            candidates = data.get('results', [])
            
            # Score each candidate
            scored_matches = []
            for candidate in candidates:
                sci_name = candidate.get('name', '')
                common_name = candidate.get('preferred_common_name', '')
                
                sci_score = fuzz.token_set_ratio(query.lower(), sci_name.lower())
                common_score = fuzz.token_set_ratio(query.lower(), common_name.lower()) if common_name else 0
                
                best_score = max(sci_score, common_score)
                
                if best_score >= threshold:
                    scored_matches.append({
                        **candidate,
                        'match_score': best_score,
                        'matched_field': 'scientific' if sci_score > common_score else 'common'
                    })
            
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
    
    async def search_web(self, species_name: str, query_type: str = "general") -> Dict[str, Any]:
        """Search web for information about species"""
        try:
            session = await get_session()
            
            search_queries = {
                'general': f"{species_name} species biology habitat behavior",
                'behavior': f"{species_name} behavior social structure pack hunting",
                'conservation': f"{species_name} conservation status endangered IUCN red list",
                'distribution': f"{species_name} geographic distribution range habitat where found",
                'diet': f"{species_name} diet feeding habits predator prey carnivore"
            }
            
            search_q = search_queries.get(query_type, search_queries['general'])
            
            headers = {
                'X-API-KEY': self.api_key,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'q': search_q,
                'num': 10,
                'type': 'news'
            }
            
            async with session.post(
                self.serper_url,
                headers=headers,
                json=payload
            ) as resp:
                if resp.status != 200:
                    return {'error': f'Serper API error: {resp.status}'}
                
                result_json = await resp.json()
            
            results = result_json.get('news', [])
            
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
    
    async def rag_query(self, species_name: str, question: str) -> Dict[str, Any]:
        """Perform RAG: Retrieve web context and augment it for better answers"""
        try:
            search_results = await self.search_web(species_name)
            
            if 'error' in search_results:
                return search_results
            
            context = "\n\n".join([
                f"**{r['source']}** ({r.get('date', 'N/A')})\n{r['title']}\n{r['snippet']}"
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
    
    # Run async function
    matches = asyncio.run(fuzzy_matcher.fuzzy_search(query, threshold))
    
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
    
    results = asyncio.run(rag_system.search_web(species_name, query_type))
    return jsonify(results)


@app.route('/api/rag-query', methods=['POST'])
def rag_query_endpoint():
    """RAG query for grounded species information"""
    data = request.json
    species_name = data.get('species', '')
    question = data.get('question', '')
    
    if not species_name or not question:
        return jsonify({'error': 'Species and question required'}), 400
    
    result = asyncio.run(rag_system.rag_query(species_name, question))
    return jsonify(result)


@app.route('/api/combined-search', methods=['POST'])
def combined_search():
    """Smart search combining fuzzy matching + web results + RAG"""
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({'error': 'Query required'}), 400
    
    # Step 1: Fuzzy match
    fuzzy_results = asyncio.run(fuzzy_matcher.fuzzy_search(query, threshold=60))
    
    if not fuzzy_results:
        return jsonify({
            'error': 'No species found',
            'query': query,
            'suggestions': []
        }), 404
    
    best_match = fuzzy_results[0]
    species_name = best_match.get('name')
    
    # Step 2: Get web results
    web_results = asyncio.run(rag_system.search_web(species_name))
    
    # Step 3: Return comprehensive data
    return jsonify({
        'query': query,
        'species_name': species_name,
        'common_name': best_match.get('preferred_common_name', ''),
        'match_score': best_match.get('match_score'),
        'fuzzy_alternatives': fuzzy_results[1:5],
        'web_context': web_results.get('results', []),
        'image': best_match.get('default_photo', {}).get('medium_url')
    })



async def get_chat_reply(message: str) -> str:
    """Helper to process chat messages asynchronously"""
    # 1. Look for species queries (e.g. "tell me about tiger", "what is a falcon")
    query = message.lower()
    for filler in ['what is a ', 'what is ', 'tell me about ', 'search for ', 'who is ', 'about ']:
        query = query.replace(filler, '')
    query = query.strip()
    
    # Try searching for species if it looks like a species name
    if len(query) > 2:
        matches = await fuzzy_matcher.fuzzy_search(query, threshold=60)
        if matches:
            best_match = matches[0]
            common_name = best_match.get('preferred_common_name', '')
            sci_name = best_match.get('name', '')
            rank = best_match.get('rank', 'species')
            
            reply = f"I found a match for **{common_name or sci_name}** ({sci_name})!\n\n"
            reply += f"- **Rank**: {rank.capitalize()}\n"
            if best_match.get('wikipedia_url'):
                reply += f"- **Wikipedia**: {best_match.get('wikipedia_url')}\n"
            
            # Fetch some web news/snippets
            web_results = await rag_system.search_web(sci_name)
            if web_results and 'results' in web_results and len(web_results['results']) > 0:
                top_snippet = web_results['results'][0]['snippet']
                reply += f"\n**Quick Summary:**\n{top_snippet}\n"
            else:
                reply += f"\nFeel free to explore the full analysis drawer on the left side of the dashboard!"
            return reply

    # 2. General Biology Q&A Fallback via Serper Search using aiohttp
    if SERPER_API_KEY != 'your-serper-api-key-here':
        try:
            session = await get_session()
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            payload = {
                'q': message + " biology science",
                'num': 4
            }
            async with session.post("https://google.serper.dev/search", headers=headers, json=payload, timeout=8) as resp:
                if resp.status == 200:
                    res_data = await resp.json()
                    
                    # Check for answerBox
                    if 'answerBox' in res_data:
                        answer = res_data['answerBox'].get('answer') or res_data['answerBox'].get('snippet')
                        if answer:
                            return f"According to web research:\n\n{answer}"
                    
                    # Use top organic snippets
                    organic = res_data.get('organic', [])
                    if organic:
                        snippets = []
                        for item in organic[:2]:
                            title = item.get('title')
                            snippet = item.get('snippet')
                            link = item.get('link')
                            snippets.append(f"**{title}**\n{snippet}\n*(Source: {link})*")
                        
                        return "Based on my biology research database:\n\n" + "\n\n".join(snippets)
        except Exception as e:
            print(f"Chat Serper lookup failed: {e}")
            
    # Default fallback response
    return "I am Dr. Nexus, your virtual biology assistant. I can search species, transcribe DNA, map genomes, and look up research. Try asking me about a specific species like 'Platypus' or 'Ornithorhynchus anatinus'!"


@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Dr. Nexus biology assistant chatbot endpoint"""
    data = request.json
    message = data.get('message', '')
    if not message:
        return jsonify({'error': 'Message required'}), 400
    
    reply = asyncio.run(get_chat_reply(message))
    return jsonify({'reply': reply})


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    api_status = 'configured' if SERPER_API_KEY != 'your-serper-api-key-here' else 'not-configured'
    return jsonify({
        'status': 'healthy',
        'serper_api': api_status,
        'version': '2.0-async'
    })


@app.teardown_appcontext
def cleanup(exception):
    """Clean up session on app shutdown"""
    global SESSION
    if SESSION:
        asyncio.run(SESSION.close())


if __name__ == '__main__':
    print("🧬 Bio-Nexus Intelligence Backend v2.0 (Async) Starting...")
    print(f"Serper API Status: {'✓ Configured' if SERPER_API_KEY != 'your-serper-api-key-here' else '✗ Not configured'}")
    print("Running on http://localhost:5000")
    app.run(debug=True, port=5000)
