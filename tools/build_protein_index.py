import json
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HOLDINGS_URL = "https://data.rcsb.org/rest/v1/holdings/current/entry_ids"
GRAPHQL_URL = "https://data.rcsb.org/graphql"
OUTPUT_FILE = Path(__file__).resolve().parent / "protein-index.json"
BATCH_SIZE = 800
RETRY_DELAY = 5
MAX_RETRIES = 3


def fetch_json(url):
    request = Request(url, headers={"User-Agent": "Python protein index builder"})
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_entry_titles(batch):
    query = """
    query ($ids: [String!]!) {
      entries(entry_ids: $ids) {
        rcsb_id
        struct {
          title
        }
      }
    }
    """
    payload = json.dumps({"query": query, "variables": {"ids": batch}}).encode("utf-8")
    request = Request(GRAPHQL_URL, data=payload, headers={"Content-Type": "application/json", "User-Agent": "Python protein index builder"})
    with urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def build_index():
    print("Fetching current PDB IDs from RCSB holdings...")
    entry_ids = fetch_json(HOLDINGS_URL)
    print(f"Found {len(entry_ids)} current entries.")

    proteins = []
    total = len(entry_ids)
    for start in range(0, total, BATCH_SIZE):
        batch = entry_ids[start:start + BATCH_SIZE]
        print(f"Querying titles for entries {start + 1}-{start + len(batch)}...")

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                result = fetch_entry_titles(batch)
                break
            except (HTTPError, URLError) as exc:
                print(f"Batch failed (attempt {attempt}/{MAX_RETRIES}): {exc}")
                if attempt == MAX_RETRIES:
                    raise
                time.sleep(RETRY_DELAY)
        else:
            raise RuntimeError("Failed to fetch GraphQL batch after retries.")

        entries = result.get("data", {}).get("entries", [])
        for entry in entries:
            if not entry:
                continue
            pdb_id = entry.get("rcsb_id")
            title = entry.get("struct", {}).get("title") or "Untitled"
            if pdb_id:
                proteins.append({"name": title, "code": pdb_id})

    return proteins


def save_index(proteins):
    print(f"Saving {len(proteins)} protein records to {OUTPUT_FILE.name}...")
    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(proteins, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    try:
        proteins = build_index()
        save_index(proteins)
        print("Done. You can now use protein-index.json as the local fallback.")
    except Exception as exc:
        print("Failed to build protein index:", exc)
