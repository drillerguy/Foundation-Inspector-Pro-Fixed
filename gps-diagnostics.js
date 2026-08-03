(() => {
  'use strict';

  const LOG_KEY = 'foundationGpsDiagnosticLog';
  const MAX_LOG = 500;
  let drawCount = 0;
  let lastDrawAt = 0;

  const safe = (fn, fallback = null) => {
    try { return fn(); } catch (_) { return fallback; }
  };

  const feet = meters =>
    Number.isFinite(meters) ? Math.round(meters * 3.28084) : null;

  function controlPoints() {
    return safe(() => (HOTSPOTS || []).map(h => {
      const r = rec(h.caisson);
      return Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon))
        ? { n: h.caisson, lat: Number(r.lat), lon: Number(r.lon), x: h.x, y: h.y }
        : null;
    }).filter(Boolean), []);
  }

  function statusData() {
    const p = safe(() => lastPosition, null);
    const cp = controlPoints();
    const tf = safe(() => transform, null);
    const age = p
      ? Math.max(0, (Date.now() - (Number(p.timestamp) || Date.now())) / 1000)
      : null;
    const projected = p && tf
      ? safe(() => project(p.coords.latitude, p.coords.longitude), null)
      : null;
    const drawing = document.querySelector('#map img');

    return {
      gps: p ? (age <= 10 ? 'LIVE' : 'STALE') : 'NO FIX',
      age,
      lat: p?.coords?.latitude,
      lon: p?.coords?.longitude,
      accuracy: feet(p?.coords?.accuracy),
      speed: Number.isFinite(p?.coords?.speed)
        ? (p.coords.speed * 2.23694).toFixed(1)
        : null,
      heading: Number.isFinite(p?.coords?.heading)
        ? Math.round(p.coords.heading)
        : null,
      cp: cp.length,
      tf: Boolean(tf),
      projected,
      drawingLoaded: Boolean(drawing?.complete && drawing.naturalWidth > 0),
      drawCount,
      lastDrawAt,
      selected: safe(() => selected, null),
      nearest: safe(() => nearest, null)
    };
  }

  function logEvent(type, extra = {}) {
    const d = statusData();
    const item = {
      time: new Date().toISOString(),
      type,
      gpsStatus: d.gps,
      lat: d.lat ?? null,
      lon: d.lon ?? null,
      accuracyFt: d.accuracy,
      selected: d.selected,
      nearest: d.nearest,
      controlPoints: d.cp,
      transformValid: d.tf,
      drawCount,
      ...extra
    };

    const log = safe(
      () => JSON.parse(localStorage.getItem(LOG_KEY) || '[]'),
      []
    );
    log.push(item);
    while (log.length > MAX_LOG) log.shift();
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
    refresh();
  }

  function ensureStyles() {
    if (document.getElementById('gpsDiagnosticStylesV11')) return;

    const style = document.createElement('style');
    style.id = 'gpsDiagnosticStylesV11';
    style.textContent = `
      .gpsd-modal{position:fixed;inset:0;z-index:1000;background:#000b;padding:calc(14px + env(safe-area-inset-top)) 10px 20px;overflow:auto}
      .gpsd-box{max-width:650px;margin:auto;background:#fff;color:#15202b;border-radius:18px;padding:14px}
      .gpsd-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .gpsd-head h2{margin:0}
      .gpsd-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
      .gpsd-cell{background:#f6f8fa;border:1px solid #d7dee7;border-radius:11px;padding:9px}
      .gpsd-cell b{display:block;font-size:11px;color:#63707c}
      .gpsd-cell span{font-size:15px;font-weight:900;overflow-wrap:anywhere}
      .gpsd-good{color:#137333}
      .gpsd-bad{color:#b42318}
      .gpsd-warn{color:#9a6700}
      .gpsd-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
      .gpsd-actions button,.gpsd-close{padding:11px;background:#083a73;color:#fff;border-radius:10px;font-weight:900;border:0}
      .gpsd-status{position:fixed;right:8px;bottom:8px;z-index:900;background:#fff;border:1px solid #ccd4dd;border-radius:10px;padding:7px 9px;box-shadow:0 2px 12px #0004;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      @media(max-width:520px){
        .gpsd-grid,.gpsd-actions{grid-template-columns:1fr}
        .gpsd-status{bottom:44vh}
      }
    `;
    document.head.appendChild(style);
  }

  function panelHtml() {
    const d = statusData();
    const gpsClass =
      d.gps === 'LIVE' ? 'gpsd-good' :
      d.gps === 'STALE' ? 'gpsd-warn' : 'gpsd-bad';

    return `
      <div class="gpsd-grid">
        <div class="gpsd-cell"><b>GPS Status</b><span class="${gpsClass}">${d.gps}</span></div>
        <div class="gpsd-cell"><b>Fix age</b><span>${d.age == null ? '—' : d.age.toFixed(1) + ' sec'}</span></div>
        <div class="gpsd-cell"><b>Latitude</b><span>${d.lat == null ? '—' : d.lat.toFixed(7)}</span></div>
        <div class="gpsd-cell"><b>Longitude</b><span>${d.lon == null ? '—' : d.lon.toFixed(7)}</span></div>
        <div class="gpsd-cell"><b>Accuracy</b><span>${d.accuracy == null ? '—' : '±' + d.accuracy + ' ft'}</span></div>
        <div class="gpsd-cell"><b>Speed / Heading</b><span>${d.speed == null ? '—' : d.speed + ' mph'} / ${d.heading == null ? '—' : d.heading + '°'}</span></div>
        <div class="gpsd-cell"><b>Control Points</b><span class="${d.cp >= 3 ? 'gpsd-good' : 'gpsd-bad'}">${d.cp} loaded</span></div>
        <div class="gpsd-cell"><b>Transform</b><span class="${d.tf ? 'gpsd-good' : 'gpsd-bad'}">${d.tf ? 'VALID' : 'NOT READY'}</span></div>
        <div class="gpsd-cell"><b>Drawing</b><span class="${d.drawingLoaded ? 'gpsd-good' : 'gpsd-bad'}">${d.drawingLoaded ? 'CONNECTED' : 'NOT LOADED'}</span></div>
        <div class="gpsd-cell"><b>Projected map point</b><span>${d.projected ? d.projected.x.toFixed(3) + '%, ' + d.projected.y.toFixed(3) + '%' : '—'}</span></div>
        <div class="gpsd-cell"><b>Blue-dot redraws</b><span>${d.drawCount}</span></div>
        <div class="gpsd-cell"><b>Last redraw</b><span>${d.lastDrawAt ? new Date(d.lastDrawAt).toLocaleTimeString() : '—'}</span></div>
        <div class="gpsd-cell"><b>Selected caisson</b><span>${d.selected ?? '—'}</span></div>
        <div class="gpsd-cell"><b>Nearest caisson</b><span>${d.nearest ?? '—'}</span></div>
      </div>
    `;
  }

  function refreshBadge() {
    let badge = document.getElementById('gpsDiagnosticBadgeV11');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'gpsDiagnosticBadgeV11';
      badge.className = 'gpsd-status';
      document.body.appendChild(badge);
    }

    const d = statusData();
    badge.textContent =
      `GPS ${d.gps} · CP ${d.cp} · Transform ${d.tf ? 'OK' : 'NO'} · Draw ${d.drawCount}`;
  }

  function refresh() {
    const body = document.getElementById('gpsDiagnosticBodyV11');
    if (body) body.innerHTML = panelHtml();
    refreshBadge();
  }

  function exportLog() {
    const data = localStorage.getItem(LOG_KEY) || '[]';
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download =
      `Foundation-GPS-Log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  }

  function openPanel() {
    ensureStyles();
    document.getElementById('gpsDiagnosticModalV11')?.remove();

    const modal = document.createElement('div');
    modal.id = 'gpsDiagnosticModalV11';
    modal.className = 'gpsd-modal';
    modal.innerHTML = `
      <div class="gpsd-box">
        <div class="gpsd-head">
          <h2>GPS System Diagnostics</h2>
          <button class="gpsd-close" id="gpsdClose">Close</button>
        </div>
        <div id="gpsDiagnosticBodyV11">${panelHtml()}</div>
        <div class="gpsd-actions">
          <button id="gpsdRestart">Restart Fresh GPS</button>
          <button id="gpsdNearest">Select Nearest</button>
          <button id="gpsdExport">Export GPS Log</button>
          <button id="gpsdClear">Clear GPS Log</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('gpsdClose').onclick = () => modal.remove();
    document.getElementById('gpsdRestart').onclick =
      () => safe(() => startGPS());
    document.getElementById('gpsdNearest').onclick =
      () => safe(() => chooseNext());
    document.getElementById('gpsdExport').onclick = exportLog;
    document.getElementById('gpsdClear').onclick = () => {
      localStorage.removeItem(LOG_KEY);
      logEvent('log-cleared');
    };
  }

  function installButton() {
    const tools = document.querySelector('.tools');
    if (!tools || document.getElementById('gpsSystemDiagnosticsBtn')) return;

    const button = document.createElement('button');
    button.id = 'gpsSystemDiagnosticsBtn';
    button.textContent = 'GPS System Diagnostics';
    button.onclick = openPanel;
    tools.appendChild(button);
  }

  function hookFunctions() {
    if (typeof drawBlueDot === 'function' && !drawBlueDot.__gpsd) {
      const originalDraw = drawBlueDot;
      drawBlueDot = function (...args) {
        const result = originalDraw.apply(this, args);
        drawCount += 1;
        lastDrawAt = Date.now();
        logEvent('blue-dot-redraw');
        return result;
      };
      drawBlueDot.__gpsd = true;
    }

    if (typeof updateGPS === 'function' && !updateGPS.__gpsd) {
      const originalUpdate = updateGPS;
      updateGPS = function (position, ...rest) {
        logEvent('gps-update-received', {
          timestamp: position?.timestamp ?? null
        });
        return originalUpdate.call(this, position, ...rest);
      };
      updateGPS.__gpsd = true;
    }
  }

  ensureStyles();

  const observer = new MutationObserver(() => {
    installButton();
    hookFunctions();
    refresh();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  setInterval(() => {
    installButton();
    hookFunctions();
    refresh();
  }, 1000);

  window.addEventListener('error', event => {
    logEvent('javascript-error', {
      message: event.message,
      source: event.filename,
      line: event.lineno
    });
  });

  logEvent('diagnostics-loaded');
})();