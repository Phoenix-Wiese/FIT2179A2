import csv
import json
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT = Path(r"c:\Users\phoenix\OneDrive\Documents\School 2026\FIT2179 - Data vis\A2")
CSV_PATH = ROOT / "data" / "Love song categories for Billboard Top 10 hits, 1958 - September 2023, from The Pudding.csv"
CACHE_PATH = ROOT / "data" / "artist_country_cache.json"


def primary_artist(artist_list: str) -> str:
    if not artist_list:
        return ""
    return artist_list.split("|")[0].strip()


def normalize_country(country: str) -> str:
    c = (country or "").strip()
    if not c:
        return ""
    m = {
        "USA": "United States",
        "U.S.A.": "United States",
        "United States of America": "United States",
        "UK": "United Kingdom",
        "U.K.": "United Kingdom",
        "England": "United Kingdom",
        "Scotland": "United Kingdom",
        "Wales": "United Kingdom",
        "Northern Ireland": "United Kingdom",
        "Great Britain": "United Kingdom",
    }
    return m.get(c, c)


def fetch_json(url: str, headers=None, timeout=20):
    req = Request(url, headers=headers or {})
    with urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def lookup_audio_db(name: str) -> str:
    url = f"https://theaudiodb.com/api/v1/json/2/search.php?s={quote(name)}"
    try:
        data = fetch_json(url, timeout=15)
        artists = data.get("artists") or []
        if not artists:
            return ""
        exact = next((a for a in artists if (a.get("strArtist") or "") == name), artists[0])
        return normalize_country(exact.get("strCountry") or "")
    except Exception:
        return ""


def lookup_musicbrainz(name: str) -> str:
    q = quote(f'artist:"{name}"')
    url = f"https://musicbrainz.org/ws/2/artist/?query={q}&fmt=json&limit=5"
    headers = {"User-Agent": "FIT2179-Country-Enricher/1.0 (educational project)"}
    try:
        data = fetch_json(url, headers=headers, timeout=20)
        artists = data.get("artists") or []
        artists.sort(key=lambda a: int(a.get("score", 0)), reverse=True)
        for a in artists:
            if int(a.get("score", 0)) < 70:
                continue
            area = (a.get("area") or {}).get("name", "")
            if not area:
                area = (a.get("begin-area") or {}).get("name", "")
            c = normalize_country(area)
            if c:
                return c
    except Exception:
        return ""
    return ""


with CSV_PATH.open("r", encoding="utf-8", newline="") as f:
    rows = list(csv.DictReader(f))

artists = sorted({primary_artist(r.get("pipe_delimited_artist_list", "")) for r in rows if primary_artist(r.get("pipe_delimited_artist_list", ""))})

if CACHE_PATH.exists():
    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
else:
    cache = {}

remaining = [a for a in artists if a not in cache]
print(f"Rows: {len(rows)}")
print(f"Unique primary artists: {len(artists)}")
print(f"Artists already cached: {len(cache)}")
print(f"Artists remaining: {len(remaining)}")

processed = 0
for name in remaining:
    country = lookup_audio_db(name)
    if not country:
        country = lookup_musicbrainz(name)
        time.sleep(1.05)
    cache[name] = country
    processed += 1
    if processed % 100 == 0:
        CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Processed {processed}/{len(remaining)} remaining artists")

CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

for r in rows:
    r["country"] = cache.get(primary_artist(r.get("pipe_delimited_artist_list", "")), "")

with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

filled_rows = sum(1 for r in rows if (r.get("country") or "").strip())
filled_artists = sum(1 for v in cache.values() if (v or "").strip())
print(f"Artists resolved: {filled_artists}/{len(artists)}")
print(f"Rows populated: {filled_rows}/{len(rows)}")
