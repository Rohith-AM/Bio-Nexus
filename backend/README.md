# Bio-Nexus Intelligence Backend Configuration

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Serper API
Get your free API key from [https://serper.dev](https://serper.dev)

Create a `.env` file in the backend folder:
```
SERPER_API_KEY=your-actual-api-key-here
```

### 3. Run the Backend
```bash
python biosphere-ai.py
```

The backend will start on `http://localhost:5000`

## API Endpoints

### `/api/fuzzy-search` (POST)
**Fuzzy species name matching with typo tolerance**

Request:
```json
{
  "query": "panthera tigis",  // Note the typo!
  "threshold": 70
}
```

Response:
```json
{
  "query": "panthera tigis",
  "matches": [
    {
      "id": 40151,
      "name": "Panthera tigris",
      "preferred_common_name": "Tiger",
      "match_score": 95,
      "matched_field": "scientific"
    },
    // ... more matches
  ]
}
```

### `/api/web-search` (POST)
**Web search for species information**

Request:
```json
{
  "species": "Panthera tigris",
  "type": "general"  // or "behavior", "conservation", "distribution", "diet"
}
```

Response:
```json
{
  "query": "Panthera tigris species biology habitat",
  "results": [
    {
      "title": "Tiger - Wikipedia",
      "snippet": "The tiger is the largest...",
      "source": "Wikipedia",
      "link": "https://...",
      "date": "2024-01-15"
    }
  ]
}
```

### `/api/rag-query` (POST)
**RAG: Retrieve web context and provide grounded answers**

Request:
```json
{
  "species": "Panthera tigris",
  "question": "What is the conservation status?"
}
```

Response:
```json
{
  "species": "Panthera tigris",
  "question": "What is the conservation status?",
  "context": "...[summarized from top 5 search results]...",
  "sources": ["https://...", "https://..."],
  "search_results": [...]
}
```

### `/api/combined-search` (POST)
**Smart unified search (fuzzy + web + RAG)**

Request:
```json
{
  "query": "bengal tyger"  // Even with typos!
}
```

Response:
```json
{
  "query": "bengal tyger",
  "species_name": "Panthera tigris",
  "common_name": "Tiger",
  "match_score": 88,
  "fuzzy_alternatives": [...],
  "web_context": [...],
  "image": "https://..."
}
```

## Features

### 1. FuzzyWuzzy Matching
- Handles spelling mistakes automatically
- Token-set-ratio for flexible matching
- Common misspelling corrections
- Confidence scoring

### 2. Web Search Integration
- Serper API for real-time search results
- Context-aware queries (biology, behavior, conservation, etc.)
- News/article filtering for scientific information

### 3. RAG Implementation
- Retrieves search results as context
- Provides grounded information with sources
- Perfect for rare species queries
- Source attribution

## Environment Variables

```
SERPER_API_KEY = Your Serper API key
FLASK_ENV = development or production
DEBUG = True or False
```

## Architecture

```
┌─────────────────────────────────────┐
│   Bio-Nexus Intelligence (JS)       │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   Backend API (Flask)               │
│  /api/fuzzy-search                  │
│  /api/web-search                    │
│  /api/rag-query                     │
│  /api/combined-search               │
└────────┬───────────┬─────────────┬──┘
         │           │             │
         ▼           ▼             ▼
    ┌─────────┐ ┌─────────┐  ┌──────────┐
    │FuzzyWuzzy│ │Serper   │  │iNaturalist
    │          │ │Google   │  │GBIF
    │          │ │Search   │  │APIs
    └─────────┘ └─────────┘  └──────────┘
```
