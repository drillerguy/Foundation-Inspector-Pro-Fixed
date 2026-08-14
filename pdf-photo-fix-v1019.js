/* FieldVerify Pro v10.19 - recover saved inspection photos before reports.
   Some older/restored records can lose their photo-id array even though the
   actual photo blobs are still present in IndexedDB with a caisson number.
   This patch reconnects those orphaned photos for the legacy foundation
   project and makes report photo lookup resilient to missing record links.
*/
(() => {
  'use strict';
  const PATCH_VERSION = '10.19';

  if (typeof openDB !== 'function' || typeof allFromStore !== 'function' || typeof rec !== 'function') {
    console.warn('Photo recovery patch could not find the core data functions');
    return;
  }

  const originalGetPhotos = typeof getPhotos === 'function' ? getPhotos : null;
  const originalShareOfficeReport = typeof shareOfficeReport === 'function' ? shareOfficeReport : null;

  function photoNumber(p) {
    const raw = p?.caisson ?? p?.number ?? p?.itemNumber ?? p?.item;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function recoverPhotoLinks(options = {}) {
    const { quiet = false } = options;
    // Old photo rows were not project-scoped. Only auto-recover orphan rows
    // in the original legacy foundation project so a new project cannot
    // accidentally inherit another project's pictures.
    if (typeof activeProjectId !== 'undefined' && activeProjectId !== 'legacy') return { repaired: 0, found: 0 };

    const db = await openDB();
    const rows = await allFromStore(db, 'photos');
    let repaired = 0;
    const found = rows.length;
    const byItem = new Map();

    for (const p of rows) {
      if (!p?.id) continue;
      const n = photoNumber(p);
      if (n == null) continue;
      const key = String(n);
      if (!byItem.has(key)) byItem.set(key, []);
      byItem.get(key).push(String(p.id));
    }

    for (const [key, ids] of byItem) {
      const current = rec(key);
      const existing = Array.isArray(current.photos) ? current.photos.map(String) : [];
      const merged = [...new Set([...existing, ...ids])];
      if (merged.length !== existing.length || merged.some((id, i) => id !== existing[i])) {
        records[key] = { ...current, photos: merged, updated: current.updated || new Date().toISOString() };
        repaired += merged.length - existing.length;
      }
    }

    if (repaired > 0 && typeof persist === 'function') persist();
    if (!quiet && typeof toast === 'function' && repaired > 0) toast(`Recovered ${repaired} saved photo link${repaired === 1 ? '' : 's'}`);
    return { repaired, found };
  }

  // Make every report resilient even before a record has been repaired.
  if (originalGetPhotos) {
    getPhotos = async function resilientGetPhotos(n) {
      const linked = await originalGetPhotos(n);
      if (typeof activeProjectId !== 'undefined' && activeProjectId !== 'legacy') return linked;
      try {
        const db = await openDB();
        const rows = await allFromStore(db, 'photos');
        const extras = rows.filter(p => photoNumber(p) === Number(n));
        const map = new Map();
        for (const p of [...linked, ...extras]) if (p?.id) map.set(String(p.id), p);
        return [...map.values()].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
      } catch (err) {
        console.warn('Photo fallback lookup failed', err);
        return linked;
      }
    };
  }

  if (originalShareOfficeReport) {
    shareOfficeReport = async function officeReportWithRecoveredPhotos() {
      try {
        const result = await recoverPhotoLinks({ quiet: true });
        if (typeof toast === 'function') {
          if (result.repaired > 0) toast(`Recovered ${result.repaired} photo links - building complete office PDF…`);
          else if (result.found > 0) toast(`Verified ${result.found} saved photos - building office PDF…`);
        }
      } catch (err) {
        console.error('Photo recovery before office report failed', err);
        if (typeof toast === 'function') toast(`Photo recovery warning: ${err.message}`);
      }
      return originalShareOfficeReport();
    };
  }

  window.FieldVerifyPhotoRepair = recoverPhotoLinks;

  // Repair quietly on startup so the UI photo counts also heal themselves.
  setTimeout(() => recoverPhotoLinks({ quiet: true }).catch(err => console.warn('Startup photo recovery failed', err)), 600);
  console.info(`FieldVerify PDF photo recovery patch ${PATCH_VERSION} loaded`);
})();
