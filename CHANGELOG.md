# FieldVerify Pro Changelog

This changelog records production changes, patches, recovery tools, and major development work. Entries from v10.25.50 through v10.25.69 were reconstructed from GitHub commit history on 2026-09-17. Older history can be backfilled from earlier commits as needed.

## Release logging rules going forward

For every production version:
- record the version and date;
- describe the user-visible change;
- list important bug fixes and patches;
- note any storage, cloud, photo, drawing, or recovery impact;
- note whether a migration is required;
- link the release to the GitHub commit(s) through repository history;
- never remove an older changelog entry when a later patch supersedes it.

Recovery-only tooling should be marked **Recovery / Support** and kept separate from normal field workflow.

---

## v10.25.69 — 2026-09-17
**Recovery / Support**
- Added a read-only all-project work-type collision audit.
- Added checks intended to identify Caisson / ERS / Tieback / Waler number collisions before building a recovery master.
- Data Recovery launcher now opens the work-type audit.
- No project records, photos, drawings, or cloud data are modified by the audit.

## v10.25.68 — 2026-09-17
**Recovery / Support**
- Added **Scan All Projects** recovery analysis.
- Scans every local project against the device photo database.
- Reports per-project record count, photo references, photos found on device, missing references, multi-project photo references, duplicate-image hashes, and truly unlinked photos.

## v10.25.67 — 2026-09-17
**Recovery / Support**
- Added a standalone Recovery Center.
- Added a direct **DATA RECOVERY** launcher so recovery access does not depend on the earlier injected module button.
- Recovery Center supports device scan, backup analysis, safe photo recovery, and recovery-report export.

## v10.25.66 — 2026-09-17
**Recovery / Support**
- Added non-destructive FieldVerify data-recovery scanner and safe photo importer.
- Recovery logic blocks replacement of existing photo blobs and avoids overwriting record status, GPS, notes, or history.
- Added duplicate-content hashing safeguards for suspicious repeated images.

## v10.25.65 — 2026-09-15
**Cloud / Invitations**
- Added the FieldVerify app link to project invitation emails.
- Updated production loader for the invite-link patch.

## v10.25.64 — 2026-09-15
**Cloud Sync**
- Added verified cloud-sync status.
- Improved visibility into whether shared project data/photos are actually synchronized.

## v10.25.63 — 2026-09-15
**Cloud / Project Access**
- Restored project invite and access tools.
- Added a visible Invite Project shortcut for shared projects.

## v10.25.62 — 2026-09-15
**Reports / Sharing**
- Fixed stale office-report queue behavior.
- Filtered empty inspection records from reports.
- Fixed Daily Shift Report popup behavior and stale PDF share queue handling.

## v10.25.61 — 2026-09-15
**iPhone Reports**
- Added a lighter-weight iPhone field-log and daily-PDF sharing workflow.
- Avoided opening the crash-prone report page during sharing.

## v10.25.60 — 2026-09-15
**iPhone Reports**
- Fixed iPhone Daily Report and Field Log email sharing.

## v10.25.59 — 2026-09-15
**Reports / Email**
- Added email-recipient workflow for the daily inspection report.
- Loaded the daily email-report workflow into production.

## v10.25.58 — 2026-09-10
**Reports / Stability**
- Enabled memory-safe office-report sharing.

## v10.25.57 — 2026-09-10
**ERS / Drawing Tools**
- Allowed ERS PDF magnifier taps to pass through status hit boxes.
- Enabled cleaner tap-through PDF magnifier behavior.

## v10.25.56 — 2026-09-10
**ERS / Drawing Tools**
- Added a high-resolution PDF magnifier for ERS / tieback drawings.
- Switched the ERS picker to the high-resolution PDF loupe.

## v10.25.55 — 2026-09-10
**ERS / Number Selection**
- Added first-to-last ERS row number generator fallback.
- Loaded the row generator into production.

## v10.25.54 — 2026-09-10
**ERS / Picker**
- Fixed ERS picker PDF coordinates and local row detection.
- Loaded the coordinate-picker fix into production.

## v10.25.53 — 2026-09-10
**ERS / Picker**
- Made ERS magnifier numbers depend on the tapped drawing area.
- Updated the location-aware ERS picker.

## v10.25.52 — 2026-09-10
**Drawing Markup**
- Made drawing eraser controls visible and easier to use.

## v10.25.51 — 2026-09-09
**ERS / Status Tracking**
- Added selectable ERS / tieback drawing status boxes.
- Used drawing boxes for selectable status colors.

## v10.25.50 — 2026-09-01
**Drawings**
- Fixed shared PDF drawing loading for ERS, Tieback, and Waler.
- Added the shared-PDF drawing compatibility patch to production.

---

# v11 development track — not production

The repository also contains an in-progress v11 rebuild. GitHub history shows work including:
- project creation workflow;
- project-owned drawings rather than bundled job-specific drawings;
- removal of bundled caisson map data in v11;
- explicit GPS/photo capture workflow;
- feature-parity tracking against production;
- ERS stages: Pre-Drilled, Set, Final Drive.

v11 is a development track and should not be treated as the current production app until explicitly promoted.

---

# Known recovery-era issue being corrected

The legacy production record model can use the same numeric record key for different work types. Example: Caisson `284` and ERS `E-284` can collide if both are stored under numeric key `284`. Recovery work is preserving existing evidence first, then the storage model will be separated by project + work type + item identity before the clean master project is created.
