#!/usr/bin/env python3
"""Build docs/dfe-howto.js from guidance/how-to-meet-the-standards.md.

The guide is the source for the DfE tracker's "How to meet it" panels and
evidence checklists. Run from the repo root after editing it:

    python3 scripts/build_howto.py

Evidence items get stable ids ("e1", "e2", ...) per standard, kept in
guidance/evidence-ids.json, because schools' ticks are saved against them:
- an item whose text is unchanged keeps its id;
- if a standard has the same number of items as before, a reworded item keeps
  the id at its position;
- a new item gets a new id (never a retired one), and a removed item's id is
  retired, so old ticks can't attach to a different item.

The script checks that every standard in docs/data.js has a complete entry and
exits with an error otherwise.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GUIDE = ROOT / "guidance" / "how-to-meet-the-standards.md"
IDS = ROOT / "guidance" / "evidence-ids.json"
OUT = ROOT / "docs" / "dfe-howto.js"
DATA = ROOT / "docs" / "data.js"

SECTIONS = ["In plain English", "What GOV.UK asks for", "When to meet it",
            "Examples of how schools meet it", "Evidence to keep", "Who can help", "Watch out for"]


def standard_ids():
    """Standard ids in data.js order (read with node, as data.js is JavaScript)."""
    js = ("eval(require('fs').readFileSync(process.argv[1],'utf8').replace(/^const /gm,'global.'));"
          "console.log(JSON.stringify(STANDARDS_DATA.flatMap(c=>c.items.map(i=>i.id))))")
    return json.loads(subprocess.check_output(["node", "-e", js, str(DATA)], text=True))


def section(block, name):
    names = "|".join(re.escape(n) for n in SECTIONS)
    m = re.search(r"\*\*" + re.escape(name) + r":\*\*(.*?)(?=\n\*\*(?:" + names + r"):\*\*|\n---|\Z)", block, re.S)
    return m.group(1).strip() if m else ""


def bullets(text):
    return [line.strip()[2:].strip() for line in text.splitlines() if line.strip().startswith("- ")]


def parse_guide():
    md = GUIDE.read_text(encoding="utf-8")
    out = {}
    for block in re.split(r"^### ", md, flags=re.M)[1:]:
        m = re.search(r"^`([a-z]+-\d+)`", block, re.M)
        if not m:
            continue
        sid = m.group(1)
        examples = []
        for line in bullets(section(block, "Examples of how schools meet it")):
            em = re.match(r"^\*([^*]+):\*\s*(.*)$", line)
            examples.append({"label": em.group(1).strip(), "text": em.group(2).strip()} if em else {"label": "", "text": line})
        out[sid] = {
            "plain": section(block, "In plain English"),
            "asks": bullets(section(block, "What GOV.UK asks for")),
            "when": section(block, "When to meet it"),
            "examples": examples,
            "evidenceText": bullets(section(block, "Evidence to keep")),
            "who": section(block, "Who can help"),
            "watch": section(block, "Watch out for"),
        }
    return out


def assign_ids(guide):
    saved = json.loads(IDS.read_text(encoding="utf-8")) if IDS.exists() else {}
    result = {}
    for sid, g in guide.items():
        prev = saved.get(sid, {"items": [], "next": 1})
        items, nxt = prev["items"], prev["next"]
        by_text = {i["text"]: i["id"] for i in items}
        new = []
        for pos, text in enumerate(g["evidenceText"]):
            if text in by_text:
                new.append({"id": by_text[text], "text": text})
            elif len(items) == len(g["evidenceText"]) and items[pos]["id"] not in [n["id"] for n in new]:
                new.append({"id": items[pos]["id"], "text": text})   # reworded in place
            else:
                new.append({"id": f"e{nxt}", "text": text})
                nxt += 1
        used = [n["id"] for n in new]
        if len(set(used)) != len(used):
            sys.exit(f"{sid}: duplicate evidence ids {used}")
        nxt = max([nxt] + [int(i[1:]) + 1 for i in used])
        result[sid] = {"items": new, "next": nxt}
    return result


def main():
    ids = standard_ids()
    guide = parse_guide()
    problems = []
    for sid in ids:
        g = guide.get(sid)
        if not g:
            problems.append(f"{sid}: missing from the guide")
            continue
        for k in ("plain", "when", "who", "watch"):
            if not g[k]:
                problems.append(f"{sid}: empty '{k}'")
        if not g["asks"] or not g["examples"] or not g["evidenceText"]:
            problems.append(f"{sid}: needs 'What GOV.UK asks for', examples and evidence")
    extra = sorted(set(guide) - set(ids))
    if extra:
        problems.append("in the guide but not in data.js: " + ", ".join(extra))
    if problems:
        sys.exit("Guide problems:\n  " + "\n  ".join(problems))

    evidence = assign_ids(guide)
    IDS.write_text(json.dumps(evidence, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    data = {}
    for sid in ids:
        g = dict(guide[sid])
        del g["evidenceText"]
        g["evidence"] = [{"id": i["id"], "text": i["text"]} for i in evidence[sid]["items"]]
        data[sid] = g
    OUT.write_text(
        "// Generated by scripts/build_howto.py from guidance/how-to-meet-the-standards.md.\n"
        "// Practical advice on meeting each DfE standard (not DfE wording). Do not edit by hand.\n"
        "const HOWTO = " + json.dumps(data, indent=1, ensure_ascii=False) + ";\n",
        encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(data)} standards, "
          f"{sum(len(d['evidence']) for d in data.values())} evidence items")


if __name__ == "__main__":
    main()
