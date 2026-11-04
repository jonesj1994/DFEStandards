# Trust overview: data model and sources

The trust overview (`trust.html`) combines many schools' assessments into one
trust-wide view. Today each school exports its tracker to Excel and a trust
user imports the files. The view is written against a small **source**
interface, so shared online storage (for example a SharePoint list through
Microsoft Graph, or a hosted database) can replace file import later without
changing the view.

```
tracker (dfe.html / ce.html)
   │  Export Excel  ──►  .xlsx with visible sheets + hidden "_assessment" sheet
   ▼
trust-sources.js  parseFile()  ──►  snapshot record  ──►  source.saveSnapshot()
                                                              │
trust-app.js  ◄──  source.listSnapshots()  ◄──────────────────┘
   uses assessment-model.js summarise() for every number and colour
```

## Files

| File | Purpose |
| --- | --- |
| `assessment-model.js` | Snapshot shape, building it from tracker state, validation, summaries, the hidden sheet |
| `trust-sources.js` | Source registry, browser cache (IndexedDB), `.xlsx` import, a commented SharePoint stub |
| `trust-app.js`, `trust.html`, `trust.css` | The trust overview page |

## Snapshot (schemaVersion 1)

One school's assessment against one framework at one point in time.

```json
{
  "schemaVersion": 1,
  "framework": "dfe",
  "frameworkVersion": "2026-09-16",
  "school": { "urn": "100000", "dfeNumber": "352/4000", "name": "Anytown Academy",
              "trust": "Anytown Academy Trust", "type": "Academy converter",
              "phase": "Secondary", "la": "Manchester", "pupils": "850" },
  "assessor": "Jane Smith",
  "assessmentDate": "2026-10-01",
  "exportedAt": "2026-11-04T21:00:00.000Z",
  "items": {
    "cyber-7": { "status": "Amber", "notes": "…", "actions": "…", "owner": "IT Manager" }
  },
  "certification": { "level": "Cyber Essentials", "body": "…", "number": "…",
                     "certifiedOn": "2025-12-01", "renewalDue": "2026-12-01", "scope": "…" }
}
```

* `framework` is `"dfe"` or `"cyber-essentials"`.
* `frameworkVersion` is the GOV.UK "last updated" date for the DfE standards,
  or the NCSC requirements version (e.g. `"v3.3"`) for Cyber Essentials. It is
  blank for files read from visible sheets.
* `items` is keyed by the stable item ids in `data.js` / `ce-data.js`
  (`cyber-7`, `fw-3`, …). Items missing from a snapshot count as `Not Set`.
* Statuses: DfE `Not Set`, `Red`, `Amber`, `Green`, `Met`;
  Cyber Essentials `Not Set`, `Not Met`, `Partially Met`, `Met`, `N/A`.
* Field meanings: DfE `notes` = Current Status & Notes, `actions` =
  Recommendations, `owner` = Ownership. Cyber Essentials `notes` = Evidence /
  current position, `actions` = Action needed, `owner` = Owner.
* `certification` is present for Cyber Essentials only.

`AssessmentModel.validate(raw)` tidies a snapshot from any source and lists
problems. `AssessmentModel.summarise(snapshot)` gives per-category counts and
overall status (the same rules as each tracker's Summary sheet), core
standards progress, filtering and monitoring status, Cyber Essentials
readiness, certificate renewal state and outstanding actions.

### Hidden `_assessment` sheet

Both trackers' Excel exports include a hidden sheet named `_assessment`:

| Row | Column A | Column B | Column C |
| --- | --- | --- | --- |
| 1 | `school-tracker-snapshot` | schema version | number of chunks |
| 2… | one chunk of the snapshot JSON | | |

Chunks are at most 30,000 characters (Excel's cell limit is 32,767). Import
prefers this sheet. If it is missing (older exports) or damaged, import reads
the visible sheets instead, matching rows by the standard's title (current or
previous titles from `scripts/gen_data_govuk.py`'s `ID_MAP`), then by row number.

## Source interface

```js
{
  id: "browser",              // unique id
  label: "This browser",      // shown to the user
  persistent: true,           // does data survive a reload?
  listSnapshots(filter),      // -> Promise<Record[]>; filter is null or { urns: [...] }
  saveSnapshot(record),       // -> Promise<Record>; replaces a record with the same key
  deleteSnapshot(key),        // -> Promise<void>
  clear()                     // -> Promise<void> (optional)
}

Record = {
  key,          // AssessmentModel.snapshotKey(snapshot): framework|school|exportedAt
  snapshot,     // a validated snapshot
  provenance: { fileName, importedAt, parsedFrom, exportedAtSource, warnings: [] }
}
```

The view keeps every record and works out the newest per school and framework
itself, so a source only has to store and return records.

## Adding an online source later

1. Implement the four methods above. `trust-sources.js` has a commented
   `createSharePointSource` example using Microsoft Graph list items
   (columns `Key`, `URN`, `Framework`, `ExportedAt`, `SnapshotJson`).
2. Sign users in with MSAL.js and request a token per call. Never put client
   secrets, tokens or passwords in this site's code: it is public. Prefer the
   narrowest permission that works (for example `Sites.Selected` granted to
   one site) and limit the list to trust staff who need it.
3. Register it and point the view at it, in `trust-app.js`:
   `const source = TS.register(createSharePointSource({ … }));`
4. To let schools submit directly, the trackers could call
   `saveSnapshot(AssessmentModel.fromTrackerState(…))` instead of (or as well
   as) exporting a file.

Things to decide before going online: who can read every school's data, how
long it is kept, and recording it in the trust's data protection records. The
snapshots contain no pupil data, but notes can name staff.

## Privacy

With file import, nothing leaves the browser. Files are read locally with
SheetJS and kept in IndexedDB (`trust_view_v1`) until the user selects
**Clear imported data**. The chosen trust and the "out of date" setting are
kept in `localStorage` (`trust_view_settings_v1`). The trust view never writes
to the trackers' own storage (`dfe_tracker_v1`, `ce_tracker_v1`,
`school_profile_v1`).
