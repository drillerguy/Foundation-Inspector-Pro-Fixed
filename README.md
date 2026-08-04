# Foundation Inspector Pro Fixed

## Uploading to GitHub

1. Open the `Foundation-Inspector-Pro-Fixed` repository.
2. Upload every file from this package into the repository root.
3. Replace files when GitHub asks.
4. Commit the upload.
5. In **Settings → Pages**, choose **Deploy from a branch**, `main`, and `/ (root)`.

## Included files

- `index.html` — complete inspection app
- `caisson-data.js` — local numbered caisson locations and verified starting control points
- `manifest.webmanifest` — home-screen/PWA information
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
- Adds a recovery page that can export records even when the main page has cache trouble.
- Uses a new service-worker cache name so older broken cached pages are replaced.

## Important backup rule

After restoring an old backup, confirm the record count using **Count Records**, inspect several caissons and photos, and then create a new backup before continuing field work.

## Map drawing

The numbered hotspot locations and verified starting control points are stored locally in `caisson-data.js`, so changes to the older ORD app cannot break map loading. The plan image remains sourced from the existing public ORD drawing site.

## Preserved browser data

- Records: `foundationInspectorRecords` and legacy `ordCaissonRecords`
- Imported NCR rows: `foundationInspectorNcrData`
- Photos database: `ordCaissonPhotos`, store `photos`
- Attached NCR markers: `ncrpdf:*`
- Legacy attached NCR data: `ncrpdfdata:*` remains readable and is included in backups
