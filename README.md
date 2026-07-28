# Foundation Inspector Pro Fixed

## Uploading to GitHub

1. Open the `Foundation-Inspector-Pro-Fixed` repository.
2. Upload every file from this package into the repository root.
3. Replace files when GitHub asks.
4. Commit the upload.
5. In **Settings → Pages**, choose **Deploy from a branch**, `main`, and `/ (root)`.

## Included files

- `index.html` — complete inspection app
- `manifest.webmanifest` — home-screen/PWA information
- `sw.js` — cache refresh and offline shell
- `recovery.html` — emergency record backup and cache clearing
- `README.md` — these instructions

## Fixed features

- Reads old and new JSON backup layouts.
- Reads legacy records stored as JSON strings.
- Restores photos one at a time with a progress display.
- Shows the number of records and photos restored.
- Leaves the original backup file unchanged.
- Creates full backups containing records and photos.
- Generates a separate printable report page for **Print / Save as PDF**.
- Adds a recovery page that can export records even when the main page has cache trouble.
- Uses a new service-worker cache name so older broken cached pages are replaced.

## Important backup rule

After restoring an old backup, confirm the record count using **Count Records**, inspect several caissons and photos, and then create a new backup before continuing field work.

## Map drawing

The caisson drawing and hotspot locations are loaded from the existing public ORD Caisson Inspector drawing site. This keeps the fixed repository small while preserving the same numbered drawing.
