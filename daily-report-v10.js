(() => {
  'use strict';

  let reportBusy = false;
  let backupBusy = false;
  let jsPdfPromise = null;

  const $id = id => document.getElementById(id);

  function say(message) {
    try { toast(message); }
    catch (_) { alert(message); }
  }

  function localDateKey(value) {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function todayKeyV10() {
    return localDateKey(new Date());
  }

  function fmt(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  function safeFileName(value) {
    return String(value || 'Foundation-Inspector')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'Foundation-Inspector';
  }

  function projectName() {
    return (
      document.getElementById('projectNameBadge')?.textContent?.trim() ||
      'Foundation Inspector Project'
    );
  }

  function getInspector() {
    try {
      const meta = JSON.parse(localStorage.getItem('foundationLegacyProjectMetadata') || '{}');
      if (meta.inspector) return meta.inspector;
    } catch (_) {}
    return '—';
  }

  function loadJsPdf() {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfPromise) return jsPdfPromise;

    jsPdfPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
      s.onload = () => window.jspdf?.jsPDF
        ? resolve(window.jspdf.jsPDF)
        : reject(new Error('PDF library did not initialize'));
      s.onerror = () => reject(new Error('PDF library could not load'));
      document.head.appendChild(s);
    });

    return jsPdfPromise;
  }

  async function getStoreRows(storeName) {
    const db = await openDB();
    if (!db.objectStoreNames.contains(storeName)) return [];

    return new Promise((resolve, reject) => {
      const q = db.transaction(storeName).objectStore(storeName).getAll();
      q.onsuccess = () => resolve(q.result || []);
      q.onerror = () => reject(q.error);
    });
  }

  function blobToDataUrlV10(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  function dataUrlToBlobV10(dataUrl) {
    const [header, body] = dataUrl.split(',');
    const mime = (header.match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function shareFile(file, title, text) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title, text, files: [file] });
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') return true;
      }
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return true;
  }

  async function createReliableBackup() {
    if (backupBusy) return;
    backupBusy = true;

    const button = $id('backupBtn');
    const oldText = button?.textContent || 'Backup Project';

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Preparing Backup…';
      }

      const photos = [];
      for (const p of await getStoreRows('photos')) {
        photos.push({
          ...p,
          blob: undefined,
          data: await blobToDataUrlV10(p.blob)
        });
      }

      const ncrPdfs = [];
      for (const p of await getStoreRows('ncrPdfs')) {
        ncrPdfs.push({
          ...p,
          blob: undefined,
          data: await blobToDataUrlV10(p.blob)
        });
      }

      const payload = {
        app: 'Foundation Inspector Pro',
        version: 'v10 stable backup',
        created: new Date().toISOString(),
        projectName: projectName(),
        records: typeof records === 'object' && records ? records : {},
        ncrRows: Array.isArray(ncrRows) ? ncrRows : [],
        photos,
        ncrPdfs,
        localStorage: {
          foundationInspectorRecords:
            typeof records === 'object' && records ? records : {},
          foundationInspectorNcrData:
            Array.isArray(ncrRows) ? ncrRows : []
        }
      };

      const name = `${safeFileName(projectName())}-Backup-${todayKeyV10()}.json`;
      const file = new File(
        [JSON.stringify(payload)],
        name,
        { type: 'application/json' }
      );

      await shareFile(
        file,
        'Foundation Inspector Backup',
        'Complete project backup with records, photos, NCR information, and attached NCR PDFs.'
      );

      localStorage.setItem('foundationLastICloudBackup', new Date().toISOString());
      say(`Backup ready — ${Object.keys(payload.records).length} records and ${photos.length} photos`);
    } catch (error) {
      say(`Backup failed: ${error.message || error}`);
    } finally {
      backupBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  function recordHasTodayActivity(record, photosById) {
    const day = todayKeyV10();

    const recordTimes = [
      record.pickupTime,
      record.unloadTime,
      record.updated,
      record.pickupGPS?.time,
      record.unloadGPS?.time
    ];

    if (recordTimes.some(value => localDateKey(value) === day)) return true;

    return (record.photos || []).some(id => {
      const photo = photosById.get(String(id));
      return photo && localDateKey(photo.date) === day;
    });
  }

  function todayPhotos(record, photosById) {
    const day = todayKeyV10();
    return (record.photos || [])
      .map(id => photosById.get(String(id)))
      .filter(photo => photo && localDateKey(photo.date) === day);
  }

  async function imageToJpeg(blob, maxSide = 1400, quality = 0.72) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('A saved photo could not be opened'));
        i.src = url;
      });

      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      return {
        data: canvas.toDataURL('image/jpeg', quality),
        width: canvas.width,
        height: canvas.height
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function addHeader(pdf, title, subtitle) {
    pdf.setFillColor(8, 58, 115);
    pdf.rect(0, 0, 216, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(title, 10, 8);
    pdf.setFontSize(9);
    pdf.text(subtitle, 10, 15);
    pdf.setTextColor(20, 28, 36);
  }

  function addFooter(pdf, page) {
    pdf.setDrawColor(205, 212, 220);
    pdf.line(10, 270, 206, 270);
    pdf.setTextColor(100, 108, 116);
    pdf.setFontSize(8);
    pdf.text(`Foundation Inspector Pro — Page ${page}`, 108, 276, { align: 'center' });
    pdf.setTextColor(20, 28, 36);
  }

  function wrapped(pdf, text, x, y, width, lineHeight = 5) {
    const lines = pdf.splitTextToSize(String(text || '—'), width);
    pdf.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  async function createTodayPdf() {
    if (reportBusy) return;
    reportBusy = true;

    const button =
      $id('todayFullPdfBtnV10') ||
      $id('dailyReportBtn') ||
      $id('shareLogBtn');

    const oldText = button?.textContent || 'Create Today’s Full PDF';

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Collecting Today’s Work…';
      }

      const allPhotos = await getStoreRows('photos');
      const photosById = new Map(
        allPhotos.map(photo => [String(photo.id), photo])
      );

      const allRecords =
        typeof records === 'object' && records
          ? records
          : JSON.parse(localStorage.getItem('foundationInspectorRecords') || '{}');

      const items = Object.entries(allRecords)
        .filter(([, record]) => recordHasTodayActivity(record || {}, photosById))
        .sort((a, b) => Number(a[0]) - Number(b[0]));

      if (!items.length) {
        say('No work was recorded today.');
        return;
      }

      const jsPDF = await loadJsPdf();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true
      });

      const title = projectName();
      const dateText = new Date().toLocaleDateString();
      const inspector = getInspector();
      const photoCount = items.reduce(
        (sum, [, record]) => sum + todayPhotos(record, photosById).length,
        0
      );

      let page = 1;

      pdf.setFillColor(8, 58, 115);
      pdf.rect(0, 0, 216, 279, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(25);
      pdf.text('Daily Foundation', 108, 72, { align: 'center' });
      pdf.text('Inspection Report', 108, 85, { align: 'center' });

      pdf.setFontSize(16);
      pdf.text(title, 108, 107, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text(`Report date: ${dateText}`, 108, 124, { align: 'center' });
      pdf.text(`Inspector: ${inspector}`, 108, 134, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text(String(items.length), 70, 174, { align: 'center' });
      pdf.text(String(photoCount), 146, 174, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text('Caissons with activity', 70, 183, { align: 'center' });
      pdf.text('Photos taken today', 146, 183, { align: 'center' });

      for (const [number, record] of items) {
        const photos = todayPhotos(record, photosById);
        const lat =
          record.unloadGPS?.lat ??
          record.pickupGPS?.lat ??
          record.lat;
        const lon =
          record.unloadGPS?.lon ??
          record.pickupGPS?.lon ??
          record.lon;
        const accuracy =
          record.unloadGPS?.accuracy ??
          record.pickupGPS?.accuracy;

        pdf.addPage();
        page++;
        addHeader(pdf, title, `Caisson ${number} — ${dateText}`);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text(`Caisson ${number}`, 10, 32);

        pdf.setFontSize(11);
        pdf.setTextColor(22, 100, 48);
        pdf.text(record.status || 'No information', 10, 40);
        pdf.setTextColor(20, 28, 36);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Pickup: ${fmt(record.pickupTime)}`, 10, 53);
        pdf.text(`Unload: ${fmt(record.unloadTime)}`, 10, 61);
        pdf.text(`Latitude: ${Number.isFinite(Number(lat)) ? Number(lat).toFixed(7) : '—'}`, 10, 69);
        pdf.text(`Longitude: ${Number.isFinite(Number(lon)) ? Number(lon).toFixed(7) : '—'}`, 10, 77);
        pdf.text(
          `GPS accuracy: ${
            Number.isFinite(Number(accuracy))
              ? `±${Math.round(Number(accuracy) * 3.28084)} ft`
              : '—'
          }`,
          10,
          85
        );
        pdf.text(`Photos today: ${photos.length}`, 10, 93);

        pdf.setFont('helvetica', 'bold');
        pdf.text('Inspection status', 10, 108);
        pdf.setFont('helvetica', 'normal');
        pdf.text(record.inspection?.overall || 'Not set', 10, 115);

        pdf.setFont('helvetica', 'bold');
        pdf.text('Field notes', 10, 130);
        pdf.setFont('helvetica', 'normal');
        wrapped(pdf, record.notes || 'No notes entered.', 10, 138, 196, 5);

        const ncrLabel =
          typeof ncrStateLabel === 'function'
            ? ncrStateLabel(Number(number))
            : 'Not available';
        pdf.setFont('helvetica', 'bold');
        pdf.text('NCR status', 10, 180);
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(ncrLabel), 10, 187);

        addFooter(pdf, page);

        for (let i = 0; i < photos.length; i++) {
          if (button) {
            button.textContent =
              `Adding Photo ${i + 1} of ${photos.length} — Caisson ${number}`;
          }

          let image;
          try {
            image = await imageToJpeg(photos[i].blob);
          } catch (_) {
            continue;
          }

          pdf.addPage();
          page++;
          addHeader(
            pdf,
            title,
            `Caisson ${number} — Photo ${i + 1} of ${photos.length}`
          );

          const maxW = 196;
          const maxH = 190;
          const ratio = image.width / image.height;
          let w = maxW;
          let h = w / ratio;

          if (h > maxH) {
            h = maxH;
            w = h * ratio;
          }

          const x = (216 - w) / 2;
          const y = 27;

          pdf.addImage(image.data, 'JPEG', x, y, w, h, undefined, 'FAST');

          let captionY = y + h + 8;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text(`Caisson ${number}`, 10, captionY);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          captionY += 6;
          pdf.text(`Photo taken: ${fmt(photos[i].date)}`, 10, captionY);
          captionY += 5;
          pdf.text(
            `Latitude: ${Number.isFinite(Number(lat)) ? Number(lat).toFixed(7) : '—'}    ` +
            `Longitude: ${Number.isFinite(Number(lon)) ? Number(lon).toFixed(7) : '—'}`,
            10,
            captionY
          );
          captionY += 5;
          pdf.text(
            `Status: ${record.status || 'No information'}    GPS accuracy: ${
              Number.isFinite(Number(accuracy))
                ? `±${Math.round(Number(accuracy) * 3.28084)} ft`
                : '—'
            }`,
            10,
            captionY
          );

          captionY += 7;
          pdf.setFont('helvetica', 'bold');
          pdf.text('Notes:', 10, captionY);
          pdf.setFont('helvetica', 'normal');
          wrapped(pdf, record.notes || 'No notes entered.', 25, captionY, 181, 4.5);

          addFooter(pdf, page);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      if (button) button.textContent = 'Preparing Share File…';

      const blob = pdf.output('blob');
      const name =
        `${safeFileName(title)}-Daily-Report-${todayKeyV10()}.pdf`;
      const file = new File([blob], name, { type: 'application/pdf' });

      await shareFile(
        file,
        'Today’s Foundation Inspection Report',
        'Daily report with caisson numbers, photos, notes, timestamps, GPS coordinates, and inspection information.'
      );

      say(`Daily PDF ready — ${items.length} caissons and ${photoCount} photos`);
    } catch (error) {
      say(`Daily PDF failed: ${error.message || error}`);
    } finally {
      reportBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  function addTodayButton() {
    const tools = document.querySelector('.tools');
    if (!tools || $id('todayFullPdfBtnV10')) return;

    const button = document.createElement('button');
    button.id = 'todayFullPdfBtnV10';
    button.textContent = 'MAKE TODAY’S FULL PDF';
    button.className = 'share-log';
    button.style.background = '#083a73';
    button.onclick = createTodayPdf;
    tools.prepend(button);
  }

  // Intercept the existing buttons before old handlers can run.
  document.addEventListener('click', event => {
    const backup = event.target.closest('#backupBtn');
    if (backup) {
      event.preventDefault();
      event.stopImmediatePropagation();
      createReliableBackup();
      return;
    }

    const today =
      event.target.closest('#todayFullPdfBtnV10') ||
      event.target.closest('#dailyReportBtn');

    if (today) {
      event.preventDefault();
      event.stopImmediatePropagation();
      createTodayPdf();
    }
  }, true);

  const observer = new MutationObserver(addTodayButton);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  addTodayButton();

  window.FoundationInspectorV10 = {
    createReliableBackup,
    createTodayPdf,
    dataUrlToBlobV10
  };
})();
