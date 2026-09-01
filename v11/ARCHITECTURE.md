# FieldVerify Pro 11 architecture

## Non-negotiable rules

1. **App data and user data are separate.**
   - App code/assets live under `/v11` and version independently.
   - User projects, inspections, photos, drawings, NCR data, markup and progress live in persistent browser storage and are not bundled into the app build.
   - Updating app code must never require deleting user storage.

2. **Startup is light.**
   - Startup may read the small project directory so the Project dropdown can be populated.
   - Startup must not read inspection records, drawing blobs/PDFs, photo blobs, NCR PDFs, markup, progress details, or cloud data.
   - No service worker, background sync, photo scan, PDF scan, repair scan, or repeating timer is allowed during startup.

3. **User data loads only after explicit user selection.**
   - Project dropdown: selects the project only.
   - Work Type dropdown: loads only lightweight inspection index + drawing metadata for that type.
   - Drawing/Page dropdown or Pages list: loads/renders only the exact drawing/page selected.
   - Inspection Item dropdown: loads only the exact inspection selected.
   - Load Photos: loads only photos linked to the currently selected inspection.

4. **One subsystem owns each job.**
   - One drawing manager.
   - One status/color/progress engine.
   - One record storage layer.
   - One photo loader.
   - One cloud module later, loaded only when Cloud is opened.
   - No stacked hotfix wrappers around the same function.

5. **Progress is multi-layer, not one purple state.**
   - ERS, Tieback and Waler each have independent named work layers.
   - Every layer has its own high-contrast color.
   - Each inspection record stores a `progress` object containing completed layer timestamps.
   - The drawing can be viewed as **Overall Progress** or filtered to one specific work layer.
   - Overall Progress uses the furthest completed layer color; a specific layer view shows that layer's color when complete and gray when incomplete.
   - NCR Open overrides progress color with red.
   - Layer definitions/colors belong to app configuration; completion timestamps belong to user data.

6. **Legacy data is a bridge, not the new architecture.**
   - v11 can read old FieldVerify project/record/drawing/photo storage on demand.
   - Legacy data is never bulk-copied or bulk-scanned at startup.
   - New v11 changes are saved into `FieldVerifyUserDataV11`.
   - The current production app remains untouched while v11 is tested.

## Initial progress layers

### ERS
- Pre-Drilled — orange
- Set — blue
- Final Drive — green

### Tieback
- Drilled — orange
- Initial Grout — gold
- Regrouted — blue
- Tested — purple
- Locked Off — green

### Waler
- Hung / Installed — orange
- Welded — blue
- Inspected — green

These names and colors are centralized in the status/progress engine so they can be changed without rewriting drawing, storage, or inspection code.

## Storage split

### App preferences
Tiny non-user-content UI preferences use `localStorage` under `fieldVerifyV11:appPrefs` (for example last selected project, progress view, or drawing IDs).

### User data
IndexedDB database: `FieldVerifyUserDataV11`

Stores:
- `projects`
- `records` (including progress-layer completion timestamps)
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
