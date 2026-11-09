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
* Statuses: DfE `Not Set`, `Red`, `Amber`, `Green` (older files' `Met` is read as `Green`);
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
prefers this sheet, both in the trust view and in each tracker's own **Import
Excel** button. The trackers use `AssessmentModel.toTrackerState(framework,
snapshot)` (the inverse of `fromTrackerState`) through `readTrackerFile`, which
restores every status, note, action, owner and the school and certification
fields exactly, drops item ids that are no longer in the framework, and
refuses a file made by the other tracker. The DfE tracker's address, phone and
website are not in the snapshot, so they are read from the visible Info sheet. If it is missing (older exports) or damaged, import reads
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

## Linking to a trust

`trust.html?trust=<GIAS group UID>` opens the overview with that trust
selected, replacing any trust chosen before (imported files are kept). An
unknown UID shows a message and leaves the saved trust as it was. The address
is kept in step (`history.replaceState`) when the trust is changed on the page.
A trust's schools load in the background, one request per URN shard, and the
page fills in as they arrive.

## Privacy

With file import, nothing leaves the browser. Files are read locally with
SheetJS and kept in IndexedDB (`trust_view_v1`) until the user selects
**Clear imported data**. The chosen trust and the "out of date" setting are
kept in `localStorage` (`trust_view_settings_v1`). The trust view never writes
to the trackers' own storage (`dfe_tracker_v1`, `ce_tracker_v1`,
`school_profile_v1`).

## Editing a school's DfE assessment from the trust overview

`trust-link.js` lets a trust open any school's DfE standards assessment in the
tracker and edit it:

- **Edit DfE standards** (or **Start DfE standards** if none has been imported)
  on the overview grid and on each school's page loads that school's newest
  imported DfE snapshot into the tracker (`AssessmentModel.toTrackerState`), or
  a fresh assessment with the school's details, and opens `dfe.html`. The
  tracker's saved data gets a `trustSession` marker `{ key, urn, name, recordKey }`.
- While the marker is set, every save in the tracker is copied back into this
  browser's trust store as a new snapshot (`AssessmentModel.fromTrackerState`,
  provenance "Edited in the DfE tracker"), replacing the copy made by the
  previous save. The imported original stays as an older version.
- **Back to trust overview** finishes the last copy and returns to that
  school's page. **Stop linking** removes the marker; the assessment stays in
  the tracker.
- If the tracker already holds an assessment that isn't linked to the trust,
  the user is asked to add it to the trust store first, replace it, or cancel.

## Trust central team and central answers

The **Trust central** page (`trust-central.js`, stored in this browser as
`trust_central_v1` and validated on load) holds:

- **Central team:** trust staff `{ id, name, role }`. When a school is opened
  from the trust overview they are added to its People list with `central: true`,
  and appear under "Trust central team" in every Ownership drop-down.
- **Central answers:** for DfE standards the trust handles centrally, a rating,
  current position, recommendations, owner and date.

Central answers only ever **fill gaps**: a rating that is Not Set, or an empty
note, recommendation, owner or date. They never overwrite a school's answers.
They are used by **Fill from trust central answers** in the tracker's trust
banner (one school), or **Apply central answers to all schools** on the Trust
central page, which saves a new version for every school that changes (its
previous version is kept) and starts an assessment for schools without one.
