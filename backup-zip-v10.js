/* FieldVerify Pro photo-safe backup + multi-file restore v10.2.0
   - Ensures backups carry actual IndexedDB photo blobs, not only record photo IDs.
   - Lets Restore Project select multiple JSON/PDF backups at once and merges them safely.
*/
(() => {
  'use strict';
  const PATCH_VERSION = '10.2.0';

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

  backupProject = async function photoSafeBackupProject() {
    try {
      const result = await buildProjectBackup();
      const { payload, photos, ncrPdfs = [], missingPhotoIds = [] } = result;
      const file = new File(
        [JSON.stringify(payload)],
        `FieldVerify-Pro-Photo-Safe-Backup-${new Date().toISOString().slice(0, 10)}.json`,
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

  function parseTime(value) {
    const t = value ? Date.parse(value) : NaN;
    return Number.isFinite(t) ? t : 0;
  }

  function recordTime(r) {
    if (!r || typeof r !== 'object') return 0;
    return Math.max(parseTime(r.updated), parseTime(r.unloadTime), parseTime(r.pickupTime));
  }

  function isBlank(v) {
    return v == null || v === '' || (Array.isArray(v) && !v.length);
  }

  function mergeHistory(a, b) {
    const out = [], seen = new Set();
    for (const h of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
      if (!h) continue;
      const key = String(h.id || `${h.time || ''}|${h.action || h.label || ''}|${JSON.stringify(h.fields || [])}`);
      if (seen.has(key)) continue;
      seen.add(key); out.push(h);
    }
    return out.sort((x, y) => parseTime(x.time) - parseTime(y.time)).slice(-100);
  }

  function mergeInspection(older, newer) {
    if (!older && !newer) return newer || older;
    return { ...(older || {}), ...(newer || {}) };
  }

  function mergeRecord(a0, b0) {
    const a = (a0 && typeof a0 === 'object') ? a0 : {};
    const b = (b0 && typeof b0 === 'object') ? b0 : {};
    const bNewer = recordTime(b) >= recordTime(a);
    const newer = bNewer ? b : a;
    const older = bNewer ? a : b;
    const out = { ...older, ...newer };

    // Older backups fill holes, but do not normally overwrite newer values.
    for (const [k, v] of Object.entries(older)) {
      if (isBlank(out[k]) && !isBlank(v)) out[k] = v;
    }
    out.photos = unique([...(Array.isArray(a.photos) ? a.photos : []), ...(Array.isArray(b.photos) ? b.photos : [])]);
    out.history = mergeHistory(a.history, b.history);
    out.inspection = mergeInspection(older.inspection, newer.inspection);
    return out;
  }

  function normalizeRecords(j) {
    let incoming = j?.records || j?.foundationInspectorRecords || j?.localStorage?.foundationInspectorRecords;
    if (typeof incoming === 'string') {
      try { incoming = JSON.parse(incoming); } catch { incoming = null; }
    }
    if (!incoming && j && typeof j === 'object' && !Array.isArray(j) && Object.keys(j).some(k => /^\d+$/.test(k))) incoming = j;
    if (Array.isArray(incoming)) incoming = Object.fromEntries(incoming.map((r, i) => [String(r?.caisson ?? r?.number ?? r?.id ?? i + 1), r]));
    if (!incoming || typeof incoming !== 'object') return {};
    const out = {};
    for (const [key, value] of Object.entries(incoming)) {
      if (typeof value === 'string') {
        try { out[key] = JSON.parse(value); } catch { out[key] = { ...defaultRec(), notes: value }; }
      } else if (value && typeof value === 'object') out[key] = value;
    }
    return out;
  }

  async function readBackupFile(file) {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdf = await pdfInfo(file), attachments = await pdf.getAttachments();
      const backup = attachments && Object.values(attachments).find(x => String(x.filename || '').toLowerCase().endsWith('.json'));
      if (!backup?.content) throw Error(`${file.name}: no FieldVerify backup attachment found`);
      return JSON.parse(new TextDecoder().decode(backup.content));
    }
    return JSON.parse(await file.text());
  }

  function mergeNcrRows(allRows) {
    const out = [], seen = new Map();
    for (const row of allRows) {
      if (!row || typeof row !== 'object') continue;
      const id = String(row['NCR Number'] ?? row['NCR #'] ?? row.NCR ?? row.id ?? '').trim();
      const key = id || JSON.stringify(row);
      if (!seen.has(key)) { seen.set(key, out.length); out.push(row); }
      else out[seen.get(key)] = { ...out[seen.get(key)], ...row };
    }
    return out;
  }

  async function restoreMany(files) {
    const parsed = [], errors = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      toast(`Reading backup ${i + 1} of ${files.length}…`);
      try { parsed.push({ file, data: await readBackupFile(file) }); }
      catch (err) { errors.push(err.message || `${file.name}: could not read`); }
    }
    if (!parsed.length) throw Error(errors[0] || 'No usable backup files found');

    // Oldest first, newest last. Record-level timestamps still decide conflicts.
    parsed.sort((a, b) => parseTime(a.data?.created) - parseTime(b.data?.created));

    let mergedRecords = { ...records };
    const allNcrRows = [...(Array.isArray(ncrRows) ? ncrRows : [])];
    const photoMap = new Map();
    const pdfMap = new Map();
    let newestDrawing = null, newestDrawingTime = 0;
    let recordSources = 0;

    for (const { data } of parsed) {
      const incoming = normalizeRecords(data);
      recordSources += Object.keys(incoming).length;
      for (const [n, r] of Object.entries(incoming)) mergedRecords[n] = mergeRecord(mergedRecords[n], r);

      const rows = data.ncrRows || data.foundationInspectorNcrData || data.localStorage?.foundationInspectorNcrData;
      if (Array.isArray(rows)) allNcrRows.push(...rows);

      for (const p of Array.isArray(data.photos) ? data.photos : []) {
        if (p?.id && p?.data) photoMap.set(String(p.id), p);
      }
      for (const p of Array.isArray(data.ncrPdfs) ? data.ncrPdfs : []) {
        if (p?.id && p?.data) pdfMap.set(String(p.id), p);
      }
      if (data.customDrawing?.data) {
        const t = parseTime(data.customDrawing.date) || parseTime(data.created);
        if (!newestDrawing || t >= newestDrawingTime) { newestDrawing = data.customDrawing; newestDrawingTime = t; }
      }
    }

    records = mergedRecords;
    ncrRows = mergeNcrRows(allNcrRows);

    const db = await openDB();
    let photoCount = 0, pdfCount = 0, skipped = 0;
    if (photoMap.size) {
      const tx = db.transaction('photos', 'readwrite'), store = tx.objectStore('photos');
      for (const p of photoMap.values()) {
        try {
          store.put({ ...p, blob: dataURLToBlob(p.data), data: undefined });
          const n = String(p.caisson ?? p.number ?? '');
          if (n && records[n]) records[n] = { ...records[n], photos: unique([...(records[n].photos || []), String(p.id)]) };
          photoCount++;
        } catch { skipped++; }
      }
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }

    if (pdfMap.size) {
      const tx = db.transaction('ncrPdfs', 'readwrite'), store = tx.objectStore('ncrPdfs');
      for (const p of pdfMap.values()) {
        try { store.put({ ...p, blob: dataURLToBlob(p.data), data: undefined }); localStorage.setItem(`ncrpdf:${p.id}`, 'yes'); pdfCount++; }
        catch { skipped++; }
      }
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }

    if (newestDrawing?.data) {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({
        id: drawingStorageId(), name: newestDrawing.name || 'Restored drawing', type: newestDrawing.type || 'image/png',
        date: newestDrawing.date || new Date().toISOString(), pageNumber: newestDrawing.pageNumber || 1,
        pageCount: newestDrawing.pageCount || 1, blob: dataURLToBlob(newestDrawing.data)
      });
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }

    persist(); persistNcr(); selected = null; nearest = null;
    await applyStoredDrawing(); renderPins(); showProjectHome();

    const missingRefs = referencedPhotoIds(records).filter(id => !photoMap.has(id));
    toast(`MERGED ${parsed.length} BACKUPS: ${Object.keys(records).length} records, ${photoCount} photos, ${pdfCount} NCR PDFs${errors.length ? ` · ${errors.length} file${errors.length === 1 ? '' : 's'} skipped` : ''}`);
    return { files: parsed.length, records: Object.keys(records).length, recordSources, photos: photoCount, ncrPdfs: pdfCount, skipped, missingPhotoRefs: missingRefs.length, errors };
  }

  // Upgrade Restore Project to allow selecting many backups in one pass.
  const restoreInput = document.getElementById('restoreInput');
  if (restoreInput) {
    restoreInput.multiple = true;
    restoreInput.setAttribute('multiple', 'multiple');
    restoreInput.accept = 'application/json,.json,.fip.json,application/pdf,.pdf';
    restoreInput.onchange = async e => {
      const files = [...(e.target.files || [])];
      if (!files.length) return;
      try {
        toast(files.length === 1 ? 'Restoring project…' : `Merging ${files.length} backup files…`);
        await restoreMany(files);
      } catch (err) {
        toast(`Restore failed: ${err.message}`);
      }
      e.target.value = '';
    };
  }

  try { bindTools(); } catch {}

  window.FIELDVERIFY_BACKUP_PATCH = {
    version: PATCH_VERSION,
    photoSafe: true,
    multiRestore: true,
    verify: async () => {
      const result = await buildProjectBackup();
      return result.payload.photoBackup;
    },
    restoreMany
  };

  console.info(`FieldVerify backup patch v${PATCH_VERSION} loaded · photo-safe + multi-file restore`);
})();
