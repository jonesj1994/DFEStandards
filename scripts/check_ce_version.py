"""Check whether the NCSC has published a new Cyber Essentials requirements document.

Compares the "Requirements for IT Infrastructure" PDF linked from the NCSC
Cyber Essentials resources page with CE_SOURCE_URL in docs/ce-data.js.

Exit codes: 0 = unchanged, 2 = changed (details printed), 1 = could not check.
Usage (from the repo root): python3 scripts/check_ce_version.py
"""
import os
import re
import sys
import urllib.parse
import urllib.request

RESOURCES = "https://www.ncsc.gov.uk/cyberessentials/resources"
DATA = os.path.join(os.path.dirname(__file__), "..", "docs", "ce-data.js")


def main():
    js = open(DATA, encoding="utf-8").read()
    current_url = re.search(r'const CE_SOURCE_URL = "([^"]+)"', js).group(1)
    current_version = re.search(r'const CE_VERSION = "([^"]+)"', js).group(1)

    req = urllib.request.Request(RESOURCES, headers={"User-Agent": "dfe-standards-tracker-guidance-check"})
    try:
        html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
    except Exception as e:  # network or HTTP error
        print(f"Could not fetch {RESOURCES}: {e}", file=sys.stderr)
        sys.exit(1)

    # English IT Requirements PDFs (skip translations)
    links = []
    for href in re.findall(r'href="([^"]+\.pdf)"', html, re.I):
        name = urllib.parse.unquote(href).lower()
        if "requirements" in name and "welsh" not in name and "plus" not in name and "test" not in name:
            links.append(urllib.parse.urljoin(RESOURCES, href))
    links = sorted(set(links))
    effective = re.search(r"current version \((v[\d.]+)\) effective from ([^<.]+)", html, re.I)

    if not links:
        print("Could not find a Requirements for IT Infrastructure PDF link on the NCSC page.", file=sys.stderr)
        sys.exit(1)

    norm = lambda u: urllib.parse.unquote(u).replace("https://www.ncsc.gov.uk", "")
    if any(norm(l) == norm(current_url) for l in links) and len(links) == 1:
        print(f"Unchanged: {current_version}")
        sys.exit(0)

    print("The NCSC Cyber Essentials resources page has changed.")
    print(f"- Tracker currently uses: {current_version}")
    print(f"  {current_url}")
    print("- Requirements PDF(s) now linked:")
    for l in links:
        print(f"  {l}")
    if effective:
        print(f"- Page says: current version ({effective.group(1)}) effective from {effective.group(2).strip()}")
    sys.exit(2)


if __name__ == "__main__":
    main()
