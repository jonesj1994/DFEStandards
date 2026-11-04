"""Regenerate docs/data.js from the live GOV.UK guidance.

Standard titles are the H2 headings on each GOV.UK topic page, and the guidance
text is that section's body converted to plain text, so both are word for word
from GOV.UK.

Usage (from the repo root):
    python3 scripts/gen_data_govuk.py              # fetch live from GOV.UK
    python3 scripts/gen_data_govuk.py --cache DIR  # also save the raw JSON to DIR
    python3 scripts/gen_data_govuk.py --from DIR   # use JSON saved earlier

Item ids are the keys the app uses to save ratings and notes, so they must never
change or be reused. ID_MAP below ties each GOV.UK heading to its id. If GOV.UK
adds or renames a heading the script stops and lists it, so a person can decide
whether it is a renamed standard (reuse its id) or a new one (add a new id).
"""
import argparse
import datetime
import html
import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser

API = "https://www.gov.uk/api/content"
INDEX_PATH = "/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges"
WEB = "https://www.gov.uk"

# GOV.UK slug -> (category id, app title, item id prefix).
# Category ids and titles are kept from earlier versions because the Excel
# export/import uses the title as the sheet name.
CATS = [
    ("broadband-internet-core-standard", "broadband", "Broadband", "broadband"),
    ("cloud-solutions", "cloud-solution", "Cloud Solution", "cloud"),
    ("cyber-security-core-standard", "cyber-security", "Cyber Security", "cyber"),
    ("digital-accessibility", "digital-accessibility", "Digital Accessibility", "accessibility"),
    ("digital-leadership-and-governance-core-standard", "digital-leadership", "Digital Leadership", "leadership"),
    ("filtering-and-monitoring-core-standard", "filtering-monitoring", "Filtering and Monitoring", "filtering"),
    ("laptops-desktops-and-tablets", "laptops-desktops-tablets", "Laptops, Desktops, Tablets", "devices"),
    ("network-cabling", "network-cabling", "Network Cabling", "cabling"),
    ("network-switching-core-standard", "network-switching", "Network Switching", "switching"),
    ("servers-and-storage", "servers-storage", "Servers and Storage", "servers"),
    ("it-support", "it-support", "IT Support", "support"),
    ("wireless-network-core-standard", "wireless-network", "Wireless Network", "wireless"),
]

# GOV.UK H2 heading (word for word) -> (item id, earlier titles used in the app).
# Earlier titles let the Excel import match rows from older exports.
ID_MAP = {
    # Broadband
    "Schools and colleges should use a full fibre connection for their broadband service":
        ("broadband-1", ["Have full fibre broadband connection with appropriate speeds"]),
    "Schools and colleges should have a backup broadband connection to ensure resilience and maintain continuity of service":
        ("broadband-2", ["Build resilience into your broadband connection"]),
    "Schools and colleges should have appropriate IT security and safeguarding systems in place, under both child and data protection legislation":
        ("broadband-3", ["Have appropriate safeguarding measures in place"]),
    # Cloud solutions
    "Use cloud solutions as an alternative to locally-hosted systems, including servers":
        ("cloud-1", ["Use cloud solutions as an alternative to locally-hosted systems"]),
    "Cloud solutions must follow data protection legislation": ("cloud-2", []),
    "Cloud solutions should use ID and access management tools": ("cloud-3", []),
    "Cloud solutions should work on a range of devices and be available when needed": ("cloud-4", []),
    "Make sure that appropriate data backup provision is in place": ("cloud-5", []),
    # Cyber security
    "Conduct a cyber risk assessment annually and review every term": ("cyber-1", []),
    "Create and implement a cyber awareness plan for students and staff": ("cyber-2", []),
    "Secure digital technology and data with anti-malware and a firewall": ("cyber-3", []),
    "Control and secure user accounts and access privileges": ("cyber-4", []),
    "License digital technology and keep it up to date": ("cyber-5", []),
    "Develop and implement a plan to back up your data and review this every year": ("cyber-6", []),
    "Report cyber attacks": ("cyber-7", []),
    # Digital accessibility
    "Include digital accessibility in relevant strategies and policies": ("accessibility-1", []),
    "Hardware and software should support the use of accessibility features": ("accessibility-2", []),
    "Communications should be accessible to all": ("accessibility-3", []),
    # Digital leadership and governance
    "Assign a senior leadership team (SLT) member to be responsible for digital technology": ("leadership-1", []),
    "Keep registers relating to hardware and systems up to date": ("leadership-2", []),
    "Include digital technology within disaster recovery and business continuity plans": ("leadership-3", []),
    "Have a digital technology strategy that is reviewed every year": ("leadership-4", []),
    # Filtering and monitoring
    "Identify and assign roles and responsibilities to manage your filtering and monitoring systems": ("filtering-1", []),
    "Review your filtering and monitoring provision at least annually":
        ("filtering-2", ["Review your filtering and monitoring provision at least once a year"]),
    "Filtering systems should block harmful and inappropriate content without unreasonably impacting teaching and learning":
        ("filtering-3", ["Have an active and well-managed filtering system"]),
    "Have effective monitoring strategies that meet the safeguarding needs of your school or college": ("filtering-4", []),
    # Laptops, desktops and tablets
    "Devices should meet educational needs and support the digital technology strategy":
        ("devices-1", ["Make sure devices meet the needs of your school or college"]),
    "Devices should be safe and secure": ("devices-2", ["Make sure devices are safe and secure"]),
    "Devices should meet or exceed the minimum requirements": ("devices-3", ["Make sure devices meet or exceed the minimum requirements"]),
    "Make sure devices are energy efficient, and they are bought and disposed of sustainably": ("devices-4", []),
    # Network cabling
    "Copper cabling should be Category 6A (Cat 6A)": ("cabling-1", ["Use the right type and grade of cabling"]),
    "Optical fibre cabling should be a minimum 16 core multi-mode OM4": ("cabling-4", []),
    "New cabling should be installed and tested in line with the manufacturer’s guidance, warranty terms and conditions":
        ("cabling-2", ["Have cabling professionally installed with proper documentation"]),
    # Network switching
    "The network switches should provide fast, reliable and secure connections to all users both wired and wireless":
        ("switching-1", ["Make sure switches meet performance requirements"]),
    "Have a platform that can centrally manage the network switching infrastructure":
        ("switching-2", ["Have switches that can be centrally managed and monitored"]),
    "The network switches should have security features to protect users and data from unauthorised access":
        ("switching-3", ["Secure network switches"]),
    "Core network switches should be connected to at least one UPS to reduce the impact of outages":
        ("switching-4", ["Build resilience into your switching infrastructure"]),
    # Servers and storage
    "All servers and related storage platforms should continue to work if any single component or service fails":
        ("servers-1", ["Build redundancy into servers and storage so your systems keep running"]),
    "Servers and related storage platforms must be secure and follow data protection legislation":
        ("servers-2", ["Keep servers and storage secure"]),
    "All servers and related storage platforms should be energy-efficient and set up to reduce power consumption, while still meeting user needs":
        ("servers-3", ["Make servers and storage energy efficient"]),
    "All server and related storage platforms should be kept and used in an appropriate physical environment":
        ("servers-4", ["Make sure servers and storage are kept in a suitable environment"]),
    # IT support
    "Make sure IT support helps you meet the digital and technology standards": ("support-1", []),
    "Make sure IT support actively maintains and improves your digital technology in line with your digital strategy":
        ("support-2", ["Establish what IT support you need"]),
    "Make sure your IT support is responsive and meets agreed service expectations":
        ("support-3", ["Set clear expectations with your IT support service"]),
    "Review your IT support at least once a year": ("support-5", ["Review your IT support annually"]),
    "Make sure staff get clear guidance and training on using technology": ("support-6", []),
    # Wireless network
    "Use the latest wireless network standards": ("wireless-1", ["Make sure your wireless network meets performance requirements"]),
    "Have a fully functional signal from your wireless network throughout the school or college buildings and externally where required":
        ("wireless-2", ["Make sure you have full wireless coverage across your school or college site"]),
    "Have a solution that can centrally manage the wireless network":
        ("wireless-3", ["Make sure your wireless network is centrally managed"]),
    "Install security features to stop unauthorised access": ("wireless-4", ["Make sure your wireless network is secure"]),
}

# Ids that were used in the past for standards GOV.UK no longer has. Never reuse these.
RETIRED_IDS = {
    "cabling-3": "Plan for future cabling needs",
    "support-4": "Establish effective logging and management of support requests",
}


# ── Fetching ──────────────────────────────────────────────────────────────────
def load_page(path, src_dir, cache_dir):
    name = (path.rstrip("/").split("/")[-1] or "index") + ".json"
    if path == INDEX_PATH:
        name = "index.json"
    if src_dir:
        with open(os.path.join(src_dir, name), encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(API + path, headers={"User-Agent": "dfe-standards-tracker-generator"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8")
    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
        with open(os.path.join(cache_dir, name), "w", encoding="utf-8") as f:
            f.write(raw)
    return json.loads(raw)


# ── HTML to plain text ────────────────────────────────────────────────────────
class TextBuilder(HTMLParser):
    """Turns GOV.UK body HTML into plain text for a white-space: pre-line box."""

    BLOCK = {"p", "div", "h2", "h3", "h4", "h5", "h6", "table", "tr", "blockquote"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lines = [""]
        self.list_stack = []  # "ul" or ["ol", counter]
        self.in_cell = False

    def _newline(self, blank=False):
        if self.lines[-1].strip():
            self.lines.append("")
        if blank and len(self.lines) > 1 and self.lines[-2] != "":
            self.lines.append("")

    def handle_starttag(self, tag, attrs):
        if tag in ("h3", "h4", "h5", "h6"):
            self._newline(blank=True)
        elif tag in self.BLOCK:
            self._newline(blank=not self.list_stack)
        elif tag in ("ul", "ol"):
            self._newline(blank=not self.list_stack)
            self.list_stack.append("ul" if tag == "ul" else ["ol", 0])
        elif tag == "li":
            self._newline()
            depth = len(self.list_stack) - 1
            top = self.list_stack[-1] if self.list_stack else "ul"
            if isinstance(top, list):
                top[1] += 1
                marker = f"{top[1]}."
            else:
                marker = "•" if depth == 0 else "◦"
            self.lines[-1] = "    " * max(depth, 0) + marker + " "
        elif tag in ("td", "th"):
            if self.in_cell:
                self.lines[-1] += " | "
            self.in_cell = True
        elif tag == "br":
            self._newline()

    def handle_endtag(self, tag):
        if tag in ("ul", "ol") and self.list_stack:
            self.list_stack.pop()
            self._newline(blank=not self.list_stack)
        elif tag == "tr":
            self.in_cell = False
            self._newline()
        elif tag in self.BLOCK or tag == "li":
            self._newline()

    def handle_data(self, data):
        text = re.sub(r"\s+", " ", data)
        if not self.lines[-1].strip():
            text = text.lstrip()
        self.lines[-1] += text

    def text(self):
        # Keep leading indentation (nested lists) but collapse runs of spaces elsewhere.
        def tidy(line):
            lead = len(line) - len(line.lstrip(" "))
            return " " * lead + re.sub(r" {2,}", " ", line.strip())
        out = "\n".join(tidy(l) for l in self.lines)
        out = re.sub(r"[ \t]+\n", "\n", out)
        return re.sub(r"\n{3,}", "\n\n", out).strip()


def to_text(fragment):
    b = TextBuilder()
    b.feed(fragment)
    b.close()
    return b.text()


def heading_text(fragment):
    # Inline tags such as <abbr> must not add spaces: "(SLT)" not "( SLT )".
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def split_standards(body):
    """Return [(heading, body_html)] for each H2 section. Text before the first H2 is the page intro."""
    parts = re.split(r"<h2[^>]*>(.*?)</h2>", body, flags=re.S)
    return [(heading_text(parts[i]), parts[i + 1]) for i in range(1, len(parts), 2)]


def iso_date(ts):
    return datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).date().isoformat()


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from", dest="src", help="read saved JSON from this folder instead of fetching")
    ap.add_argument("--cache", help="save fetched JSON to this folder")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "docs", "data.js"))
    args = ap.parse_args()

    index = load_page(INDEX_PATH, args.src, args.cache)
    index_body = index["details"]["body"]
    section_paths = [s["base_path"] for s in index["links"].get("sections", [])]
    known_slugs = {c[0] for c in CATS}
    problems = []

    for p in section_paths:
        if p.split("/")[-1] not in known_slugs:
            problems.append(f"New topic page on GOV.UK, not in CATS: {p}")
    for slug, *_ in CATS:
        if f"{INDEX_PATH}/{slug}" not in section_paths:
            problems.append(f"Topic page no longer listed on GOV.UK: {slug}")

    # Core standards are the pages linked from the index page's core list.
    core_list = re.search(r"core standards</a>\s*by\s*\d{4}:</p>\s*<ul>(.*?)</ul>", index_body, re.S)
    core_slugs = set(re.findall(r'href="[^"]*/([^"/]+)"', core_list.group(1))) if core_list else set()
    core_year = re.search(r"core standards</a>\s*by\s*(\d{4})", index_body)
    if not core_slugs:
        problems.append("Could not find the list of core standards on the index page")

    used_ids = set()
    out = []
    total = 0
    for slug, cid, title, prefix in CATS:
        page = load_page(f"{INDEX_PATH}/{slug}", args.src, args.cache)
        items = []
        for heading, body_html in split_standards(page["details"]["body"]):
            if heading not in ID_MAP:
                problems.append(f"[{slug}] heading not in ID_MAP: {heading!r}")
                continue
            iid, previous = ID_MAP[heading]
            if not iid.startswith(prefix + "-") or iid in used_ids or iid in RETIRED_IDS:
                problems.append(f"[{slug}] bad or duplicate id {iid} for {heading!r}")
                continue
            used_ids.add(iid)
            item = {"id": iid, "title": heading, "description": to_text(body_html)}
            if previous:
                item["previousTitles"] = previous
            items.append(item)
        total += len(items)
        out.append({
            "id": cid,
            "title": title,
            "govukTitle": page["title"],
            "isCore": slug in core_slugs,
            "url": WEB + page["base_path"],
            "lastUpdated": iso_date(page["public_updated_at"]),
            "items": items,
        })

    missing = set(v[0] for v in ID_MAP.values()) - used_ids
    for iid in sorted(missing):
        problems.append(f"Standard no longer on GOV.UK (consider moving to RETIRED_IDS): {iid}")

    if problems:
        print("Stopped: GOV.UK has changed in ways that need a person to check.\n", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        sys.exit(1)

    history = [
        {"date": iso_date(c["public_timestamp"]), "note": re.sub(r"\s+", " ", c["note"]).strip()}
        for c in index["details"].get("change_history", [])
    ]
    meta = {
        "lastUpdated": iso_date(index["public_updated_at"]),
        "coreDeadlineYear": int(core_year.group(1)) if core_year else None,
        "generated": datetime.date.today().isoformat(),
    }

    js = (
        "// Generated by scripts/gen_data_govuk.py from the GOV.UK content API.\n"
        "// Standard titles and guidance text are word for word from GOV.UK. Do not edit by hand.\n"
        "// To refresh, run from the repo root: python3 scripts/gen_data_govuk.py\n"
        f"const STANDARDS_INDEX_URL = {json.dumps(WEB + INDEX_PATH)};\n"
        f"const STANDARDS_META = {json.dumps(meta, indent=2)};\n"
        f"const STANDARDS_CHANGE_HISTORY = {json.dumps(history, indent=2, ensure_ascii=False)};\n"
        "const STANDARDS_DATA = " + json.dumps(out, indent=2, ensure_ascii=False) + ";\n"
    )
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(js)

    print(f"GOV.UK last updated {meta['lastUpdated']}; core deadline {meta['coreDeadlineYear']}")
    print(f"categories {len(out)}, standards {total}")
    for c in out:
        print(f"  {'CORE ' if c['isCore'] else '     '}{c['title']}: {len(c['items'])}  (updated {c['lastUpdated']})")


if __name__ == "__main__":
    main()
