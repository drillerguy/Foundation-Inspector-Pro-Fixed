# FieldVerify Pro Changelog

This changelog records production changes, patches, recovery tools, and major development work. Entries from v10.25.50 through v10.25.72 were reconstructed from GitHub commit history on 2026-09-17. Older history can be backfilled from earlier commits as needed.

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

## v10.25.77 — 2026-09-17
**Recovery / Final Donor Photo Sweep**
- Added a read-only **Final Donor Photo Sweep** for the verified Recovery Master.
- Compares every remaining missing-photo evidence ID against surviving local photo blobs and preserved old-project references.
- Uses work-type-safe canonical identities, item number/type, photo-row metadata, GPS/time as supporting evidence, and existing source-project links.
- Excludes mass-repeated image hashes and same-image duplicates already present in the master from strong donor matches.
- Does not attach, move, replace, rename, or delete any photo. Candidate attachment remains a separate explicit recovery decision.

## v10.25.72 — 2026-09-17
**Recovery / Status Rollback Protection**
- Reviewed the exported v10.25.71 Clean Master Preview before allowing master creation.
- Found that some older snapshots proved a Caisson was `Completed`, while later restore-era snapshots carried a lower status such as `Verified GPS`, `Picked up`, or `Work started`.
- Changed recovery status selection to preserve the furthest proven work stage first, using timestamp only to break ties within the same stage.
- This prevents recovery from rolling a completed record backward merely because a restored snapshot has a newer timestamp.
- Existing source projects remain untouched; the user must rebuild the preview before creating the clean master.

## v10.25.71 — 2026-09-17
**Recovery / Clean Master Builder**
- Added a non-destructive **Clean Recovery Master** builder.
- Scans all preserved local project snapshots and the shared IndexedDB photo store.
- Separates Caisson, ERS, Tieback, Waler and other work types into type-safe identities before merging.
- Keeps the most useful/latest non-empty status, notes, GPS, inspection data, progress and history while preserving compact source provenance.
- Removes duplicate copies of the same image within a single item.
- Quarantines any image hash referenced by three or more different item identities, which catches the known mass-repeated recovered-photo corruption without deleting the source photo rows.
- Keeps two-item duplicate hashes but flags them for visual review instead of automatically discarding them.
- Missing photo IDs are preserved in recovery metadata rather than shown as working thumbnails.
- **Create New Clean Master Copy** writes only a brand-new local project. Existing projects, records and photo blobs remain unchanged.
- A pre-master snapshot JSON is exported before the new local master is written.
- The new master is intentionally local-only and is not moved to the shared cloud until verification is complete.

## v10.25.70 — 2026-09-17
**Storage / Work-Type Isolation**
- Added a type-safe identity namespace for ERS and Tieback selections so new work no longer reuses the same numeric record key as a Caisson with the same visible number.
- ERS and Tieback selections now use isolated internal keys while preserving visible labels such as `E-238`.
- Added canonical identity metadata such as `ERS:E-238`, `Tieback:E-238`, and `Caisson:238` for new records/photos.
- Added a capture-layer patch for current ERS/Tieback drawing selection controls so future selections cannot overwrite a same-number Caisson record.
- Photo rows created after this patch are stamped with project, work type, visible label, internal item key, and canonical item identity.
- Corrected target naming so the saved record type controls the displayed label instead of the currently selected dropdown type.
- This release does **not** delete or rewrite legacy/test projects and does **not** automatically migrate the existing collision records. Those remain preserved for recovery-master construction.

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
