# FieldVerify Pro 11 architecture

## Non-negotiable rules

1. **App data and user data are separate.**
   - App code/assets live under `/v11` and version independently.
   - User projects, inspections, photos, drawings, NCR data and markup live in persistent browser storage and are not bundled into the app build.
   - Updating app code must never require deleting user storage.

2. **Startup is light.**
   - Startup may read the small project directory so the Project dropdown can be populated.
   - Startup must not read inspection records, drawing blobs/PDFs, photo blobs, NCR PDFs, markup, or cloud data.
   - No service worker, background sync, photo scan, PDF scan, repair scan, or repeating timer is allowed during startup.

3. **User data loads only after explicit user selection.**
   - Project dropdown: selects the project only.
   - Work Type dropdown: loads only lightweight inspection index + drawing metadata for that type.
   - Drawing/Page dropdown or Pages list: loads/renders only the exact drawing/page selected.
   - Inspection Item dropdown: loads only the exact inspection selected.
   - Load Photos: loads only photos linked to the currently selected inspection.

4. **One subsystem owns each job.**
   - One drawing manager.
   - One status/color engine.
   - One record storage layer.
   - One photo loader.
   - One cloud module later, loaded only when Cloud is opened.
   - No stacked hotfix wrappers around the same function.

5. **Legacy data is a bridge, not the new architecture.**
   - v11 can read old FieldVerify project/record/drawing/photo storage on demand.
   - Legacy data is never bulk-copied or bulk-scanned at startup.
   - New v11 changes are saved into `FieldVerifyUserDataV11`.
   - The current production app remains untouched while v11 is tested.

## Storage split

### App preferences
Tiny non-user-content UI preferences use `localStorage` under `fieldVerifyV11:appPrefs` (for example last selected project or drawing IDs).

### User data
IndexedDB database: `FieldVerifyUserDataV11`

Stores:
- `projects`
- `records`
- `drawingMeta`
- `files`
- `photos`
- `markup`
- `ncr`

### Legacy bridge
Old project records and drawing metadata are read only after an explicit dropdown selection. Old IndexedDB `ordCaissonPhotos` is opened only when a specific legacy drawing or photo is requested.

## Loading sequence

`App shell → Project → Work Type → Drawing or Inspection → Photos (only if requested)`

At no point should selecting ERS or Tieback automatically render every page, open every photo, scan all records, or start cloud synchronization.
