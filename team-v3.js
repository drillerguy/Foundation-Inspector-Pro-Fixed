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
