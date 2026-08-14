/* FieldVerify Pro v10.14 - make every generated project PDF restorable.
   The core app already embeds backups in field-log and daily-report PDFs.
   This patch adds the same complete JSON attachment to the Full Project Office PDF.
*/
(() => {
  'use strict';
  const PATCH_VERSION = '10.14';

  if (typeof window.saveRestorablePdf !== 'function' || typeof window.buildProjectBackup !== 'function') {
    console.warn('PDF backup patch could not find the core PDF functions');
    return;
  }

  const originalSaveRestorablePdf = window.saveRestorablePdf;

  async function addBackupAttachment(file) {
    if (!(file instanceof Blob)) throw Error('Office PDF was not created');
    if (!window.PDFLib?.PDFDocument) throw Error('PDF engine did not load');

    const { payload } = await window.buildProjectBackup();
    payload.backupFormat = 'FieldVerify Restorable PDF Backup';
    payload.backupPatchVersion = PATCH_VERSION;
    payload.created = payload.created || new Date().toISOString();

    const pdf = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
    const backupBytes = new TextEncoder().encode(JSON.stringify(payload));
    await pdf.attach(backupBytes, 'FieldVerify-Pro-Backup.json', {
      mimeType: 'application/json',
      description: 'Complete FieldVerify Pro project backup with records, photos, NCR files, and drawing',
      creationDate: new Date(),
      modificationDate: new Date()
    });

    const bytes = await pdf.save();
    return new File([bytes], file.name, { type: 'application/pdf' });
  }

  window.saveRestorablePdf = async function restorableEveryPdf(reason, items, shareToOffice = false) {
    const result = await originalSaveRestorablePdf(reason, items, shareToOffice);

    // Field logs and daily reports are already restorable in the core app.
    if (!shareToOffice) return result;

    try {
      if (window.pendingOfficeFile) {
        window.pendingOfficeFile = await addBackupAttachment(window.pendingOfficeFile);
        const box = document.getElementById('shareReadyText');
        if (box) box.textContent = `${window.pendingOfficeFile.name} is ready and includes a complete restore backup. Tap Share PDF Now and choose Mail, Messages, Drive, or Files.`;
        if (typeof window.toast === 'function') window.toast('Office PDF ready - complete restore backup embedded');
      }
    } catch (err) {
      console.error('Could not embed office PDF backup', err);
      if (typeof window.toast === 'function') window.toast(`Office PDF backup warning: ${err.message}`);
    }

    return result;
  };

  console.info(`FieldVerify restorable PDF patch ${PATCH_VERSION} loaded`);
})();
