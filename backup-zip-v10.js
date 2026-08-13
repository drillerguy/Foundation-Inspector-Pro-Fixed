/* FieldVerify Pro photo-safe backup guard v10.1.0
   Ensures backups carry the actual IndexedDB photo blobs, not only record photo IDs.
*/
(() => {
  'use strict';
  const PATCH_VERSION = '10.1.0';

  function unique(values) {
    return [...new Set((values || []).filter(Boolean).map(String))];
  }

  function referencedPhotoIds(sourceRecords) {
    return unique(Object.values(sourceRecords || {}).flatMap(r => Array.isArray(r?.photos) ? r.photos : []));
  }

  function photoDataUrlLooksValid(value) {
    return typeof value === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) && value.length > 64;
  }

  async function readAllPhotos() {
    const db = await openDB();
    return await allFromStore(db, 'photos');
  }

  async function makePhotoSafeBackup() {
    const original = await originalBuildProjectBackup();
    const payload = original?.payload || {};
    const sourceRecords = payload.records || records || {};
    const refs = referencedPhotoIds(sourceRecords);

    let stored = [];
    try { stored = await readAllPhotos(); } catch (err) { console.warn('Photo-safe backup scan failed', err); }

    const byId = new Map(stored.filter(p => p?.id).map(p => [String(p.id), p]));
    const byCaisson = new Map();
    for (const p of stored) {
      const key = p?.caisson ?? p?.number;
      if (key == null) continue;
      const k = String(key);
      if (!byCaisson.has(k)) byCaisson.set(k, []);
      byCaisson.get(k).push(p);
    }

    const photoMap = new Map();
    for (const p of Array.isArray(payload.photos) ? payload.photos : []) {
      if (p?.id && photoDataUrlLooksValid(p.data)) photoMap.set(String(p.id), p);
    }

    // First recover every explicitly referenced photo ID from IndexedDB.
    for (const id of refs) {
      if (photoMap.has(id)) continue;
      const p = byId.get(id);
      if (!p?.blob) continue;
      try {
        photoMap.set(id, { ...p, blob: undefined, data: await blobToDataURL(p.blob) });
      } catch (err) {
        console.warn('Could not encode photo', id, err);
      }
    }

    // Also recover orphaned photos by caisson/item number and relink them.
    for (const [n, r0] of Object.entries(sourceRecords)) {
      const r = r0 || {};
      const ids = unique(r.photos);
      for (const p of byCaisson.get(String(n)) || []) {
        if (!p?.id || !p?.blob) continue;
        const id = String(p.id);
        if (!ids.includes(id)) ids.push(id);
        if (!photoMap.has(id)) {
          try {
            photoMap.set(id, { ...p, blob: undefined, data: await blobToDataURL(p.blob) });
          } catch (err) {
            console.warn('Could not encode orphaned photo', id, err);
          }
        }
      }
      if (ids.length) sourceRecords[n] = { ...r, photos: ids };
    }

    const finalRefs = referencedPhotoIds(sourceRecords);
    const finalPhotos = [...photoMap.values()].filter(p => p?.id && photoDataUrlLooksValid(p.data));
    const included = new Set(finalPhotos.map(p => String(p.id)));
    const missing = finalRefs.filter(id => !included.has(id));

    payload.records = sourceRecords;
    payload.photos = finalPhotos;
    payload.version = Math.max(Number(payload.version) || 0, 10);
    payload.backupFormat = 'FieldVerify Photo-Safe Backup';
    payload.backupPatchVersion = PATCH_VERSION;
    payload.photoBackup = {
      referenced: finalRefs.length,
      embedded: finalPhotos.length,
      missing: missing.length,
      missingIds: missing
    };

    return { ...original, payload, photos: finalPhotos, missingPhotoIds: missing };
  }

  const originalBuildProjectBackup = buildProjectBackup;
  buildProjectBackup = makePhotoSafeBackup;

  // Replace the manual backup action with a verified version that clearly reports photo status.
  backupProject = async function photoSafeBackupProject() {
    try {
      const result = await buildProjectBackup();
      const { payload, photos, ncrPdfs = [], missingPhotoIds = [] } = result;
      const safeReason = 'Photo-Safe-Backup';
      const file = new File(
        [JSON.stringify(payload)],
        `FieldVerify-Pro-${safeReason}-${new Date().toISOString().slice(0, 10)}.json`,
        { type: 'application/json' }
      );
      downloadFile(file);
      if (missingPhotoIds.length) {
        toast(`Backup saved: ${photos.length} photos embedded · ${missingPhotoIds.length} old photo file${missingPhotoIds.length === 1 ? '' : 's'} missing from this device`);
      } else {
        toast(`PHOTO-SAFE BACKUP: ${Object.keys(records).length} records, ${photos.length} photos, ${ncrPdfs.length} NCR PDFs`);
      }
    } catch (err) {
      toast(`Backup failed: ${err.message}`);
    }
  };

  // Re-bind any already-rendered tools to the patched backup function.
  try { bindTools(); } catch {}

  window.FIELDVERIFY_BACKUP_PATCH = {
    version: PATCH_VERSION,
    photoSafe: true,
    verify: async () => {
      const result = await buildProjectBackup();
      return result.payload.photoBackup;
    }
  };

  console.info(`FieldVerify photo-safe backup patch v${PATCH_VERSION} loaded`);
})();
