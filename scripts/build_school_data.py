#!/usr/bin/env python3
"""Build compact school lookup data for the GitHub Pages site from GIAS.

Source: Get Information About Schools (GIAS) public extracts, published daily by
the Department for Education under the Open Government Licence v3.0:
  edubasealldataYYYYMMDD.csv        - all establishments
  links_edubasealldataYYYYMMDD.csv  - predecessor / successor links

Output (default docs/schools/):
  meta.json          when the data was built, source file date, counts
  urn/NN.json        school records keyed by URN, sharded by the URN's last
                     two digits (100 files of similar size)
  laestab/LLL.json   per local authority code: establishment number -> [URN, ...]
                     (open schools first), used for DfE number (LAESTAB) lookups
  names.json         open schools only: [URN, name, town, postcode, LAESTAB],
                     loaded on demand for search by name

Which establishments are included:
  * every establishment that is not closed (open, proposed to open/close);
  * closed establishments that closed within the last CLOSED_YEARS years, so
    a recently closed or converted school is found and flagged rather than
    reported as "not found". Older closures are left out to keep the data small.

Personal data such as headteacher names is deliberately not copied.

Usage:
  python3 scripts/build_school_data.py                  # download today's files
  python3 scripts/build_school_data.py --csv a.csv --links b.csv
Standard library only, so it runs on a plain GitHub Actions runner.
"""

import argparse
import csv
import datetime as dt
import io
import json
import os
import shutil
import sys
import urllib.request

BASE_URL = "https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/"
CLOSED_YEARS = 10
SHARDS = 100  # urn/00.json .. urn/99.json

# GIAS column -> short key in the JSON. Short keys keep the files small;
# school-lookup.js maps them back to readable names.
FIELDS = [
    ("EstablishmentName", "n"),
    ("LA (code)", "lac"),
    ("LA (name)", "la"),
    ("EstablishmentNumber", "en"),
    ("TypeOfEstablishment (name)", "t"),
    ("EstablishmentTypeGroup (name)", "tg"),
    ("EstablishmentStatus (name)", "s"),
    ("OpenDate", "od"),
    ("CloseDate", "cd"),
    ("PhaseOfEducation (name)", "ph"),
    ("StatutoryLowAge", "al"),
    ("StatutoryHighAge", "ah"),
    ("Gender (name)", "g"),
    ("SchoolCapacity", "cap"),
    ("NumberOfPupils", "np"),
    ("CensusDate", "cen"),
    ("Trusts (code)", "trc"),
    ("Trusts (name)", "tr"),
    ("UKPRN", "uk"),
    ("Street", "a1"),
    ("Locality", "a2"),
    ("Address3", "a3"),
    ("Town", "tw"),
    ("County (name)", "co"),
    ("Postcode", "pc"),
    ("TelephoneNum", "tel"),
    ("SchoolWebsite", "w"),
    ("GOR (name)", "rg"),
]
DATE_KEYS = {"od", "cd", "cen"}
INT_KEYS = {"al", "ah", "cap", "np"}
# Values GIAS uses to mean "nothing here"
EMPTY = {"", "Not applicable", "Not recorded", "Does not apply", "None"}


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def download(name_prefix, max_days_back=7):
    """Download the newest GIAS file, trying today and then earlier days.

    GIAS publishes a new file each morning; early in the day today's file may
    not exist yet, so fall back a day at a time. Returns (text, yyyymmdd).
    """
    today = dt.date.today()
    for back in range(max_days_back + 1):
        stamp = (today - dt.timedelta(days=back)).strftime("%Y%m%d")
        url = f"{BASE_URL}{name_prefix}{stamp}.csv"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "school-data-builder"})
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = resp.read()
            if len(data) < 1000:  # an error page rather than a CSV
                raise ValueError("file too small")
            log(f"Downloaded {url} ({len(data):,} bytes)")
            return data.decode("cp1252"), stamp
        except Exception as exc:  # try the previous day
            log(f"  {url}: {exc}")
    raise SystemExit(f"Could not download {name_prefix} from GIAS")


def read_text(path):
    with open(path, "rb") as f:
        return f.read().decode("cp1252")


def iso_date(value):
    """GIAS dates are dd-mm-yyyy; store them as ISO yyyy-mm-dd."""
    try:
        return dt.datetime.strptime(value, "%d-%m-%Y").date().isoformat()
    except ValueError:
        return ""


def clean(row):
    rec = {}
    for col, key in FIELDS:
        v = (row.get(col) or "").strip()
        if v in EMPTY:
            continue
        if key in DATE_KEYS:
            v = iso_date(v)
        elif key in INT_KEYS:
            try:
                v = int(float(v))
            except ValueError:
                continue
        if v != "":
            rec[key] = v
    return rec


def build(csv_text, links_text, out_dir, source_date):
    cutoff = (dt.date.today() - dt.timedelta(days=365 * CLOSED_YEARS)).isoformat()

    # Successor links: closed URN -> [successor URNs]
    successors = {}
    if links_text:
        for r in csv.DictReader(io.StringIO(links_text)):
            if r.get("LinkType", "").startswith("Successor"):
                successors.setdefault(r["URN"], []).append(int(r["LinkURN"]))

    records = {}
    for row in csv.DictReader(io.StringIO(csv_text)):
        urn = (row.get("URN") or "").strip()
        if not urn.isdigit():
            continue
        rec = clean(row)
        if rec.get("s") == "Closed" and rec.get("cd", "") < cutoff:
            continue
        if urn in successors:
            rec["suc"] = sorted(set(successors[urn]))
        records[int(urn)] = rec

    # Write into a temporary folder, then swap it in, so a failed run never
    # leaves half-written data on the site.
    tmp = out_dir.rstrip("/\\") + ".tmp"
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(os.path.join(tmp, "urn"))
    os.makedirs(os.path.join(tmp, "laestab"))

    def dump(path, obj):
        with open(os.path.join(tmp, path), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)

    shards = {i: {} for i in range(SHARDS)}
    for urn, rec in records.items():
        shards[urn % SHARDS][str(urn)] = rec
    for i, shard in shards.items():
        dump(f"urn/{i:02d}.json", shard)

    # LAESTAB index, open schools listed before closed ones
    def open_first(urn):
        return (records[urn].get("s") == "Closed", -urn)

    by_la = {}
    for urn, rec in records.items():
        if rec.get("lac") and rec.get("en"):
            by_la.setdefault(rec["lac"], {}).setdefault(rec["en"], []).append(urn)
    for la, idx in by_la.items():
        dump(f"laestab/{la}.json", {en: sorted(u, key=open_first) for en, u in idx.items()})

    names = sorted(
        (
            [urn, rec.get("n", ""), rec.get("tw", ""), rec.get("pc", ""),
             (rec.get("lac", "") + rec.get("en", "")) if rec.get("en") else ""]
            for urn, rec in records.items()
            if rec.get("s") != "Closed"
        ),
        key=lambda x: x[1].lower(),
    )
    dump("names.json", names)

    counts = {}
    for rec in records.values():
        counts[rec.get("s", "Unknown")] = counts.get(rec.get("s", "Unknown"), 0) + 1
    dump("meta.json", {
        "source": "Get Information About Schools (GIAS), Department for Education",
        "licence": "Open Government Licence v3.0",
        "sourceFile": f"edubasealldata{source_date}.csv",
        "sourceDate": f"{source_date[:4]}-{source_date[4:6]}-{source_date[6:]}",
        "built": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "closedIncludedSince": cutoff,
        "shards": SHARDS,
        "counts": counts,
        "total": len(records),
    })

    shutil.rmtree(out_dir, ignore_errors=True)
    os.replace(tmp, out_dir)
    log(f"Wrote {len(records):,} establishments to {out_dir} {counts}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--csv", help="local edubasealldata CSV (otherwise downloaded)")
    p.add_argument("--links", help="local links_edubasealldata CSV (otherwise downloaded)")
    p.add_argument("--date", help="source date yyyymmdd for a local CSV (default: from file name)")
    p.add_argument("--out", default=os.path.join("docs", "schools"))
    a = p.parse_args()

    if a.csv:
        csv_text = read_text(a.csv)
        digits = "".join(ch for ch in os.path.basename(a.csv) if ch.isdigit())
        stamp = a.date or (digits[-8:] if len(digits) >= 8 else dt.date.today().strftime("%Y%m%d"))
        links_text = read_text(a.links) if a.links else ""
    else:
        csv_text, stamp = download("edubasealldata")
        links_text, _ = download("links_edubasealldata")

    # Sanity check so a broken download never wipes good data
    if csv_text.count("\n") < 20000:
        raise SystemExit("GIAS file looks incomplete; leaving existing data unchanged")
    build(csv_text, links_text, a.out, stamp)


if __name__ == "__main__":
    main()
