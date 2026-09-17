# FieldVerify Work-Type Collision Audit — 2026-09-17

Source: exported read-only FieldVerify work-type audit from v10.25.69.

## Summary
- Projects scanned: 9
- Stored photo rows: 191
- Unique stored image hashes: 134
- Cross-project numeric work-type collisions: 15
- Unsafe numeric non-caisson records: 15
- Photo IDs linked to different typed items: 0
- Duplicate image hash groups: 5

## Confirmed numeric collisions
The legacy record model allows different work types to share the same numeric key. Confirmed collisions:

- 238 — Caisson / ERS
- 240 — Caisson / ERS
- 249 — Caisson / Waler
- 260 — Caisson / ERS
- 261 — Caisson / ERS
- 262 — Caisson / ERS
- 264 — Caisson / ERS
- 265 — Caisson / ERS
- 266 — Caisson / ERS
- 267 — Caisson / ERS
- 268 — Caisson / ERS
- 269 — Caisson / ERS
- 273 — Caisson / ERS
- 279 — Caisson / ERS
- 280 — Caisson / ERS

## Important examples
- Numeric key 238 exists as Caisson 238 in older/local snapshots and as ERS E-238 in the shared cloud project. The ERS record is marked Completed.
- Numeric key 240 exists as Caisson 240 in older/local snapshots and as ERS E-240 in the shared cloud project. The ERS record is marked Work started.
- Numeric key 249 overlaps a Caisson record and Waler E-249–E-256. The shared cloud Caisson 249 record is marked Work started and has one photo reference.
- Numeric keys 260, 261, 262, 264, 265, 266, 268, 269, 273 and 279 appear as ERS records in the shared cloud project while older snapshots preserve the same numeric keys as Caissons.
- E-267 and E-280 also occupy numeric Caisson keys even though their current ERS status is No information.

## Photo finding
No existing photo ID in this audit is linked to two differently typed items. This is good: the known bleed is currently visible primarily at the record-key/type layer rather than a confirmed same-photo-ID cross-type attachment in this exported snapshot.

This does not prove every photo is correctly classified; it only means the exact same photo ID is not currently referenced by two different work types in the audited project snapshots.

## Recovery rule
Do not merge these records by numeric key.

The recovery master must use a compound identity such as:
- `Caisson:238`
- `ERS:E-238`
- `Tieback:E-238`
- `Waler:E-249-E-256`

Project identity must also remain part of cloud/storage ownership.

## Migration design
1. Preserve all current project snapshots unchanged.
2. Build a new master in a separate namespace; do not mutate source projects in place.
3. Treat Caisson, ERS, Tieback and Waler as separate record domains even when their visible numbers match.
4. Preserve each record's status, GPS, notes, inspection data, history and photo references independently.
5. Preserve photo blobs by immutable photo ID and hash; never overwrite an existing blob automatically.
6. Quarantine known repeated-image corruption groups during photo merge.
7. Verify the master before deleting or hiding any legacy/test project.
8. Future saves must generate type-safe item keys before syncing to cloud.

## Production fix required before clean master becomes the normal working project
The current number-only local record identity must be retired for new writes. Future storage and cloud synchronization should use Project + Work Type + Item ID as the canonical identity. A compatibility layer may read legacy numeric records during migration, but new writes must not be able to overwrite a different work type that shares the same visible number.
