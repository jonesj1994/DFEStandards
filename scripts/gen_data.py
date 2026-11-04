"""Regenerate docs/data.js from the Excel template so guidance text is verbatim."""
import glob, json, re, sys
import openpyxl

repo = sys.argv[1]
wb = openpyxl.load_workbook(glob.glob(f"{repo}/*.xlsx")[0])

# sheet name -> (category id, display title, isCore, item id prefix)
CATS = [
    ("Broadband", "broadband", "Broadband", True, "broadband"),
    ("Cloud Solution", "cloud-solution", "Cloud Solution", False, "cloud"),
    ("Cyber Security", "cyber-security", "Cyber Security", True, "cyber"),
    ("Digital Accessibility", "digital-accessibility", "Digital Accessibility", False, "accessibility"),
    ("Digital Leadership", "digital-leadership", "Digital Leadership", True, "leadership"),
    ("Filtering and Monitoring", "filtering-monitoring", "Filtering and Monitoring", True, "filtering"),
    ("Laptops, Desktops, Tablets", "laptops-desktops-tablets", "Laptops, Desktops, Tablets", False, "devices"),
    ("Network Cabling", "network-cabling", "Network Cabling", False, "cabling"),
    ("Network Switching", "network-switching", "Network Switching", True, "switching"),
    ("Servers and Storage", "servers-storage", "Servers and Storage", False, "servers"),
    ("IT Support", "it-support", "IT Support", False, "support"),
    ("Wireless Network", "wireless-network", "Wireless Network", True, "wireless"),
]
INDEX_URL = "https://www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges"


def clean(s):
    s = str(s or "").replace("\r\n", "\n").strip()
    return re.sub(r"\n{3,}", "\n\n", s)


out = []
total = 0
for sheet, cid, title, core, prefix in CATS:
    ws = wb[sheet]
    url = None
    for row in ws.iter_rows(min_row=1, max_row=3):
        for c in row:
            target = c.hyperlink.target if c.hyperlink else None
            val = c.value if isinstance(c.value, str) and c.value.startswith("http") else None
            if target or val:
                url = target or val
    rows = list(ws.iter_rows(values_only=True))
    start = next(i for i, r in enumerate(rows) if r[0] and str(r[0]).strip() == "DfE Recommendation") + 1
    items = []
    for r in rows[start:]:
        if not r[0] or not str(r[0]).strip():
            continue
        t = re.sub(r"^\d+\.\s*", "", clean(r[0]))
        items.append({"id": f"{prefix}-{len(items) + 1}", "title": t, "description": clean(r[1])})
    total += len(items)
    out.append({"id": cid, "title": title, "isCore": core, "url": url or INDEX_URL, "items": items})

js = (
    "// Generated from the Excel template. Guidance text is verbatim from that file.\n"
    "// To refresh: update the template, then run: python3 scripts/gen_data.py ..\n"
    f"const STANDARDS_INDEX_URL = {json.dumps(INDEX_URL)};\n"
    "const STANDARDS_DATA = " + json.dumps(out, indent=2, ensure_ascii=False) + ";\n"
)
open(f"{repo}/docs/data.js", "w", encoding="utf-8").write(js)
print("categories", len(out), "items", total)
for c in out:
    print(f"  {c['title']}: {len(c['items'])}  {c['url'][-60:]}")
