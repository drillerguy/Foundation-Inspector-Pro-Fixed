(() => {
  'use strict';

  const VERSION = 'v8 iCloud + Excel';
  let xlsxPromise = null;

  function notify(message) {
    try { toast(message); }
    catch (_) { alert(message); }
  }

  function stamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxPromise) return xlsxPromise;
    xlsxPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error('Excel library could not load. Check your internet connection.'));
      document.head.appendChild(script);
    });
    return xlsxPromise;
  }

  async function collectBackup() {
    const photos = [];
    try {
      const db = await openDB();
      const all = await getAllPhotos(db);
      for (const p of all) {
        photos.push({ ...p, blob: undefined, data: await blobToDataURL(p.blob) });
      }
    } catch (_) {
      // Records still save even if photos cannot be read.
    }
    return {
      app: 'Foundation Inspector Pro',
      version: 8,
      created: new Date().toISOString(),
      records,
      photos
    };
  }

  async function saveToICloud() {
    try {
      notify('Preparing iCloud backup…');
      const payload = await collectBackup();
      const name = `Foundation-Inspector-Backup-${stamp()}.json`;
      const file = new File([JSON.stringify(payload)], name, { type: 'application/json' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Foundation Inspector Backup',
          text: 'Choose Save to Files, then select iCloud Drive.',
          files: [file]
        });
        localStorage.setItem('foundationLastICloudBackup', new Date().toISOString());
        notify('Choose Save to Files, then iCloud Drive');
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        notify('Backup downloaded. Move it to iCloud Drive in Files.');
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      notify(`iCloud save failed: ${error.message || error}`);
    }
  }

  function dateText(value) {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  async function exportExcel() {
    try {
      notify('Creating Excel workbook…');
      const XLSX = await loadXLSX();
      const entries = Object.entries(records || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
      const rows = entries.map(([number, r]) => ({
        'Caisson Number': Number(number),
        'Status': r.status || '',
        'Pickup Time': dateText(r.pickupTime),
        'Unload Time': dateText(r.unloadTime),
        'Latitude': r.lat ?? '',
        'Longitude': r.lon ?? '',
        'Verified': r.verified ? 'Yes' : 'No',
        'Notes': r.notes || '',
        'Photo Count': Array.isArray(r.photos) ? r.photos.length : 0,
        'Last Updated': dateText(r.updated),
        'Pickup GPS Accuracy (ft)': r.pickupGPS?.accuracy != null ? Math.round(r.pickupGPS.accuracy * 3.28084) : '',
        'Unload GPS Accuracy (ft)': r.unloadGPS?.accuracy != null ? Math.round(r.unloadGPS.accuracy * 3.28084) : ''
      }));

      const unloaded = rows.filter(r => r['Unload Time']).length;
      const picked = rows.filter(r => r['Pickup Time'] && !r['Unload Time']).length;
      const summary = [
        { 'Project Metric': 'Total saved records', Value: rows.length },
        { 'Project Metric': 'Unloaded', Value: unloaded },
        { 'Project Metric': 'Picked up, not unloaded', Value: picked },
        { 'Project Metric': 'Other saved records', Value: Math.max(0, rows.length - unloaded - picked) },
        { 'Project Metric': 'Completion %', Value: rows.length ? Math.round(unloaded / rows.length * 100) : 0 },
        { 'Project Metric': 'Exported', Value: new Date().toLocaleString() }
      ];

      const wb = XLSX.utils.book_new();
      const dashboard = XLSX.utils.json_to_sheet(summary);
      const data = XLSX.utils.json_to_sheet(rows);
      dashboard['!cols'] = [{ wch: 30 }, { wch: 24 }];
      data['!cols'] = [
        { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 22 },
        { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 42 },
        { wch: 12 }, { wch: 22 }, { wch: 25 }, { wch: 25 }
      ];
      if (data['!ref']) data['!autofilter'] = { ref: data['!ref'] };
      XLSX.utils.book_append_sheet(wb, dashboard, 'Dashboard');
      XLSX.utils.book_append_sheet(wb, data, 'Inspection Data');
      XLSX.writeFile(wb, `Foundation-Inspector-${stamp()}.xlsx`);
      notify(`Excel created — ${rows.length} records`);
    } catch (error) {
      notify(`Excel export failed: ${error.message || error}`);
    }
  }

  function addTools() {
    const tools = document.querySelector('.tools');
    if (!tools || document.getElementById('icloudBtn')) return;

    const cloud = document.createElement('button');
    cloud.id = 'icloudBtn';
    cloud.textContent = 'Save to iCloud';
    cloud.onclick = saveToICloud;

    const excel = document.createElement('button');
    excel.id = 'excelBtn';
    excel.textContent = 'Export Excel';
    excel.onclick = exportExcel;

    tools.append(cloud, excel);

    const titleVersion = document.querySelector('.title span');
    if (titleVersion) titleVersion.textContent = VERSION;

    const last = localStorage.getItem('foundationLastICloudBackup');
    if (last && !document.getElementById('lastCloudSave')) {
      const note = document.createElement('div');
      note.id = 'lastCloudSave';
      note.className = 'tiny';
      note.style.gridColumn = '1 / -1';
      note.textContent = `Last iCloud backup: ${new Date(last).toLocaleString()}`;
      tools.appendChild(note);
    }
  }

  const observer = new MutationObserver(addTools);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addTools();
})();


/* iPhone-safe Restore Project fix */
(() => {
  'use strict';

  let restoreInputV8 = null;

  function v8Toast(message) {
    try { toast(message); }
    catch (_) { alert(message); }
  }

  function ensureRestoreInput() {
    if (restoreInputV8 && document.body.contains(restoreInputV8)) return restoreInputV8;

    restoreInputV8 = document.createElement('input');
    restoreInputV8.type = 'file';
    restoreInputV8.accept = '.json,application/json,text/json';
    restoreInputV8.setAttribute('aria-label', 'Open Foundation Inspector backup');
    restoreInputV8.style.position = 'fixed';
    restoreInputV8.style.left = '-1000px';
    restoreInputV8.style.top = '0';
    restoreInputV8.style.width = '1px';
    restoreInputV8.style.height = '1px';
    restoreInputV8.style.opacity = '0';
    restoreInputV8.style.pointerEvents = 'none';

    restoreInputV8.addEventListener('change', async () => {
      const file = restoreInputV8.files && restoreInputV8.files[0];
      if (!file) return;

      try {
        v8Toast('Opening backup…');
        const text = await file.text();
        const backup = JSON.parse(text);

        const incoming =
          backup.records ||
          backup.foundationInspectorRecords ||
          backup.localStorage?.foundationInspectorRecords;

        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          throw new Error('This file does not contain inspection records');
        }

        const count = Object.keys(incoming).length;
        const current = (typeof records === 'object' && records) ? records : {};
        records = { ...current, ...incoming };

        if (Array.isArray(backup.photos) && backup.photos.length) {
          const db = await openDB();
          const tx = db.transaction('photos', 'readwrite');
          const store = tx.objectStore('photos');

          for (const photo of backup.photos) {
            if (!photo || !photo.id || !photo.data) continue;
            store.put({
              ...photo,
              blob: dataURLToBlob(photo.data),
              data: undefined
            });
          }

          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('Pictures could not be restored'));
            tx.onabort = () => reject(tx.error || new Error('Picture restore was interrupted'));
          });
        }

        localStorage.setItem('foundationInspectorRecords', JSON.stringify(records));

        try {
          selected = null;
          nearest = null;
          persist();
          showTarget();
        } catch (_) {
          location.reload();
          return;
        }

        v8Toast(`Restore complete — ${count} records loaded`);
      } catch (error) {
        v8Toast(`Restore failed: ${error.message || error}`);
      } finally {
        restoreInputV8.value = '';
      }
    });

    document.body.appendChild(restoreInputV8);
    return restoreInputV8;
  }

  function bindRestoreButton() {
    const button = document.getElementById('restoreBtn');
    if (!button || button.dataset.v8Restore === 'yes') return;

    button.dataset.v8Restore = 'yes';
    button.textContent = 'Restore Project';

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const input = ensureRestoreInput();
      input.click();
    }, true);
  }

  const observer = new MutationObserver(bindRestoreButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureRestoreInput();
      bindRestoreButton();
    }, { once: true });
  } else {
    ensureRestoreInput();
    bindRestoreButton();
  }
})();

(() => {
  'use strict';

  const PROJECT_DB = 'foundationInspectorProjects';
  const PROJECT_STORE = 'projects';
  const ACTIVE_KEY = 'foundationActiveProject';
  const LEGACY_ID = 'ohare-current';
  const RECORD_PREFIX = 'foundationInspectorRecords:';
  let activeProjectId = localStorage.getItem(ACTIVE_KEY) || LEGACY_ID;
  let legacyHotspots = null;
  let legacyDrawing = null;
  let markMode = false;
  let originalPersist = null;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const safeName = value => String(value || '').trim() || 'Untitled Project';

  function msg(text) {
    try { toast(text); } catch (_) { alert(text); }
  }

  function openProjectDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(PROJECT_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(PROJECT_STORE)) {
          req.result.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getProjects() {
    const db = await openProjectDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(PROJECT_STORE).objectStore(PROJECT_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getProject(id) {
    if (id === LEGACY_ID) return {
      id: LEGACY_ID,
      name: "O'Hare Current Project",
      builtIn: true,
      hotspots: legacyHotspots || [],
      drawingData: legacyDrawing
    };
    const db = await openProjectDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(PROJECT_STORE).objectStore(PROJECT_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function putProject(project) {
    const db = await openProjectDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROJECT_STORE, 'readwrite');
      tx.objectStore(PROJECT_STORE).put(project);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteProject(id) {
    const db = await openProjectDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROJECT_STORE, 'readwrite');
      tx.objectStore(PROJECT_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function loadPdfLibrary() {
    if (window.pdfjsLib) return window.pdfjsLib;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('PDF drawing support could not load'));
      document.head.appendChild(script);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib;
  }

  async function drawingFromFile(file) {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      msg('Converting the first PDF page…');
      const pdfjs = await loadPdfLibrary();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.9);
    }
    if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPG, or PDF drawing');
    return readFileAsDataURL(file);
  }

  function projectRecordKey(id) {
    return RECORD_PREFIX + id;
  }

  function saveActiveRecords() {
    if (activeProjectId === LEGACY_ID) {
      localStorage.setItem('foundationInspectorRecords', JSON.stringify(records || {}));
    } else {
      localStorage.setItem(projectRecordKey(activeProjectId), JSON.stringify(records || {}));
    }
  }

  function updateProjectBadge(name) {
    let badge = document.getElementById('projectNameBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'projectNameBadge';
      badge.className = 'badge';
      const line = document.querySelector('.gpsline');
      if (line) line.prepend(badge);
    }
    badge.textContent = name || 'Project';
  }

  async function activateProject(id) {
    saveActiveRecords();
    const project = await getProject(id);
    if (!project) throw new Error('Project could not be found');

    activeProjectId = id;
    localStorage.setItem(ACTIVE_KEY, id);
    selected = null;
    nearest = null;
    transform = null;

    if (id === LEGACY_ID) {
      HOTSPOTS = JSON.parse(JSON.stringify(legacyHotspots || []));
      records = {
        ...JSON.parse(localStorage.getItem('ordCaissonRecords') || '{}'),
        ...JSON.parse(localStorage.getItem('foundationInspectorRecords') || '{}')
      };
      document.querySelector('#map img').src = legacyDrawing;
    } else {
      HOTSPOTS = JSON.parse(JSON.stringify(project.hotspots || []));
      records = JSON.parse(localStorage.getItem(projectRecordKey(id)) || '{}');
      document.querySelector('#map img').src = project.drawingData;
    }

    renderPins();
    fitTransform();
    showTarget();
    updateProjectBadge(project.name);
    closeProjectModal();
    msg(`${project.name} opened`);
  }

  function installProjectPersist() {
    if (originalPersist) return;
    originalPersist = persist;
    persist = function () {
      saveActiveRecords();
      renderPins();
      fitTransform();
    };
  }

  function modalStyles() {
    if (document.getElementById('projectV9Styles')) return;
    const style = document.createElement('style');
    style.id = 'projectV9Styles';
    style.textContent = `
      .project-modal{position:fixed;inset:0;z-index:300;background:#0009;display:flex;align-items:flex-start;justify-content:center;padding:calc(20px + env(safe-area-inset-top)) 12px 20px;overflow:auto}
      .project-box{width:min(620px,100%);background:#fff;border-radius:16px;padding:15px;color:#15202b}
      .project-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
      .project-head h2{margin:0}
      .project-close{padding:9px 12px;background:#e7edf4}
      .project-list{display:grid;gap:8px;margin:12px 0}
      .project-row{border:1px solid #d7dee7;border-radius:12px;padding:10px;display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center}
      .project-row button,.project-create button{padding:10px 12px;background:#083a73;color:#fff}
      .project-row .danger{background:#a62828}
      .project-create{border-top:1px solid #d7dee7;padding-top:12px;display:grid;gap:8px}
      .project-create input{width:100%;border:1px solid #c8d0d9;border-radius:10px;padding:11px}
      .mark-banner{position:fixed;left:10px;right:10px;top:calc(8px + env(safe-area-inset-top));z-index:350;background:#fff4cc;border:2px solid #e0b329;border-radius:12px;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
      .mark-banner button{padding:9px 12px;background:#083a73;color:#fff}
    `;
    document.head.appendChild(style);
  }

  function closeProjectModal() {
    document.getElementById('projectModalV9')?.remove();
  }

  async function openProjectModal() {
    modalStyles();
    closeProjectModal();

    const modal = document.createElement('div');
    modal.id = 'projectModalV9';
    modal.className = 'project-modal';
    modal.innerHTML = `
      <div class="project-box">
        <div class="project-head">
          <h2>Projects & Drawings</h2>
          <button class="project-close" id="projectCloseV9">Close</button>
        </div>
        <p class="tiny">Open the current job or load a PNG, JPG, or the first page of a PDF drawing for a future project.</p>
        <div class="project-list" id="projectListV9"></div>
        <div class="project-create">
          <strong>Create New Project</strong>
          <input id="newProjectNameV9" placeholder="Project name">
          <input id="newDrawingV9" type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf">
          <button id="createProjectV9">Load Drawing & Create Project</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('projectCloseV9').onclick = closeProjectModal;

    const projects = [{ id: LEGACY_ID, name: "O'Hare Current Project", builtIn: true }, ...(await getProjects())];
    const list = document.getElementById('projectListV9');
    list.innerHTML = projects.map(p => `
      <div class="project-row">
        <div><strong>${esc(p.name)}</strong><div class="tiny">${p.id === activeProjectId ? 'Currently open' : (p.builtIn ? 'Built-in project' : `${(p.hotspots || []).length} marked locations`)}</div></div>
        <button data-open="${p.id}">Open</button>
        ${p.builtIn ? '<span></span>' : `<button class="danger" data-delete="${p.id}">Delete</button>`}
      </div>`).join('');

    list.querySelectorAll('[data-open]').forEach(button => {
      button.onclick = () => activateProject(button.dataset.open).catch(error => msg(error.message));
    });
    list.querySelectorAll('[data-delete]').forEach(button => {
      button.onclick = async () => {
        if (!confirm('Delete this project drawing and its setup?')) return;
        await deleteProject(button.dataset.delete);
        localStorage.removeItem(projectRecordKey(button.dataset.delete));
        if (activeProjectId === button.dataset.delete) await activateProject(LEGACY_ID);
        openProjectModal();
      };
    });

    document.getElementById('createProjectV9').onclick = async () => {
      const name = safeName(document.getElementById('newProjectNameV9').value);
      const file = document.getElementById('newDrawingV9').files[0];
      if (!file) return msg('Choose a drawing first');
      try {
        const drawingData = await drawingFromFile(file);
        const project = {
          id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          drawingData,
          drawingFileName: file.name,
          hotspots: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
        await putProject(project);
        await activateProject(project.id);
        startMarkMode();
      } catch (error) {
        msg(`Could not load drawing: ${error.message}`);
      }
    };
  }

  function startMarkMode() {
    if (activeProjectId === LEGACY_ID) return msg('Open a custom project before marking locations');
    markMode = true;
    document.getElementById('markBannerV9')?.remove();
    const banner = document.createElement('div');
    banner.id = 'markBannerV9';
    banner.className = 'mark-banner';
    banner.innerHTML = '<strong>Tap each location on the drawing, then enter its number.</strong><button id="finishMarkV9">Finish</button>';
    document.body.appendChild(banner);
    document.getElementById('finishMarkV9').onclick = stopMarkMode;
    msg('Tap the drawing to add locations');
  }

  function stopMarkMode() {
    markMode = false;
    document.getElementById('markBannerV9')?.remove();
    msg('Drawing setup saved');
  }

  async function addHotspotFromTap(event) {
    if (!markMode || activeProjectId === LEGACY_ID) return;
    if (event.target.closest('.pin')) return;
    event.preventDefault();
    event.stopPropagation();

    const map = document.getElementById('map');
    const rect = map.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const raw = prompt('Enter the location or caisson number');
    if (raw == null) return;
    const caisson = Number(raw);
    if (!Number.isFinite(caisson)) return msg('Enter a number');

    const existing = HOTSPOTS.findIndex(h => Number(h.caisson) === caisson);
    const point = { caisson, x, y };
    if (existing >= 0) HOTSPOTS[existing] = point;
    else HOTSPOTS.push(point);
    HOTSPOTS.sort((a, b) => Number(a.caisson) - Number(b.caisson));

    const project = await getProject(activeProjectId);
    project.hotspots = JSON.parse(JSON.stringify(HOTSPOTS));
    project.updated = new Date().toISOString();
    await putProject(project);
    renderPins();
    msg(`Location ${caisson} added`);
  }

  function addProjectButtons() {
    const tools = document.querySelector('.tools');
    if (!tools) return;

    if (!document.getElementById('projectsBtnV9')) {
      const projects = document.createElement('button');
      projects.id = 'projectsBtnV9';
      projects.textContent = 'Projects / Drawings';
      projects.onclick = openProjectModal;
      tools.appendChild(projects);
    }

    if (activeProjectId !== LEGACY_ID && !document.getElementById('markBtnV9')) {
      const mark = document.createElement('button');
      mark.id = 'markBtnV9';
      mark.textContent = 'Mark Drawing';
      mark.onclick = startMarkMode;
      tools.appendChild(mark);
    }

    if (activeProjectId === LEGACY_ID) document.getElementById('markBtnV9')?.remove();
  }

  async function initialize() {
    await sleep(700);
    if (!Array.isArray(HOTSPOTS) || !HOTSPOTS.length) await sleep(900);

    legacyHotspots = JSON.parse(JSON.stringify(HOTSPOTS || []));
    legacyDrawing = document.querySelector('#map img')?.src;
    installProjectPersist();
    modalStyles();

    document.getElementById('map')?.addEventListener('click', addHotspotFromTap, true);

    if (activeProjectId !== LEGACY_ID) {
      try { await activateProject(activeProjectId); }
      catch (_) { activeProjectId = LEGACY_ID; localStorage.setItem(ACTIVE_KEY, LEGACY_ID); }
    } else {
      updateProjectBadge("O'Hare Current Project");
    }

    const observer = new MutationObserver(addProjectButtons);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    addProjectButtons();

    const version = document.querySelector('.title span');
    if (version) version.textContent = 'v9 Projects';
  }

  initialize().catch(error => msg(`Project setup failed: ${error.message}`));
})();

