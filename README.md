# FieldVerify Pro

## Uploading to GitHub

1. Open the `Foundation-Inspector-Pro-Fixed` repository.
2. Upload every file from this package into the repository root.
3. Replace files when GitHub asks.
4. Commit the upload.
5. In **Settings â†’ Pages**, choose **Deploy from a branch**, `main`, and `/ (root)`.

## Included files

- `index.html` â€” complete inspection app
- `caisson-data.js` â€” local numbered caisson locations and verified starting control points
- `caisson-plan.png` â€” local caisson drawing
- `xlsx.full.min.js` â€” pinned local Excel/NCR reader
- `pdf.min.mjs` and `pdf.worker.min.mjs` â€” pinned local PDF drawing renderer
- `manifest.webmanifest` â€” home-screen/PWA information
- `service-worker.js` â€” offline app cache
- `recovery.html` â€” emergency record backup and cache clearing
- `README.md` â€” these instructions

## Fixed features

- Reads old and new JSON backup layouts.
- Reads legacy records stored as JSON strings.
- Restores photos one at a time with a progress display.
- Shows the number of records and photos restored.
- Leaves the original backup file unchanged.
- Creates full backups containing records, photos, imported NCR rows, manual NCR overrides, and attached NCR PDFs.
- Stores photos and NCR PDFs in IndexedDB while retaining the existing record and compatibility keys.
- Generates a separate printable report page with notes, photos, saved coordinates, pickup/unload GPS details, and NCR details for **Print / Save as PDF**.
- Adds a daily field dashboard with pickup, unload, active-caisson, and NCR totals; data-quality warnings; quick resume; and a combined daily shift report/PDF.
- Adds a per-caisson quick inspection checklist for rebar, bottom cleanliness, water control, dimensions, concrete readiness, and overall Pass/Hold status; checklist results appear in reports.
- Provides smoother focal-point pinch zoom with one-finger panning and a stationary side rail for zoom, fit, and center controls.
- Works offline after the first successful online load and shows the current connection state.
- Loads PDF, PNG, JPG, WebP, or GIF drawings into local device storage, renders a selected PDF page for map use, restores the original drawing on demand, and includes the source drawing in project backups.
- Adds per-caisson correction history and safe undo for pickup, unload, notes, inspection, GPS clearing, and photo removal.
- Adds Best GPS Lock with multi-reading selection, signal-quality grades, jump rejection, weak-signal warnings, and a dedicated Save Best GPS action.
- Generalizes inspection records into Caisson, ERS, Tieback, Footing, Column, and Custom item types with custom IDs, type filters, marker shapes, tailored checklists, and item-aware reports; legacy records remain Caissons automatically.
- Adds Project Home with separate project metadata, records, NCR registers, drawings, module shortcuts, dashboard totals, project switching, and automatic migration of the original job into a preserved legacy project.
- Restores backups into their saved project, continues past damaged attachments, and reports restored record/photo/PDF counts.
- Automatically downloads a complete JSON project backup whenever a daily shift report or photo field log is generated.
- Adds a recovery page that can export records even when the main page has cache trouble.
- Uses a new service-worker cache name so older broken cached pages are replaced.

## Important backup rule

After restoring an old backup, confirm the record count using **Count Records**, inspect several caissons and photos, and then create a new backup before continuing field work.

## Map drawing

The drawing, numbered hotspot locations, verified starting control points, and Excel reader are stored in this repository. The field app no longer depends on the older ORD site or a CDN at runtime.

## Preserved browser data

- Records: `foundationInspectorRecords` and legacy `ordCaissonRecords`
- Imported NCR rows: `foundationInspectorNcrData`
- Photos database: `ordCaissonPhotos`, store `photos`
- Attached NCR markers: `ncrpdf:*`
- Legacy attached NCR data: `ncrpdfdata:*` remains readable and is included in backups
