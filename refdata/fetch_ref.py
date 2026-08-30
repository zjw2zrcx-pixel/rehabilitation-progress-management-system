# -*- coding: utf-8 -*-
"""Fetch evidence-based rehabilitation reference data from public sources.

Sources:
  - Wikipedia (MediaWiki API, plaintext extracts)
Reusable numeric facts (FMA cutoffs, 6MWT normals, TUG cutoffs, ROM norms,
typical exercise programs) are harvested here and written as JSON for the
seed-data generator to consume.
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent

TOPICS = [
    ("Fugl-Meyer Assessment", "fma"),
    ("Barthel scale", "barthel"),
    ("Berg Balance Scale", "berg"),
    ("Six-minute walk test", "sixmwt"),
    ("Timed Up and Go test", "tug"),
    ("Range of motion", "rom"),
    ("Knee replacement", "knee"),
    ("Rotator cuff", "rotator"),
    ("Stroke recovery", "stroke"),
]


def wiki_extract(title: str) -> str:
    url = ("https://en.wikipedia.org/w/api.php"
           "?action=query&prop=extracts&explaintext=1&redirects=1&format=json"
           "&titles=" + urllib.parse.quote(title))
    req = urllib.request.Request(
        url, headers={"User-Agent": "RehabSysDataFetcher/1.0 (student research)"})
    with urllib.request.urlopen(req, timeout=25) as r:
        data = json.loads(r.read().decode("utf-8"))
    for p in data["query"]["pages"].values():
        return p.get("extract", "") or ""
    return ""


if __name__ == "__main__":
    ok, fail = [], []
    for title, name in TOPICS:
        try:
            text = wiki_extract(title)
            (OUT / f"{name}.txt").write_text(text, encoding="utf-8")
            ok.append((name, len(text)))
            print(f"OK  {name:8s} {len(text):7d} chars")
        except Exception as e:  # noqa: BLE001
            fail.append((name, str(e)))
            print(f"ERR {name:8s} {e}")
        time.sleep(0.4)
    print(f"\n{len(ok)} saved, {len(fail)} failed")
    for n, e in fail:
        print("  -", n, e)