# FieldVerify Recovery / Support Mode

## Decision
Keep recovery diagnostics in the app permanently, but remove them from the normal field workflow after the current recovery is complete.

## Normal users
Normal project users should not see recovery controls during routine work.

## Support access
Recommended access pattern after recovery is complete:
1. Tap the displayed FieldVerify version multiple times to reveal **Support / Recovery Mode**.
2. Read-only diagnostics are available first.
3. Any operation that changes records or photos requires authenticated project-owner/admin authorization through the cloud account.

A hard-coded JavaScript password is not considered secure because FieldVerify is a client-side web app and the code is public/downloadable. A hidden gesture is useful to prevent accidental use, but write access should ultimately be controlled by authenticated cloud role/ownership.

## Read-only diagnostics to keep
- Current project integrity scan.
- All-project scan when support mode is explicitly opened.
- Stored-photo inventory.
- Missing-reference report.
- Duplicate-image hash detection.
- Work-type collision audit.
- Cloud-vs-local comparison.
- Recovery report export.

## Recovery actions
Recovery/import actions must:
- never overwrite an existing photo blob automatically;
- never silently replace status, GPS, notes, inspection data, or history;
- create/export a recovery snapshot before any write operation;
- show exactly what will be added or changed;
- require explicit confirmation;
- retain a recovery event in the project history/audit log.

## Destructive operations
Deletion of old projects/photos/cloud data must never be part of automatic recovery. Cleanup should occur only after a verified master project exists and has been backed up.

## Current recovery period
While the 2026 recovery is active, keep the Recovery/Audit tools visible and easy to reach. Hide them only after the master project has been created, verified, and backed up.
