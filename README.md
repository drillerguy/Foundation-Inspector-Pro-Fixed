# FieldVerify Pro

## Uploading to GitHub

1. Open the `Foundation-Inspector-Pro-Fixed` repository.
2. Upload every file from this package into the repository root.
3. Replace files when GitHub asks.
4. Commit the upload.
5. In **Settings → Pages**, choose **Deploy from a branch**, `main`, and `/ (root)`.

## Included files

- `index.html` — complete inspection app
- `caisson-data.js` — local numbered caisson locations and verified starting control points
- `caisson-plan.png` — local caisson drawing
- `xlsx.full.min.js` — pinned local Excel/NCR reader
- `pdf.min.mjs` and `pdf.worker.min.mjs` — pinned local PDF drawing renderer
- `pdf-lib.min.js` — pinned local restorable PDF report generator
- `manifest.webmanifest` — home-screen/PWA information
- `service-worker.js` — offline app cache
- `recovery.html` — emergency record backup and cache clearing
- `README.md` — these instructions

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
- Generates a readable PDF log with an embedded complete project backup whenever a daily report or photo log is created; Restore Project accepts that PDF directly.
- Adds a Back to FieldVerify Pro button to daily and item report pages.
- Adds a memory-optimized Send Full Project PDF to Office flow that gathers saved records, GPS, notes, inspections, NCR details, and photos, then presents a separate Share PDF Now button required by iPhone sharing.
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


## v10.25.90 photo saving and backups

- Photo files and pending record links commit in one IndexedDB transaction. Pending links recover after a reload if the record index could not be saved.
- Cloud Sync uploads all available linked photos sequentially, reports failed/missing files, and resumes on reconnect or return to the app.
- Cloud → DOWNLOAD ALL PHOTOS TO DEVICE stores actual files locally, skips cached files, and resumes an interrupted download. A screen wake lock is requested while transfers run where supported.
- Device backup prepares one JSON part at a time, grouping approximately 8 MB of original attachments per part. Save **every** part to Files. Oversized individual attachments remain intact in their own part.
- Restore accepts those parts together or individually, commits photos sequentially, and reports when more parts are needed. Older JSON/PDF restore remains available.
- Cloud restore merges records locally without deleting the shared project's rows, and downloads photos.
- The viewer reads exact linked IDs and cannot pull an unrelated photo with the same item number.

Validation: `node --test --test-isolation=none tests/reliability.test.cjs` (Node 24). The suite exercises simulated IndexedDB/cloud faults, 270-photo uploads, paginated/resumable downloads, project changes, exact-ID viewing, and multipart attachment round trips. Native iPhone share-sheet behavior requires device verification.

## v10.25.91 Cloud download feedback

Cloud → DOWNLOAD ALL PHOTOS TO DEVICE saves photos **inside FieldVerify** for offline use. Its progress, completion counts, and errors now appear below the button in the Cloud dialog. Existing local files are skipped; tap again to resume after a failure. Stalled photo, list, or device operations report a timeout after 20 seconds.

To create a file you can save in the iPhone Files app, use **Backup Project → Backup to Device** and save each prepared part.
