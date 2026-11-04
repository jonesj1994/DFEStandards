"""Summarise the difference between two versions of docs/data.js as Markdown.

Used by the weekly guidance workflow to write the pull request description.
Usage: python3 scripts/summarise_data_change.py OLD_DATA_JS NEW_DATA_JS
"""
import json
import re
import sys


def load(path):
    js = open(path, encoding="utf-8").read()
    out = {}
    for name in ("STANDARDS_META", "STANDARDS_CHANGE_HISTORY", "STANDARDS_DATA"):
        m = re.search(rf"const {name} = (.*?);\n(?=const |\Z)", js, re.S)
        out[name] = json.loads(m.group(1)) if m else None
    return out


def main(old_path, new_path):
    old, new = load(old_path), load(new_path)
    lines = []
    om, nm = old["STANDARDS_META"] or {}, new["STANDARDS_META"] or {}
    lines.append(f"GOV.UK guidance last updated: **{om.get('lastUpdated')}** → **{nm.get('lastUpdated')}**")
    if om.get("coreDeadlineYear") != nm.get("coreDeadlineYear"):
        lines.append(f"- ⚠️ Core standards deadline changed: {om.get('coreDeadlineYear')} → {nm.get('coreDeadlineYear')}")

    old_hist = {(h["date"], h["note"]) for h in old["STANDARDS_CHANGE_HISTORY"] or []}
    new_hist = [h for h in new["STANDARDS_CHANGE_HISTORY"] or [] if (h["date"], h["note"]) not in old_hist]
    if new_hist:
        lines.append("\n### New entries in the GOV.UK change history")
        lines += [f"- **{h['date']}**: {h['note']}" for h in new_hist]

    oc = {c["id"]: c for c in old["STANDARDS_DATA"] or []}
    lines.append("\n### Changes by standard area")
    any_change = False
    for c in new["STANDARDS_DATA"] or []:
        prev = oc.get(c["id"])
        notes = []
        if not prev:
            notes.append("new standard area")
        else:
            if prev["isCore"] != c["isCore"]:
                notes.append(f"core standard: {prev['isCore']} → {c['isCore']}")
            if prev.get("url") != c.get("url"):
                notes.append(f"page moved to {c.get('url')}")
            pi = {i["id"]: i for i in prev["items"]}
            for i in c["items"]:
                p = pi.pop(i["id"], None)
                if not p:
                    notes.append(f"added `{i['id']}`: \"{i['title']}\"")
                    continue
                if p["title"] != i["title"]:
                    notes.append(f"renamed `{i['id']}`: \"{p['title']}\" → \"{i['title']}\"")
                if p["description"] != i["description"]:
                    notes.append(f"guidance text changed for `{i['id']}` \"{i['title']}\"")
            for iid, p in pi.items():
                notes.append(f"removed `{iid}`: \"{p['title']}\"")
        if notes:
            any_change = True
            lines.append(f"- **{c['title']}** (page updated {c.get('lastUpdated')}):")
            lines += [f"  - {n}" for n in notes]
    if not any_change:
        lines.append("- No standards added, removed or reworded (only dates or change history).")
    print("\n".join(lines))


if __name__ == "__main__":
    main(*sys.argv[1:3])
