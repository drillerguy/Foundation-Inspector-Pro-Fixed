(() => {
  'use strict';

  const PINNED_FEATURES =
    'https://cdn.jsdelivr.net/gh/drillerguy/Foundation-Inspector-Pro-Fixed@118dac628f16de75892d773387186671d8658e94/team-v3.js';

  const script = document.createElement('script');
  script.src = PINNED_FEATURES;
  script.onload = installLiveGpsV10;
  script.onerror = () => {
    alert('The saved Foundation Inspector features could not load. Check the internet connection and reload.');
  };
  document.head.appendChild(script);

  function installLiveGpsV10() {
    const GPS_STALE_MS = 7000;
    const GPS_REJECT_AGE_MS = 15000;
    const POLL_MS = 2000;
    const OPTIONS = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };

    let pollTimer = null;
    let ageTimer = null;
    let updateCount = 0;
    let rejectedCount = 0;
    let lastAcceptedAt = 0;
    let lastCoordinateTime = 0;
    let lastSource = '—';
    let lastErrorText = 'None';
    let gpsRunning = false;

    function message(text) {
      try { toast(text); } catch (_) { alert(text); }
    }

    function feet(meters) {
      return Number.isFinite(meters) ? Math.round(meters * 3.28084) : null;
    }

    function ageSeconds() {
      return lastAcceptedAt ? Math.max(0, (Date.now() - lastAcceptedAt) / 1000) : null;
    }

    function ensureStyles() {
      if (document.getElementById('gpsV10Styles')) return;
      const style = document.createElement('style');
      style.id = 'gpsV10Styles';
      style.textContent = `
        .gps-v10-modal{position:fixed;inset:0;z-index:600;background:#000a;padding:calc(18px + env(safe-area-inset-top)) 12px 20px;overflow:auto}
        .gps-v10-box{max-width:560px;margin:auto;background:#fff;color:#15202b;border-radius:17px;padding:15px}
        .gps-v10-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
        .gps-v10-head h2{margin:0}.gps-v10-close{padding:9px 12px;background:#e7edf4}
        .gps-v10-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
        .gps-v10-item{border:1px solid #d7dee7;border-radius:11px;padding:10px;background:#f7f9fb}
        .gps-v10-item b{display:block;font-size:12px;color:#65717c;margin-bottom:3px}
        .gps-v10-item span{font-size:16px;font-weight:800;overflow-wrap:anywhere}
        .gps-v10-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
        .gps-v10-actions button{padding:12px;background:#083a73;color:#fff}
        .gps-v10-live{color:#16733a}.gps-v10-stale{color:#b42318}
        @media(max-width:520px){.gps-v10-grid{grid-template-columns:1fr}.gps-v10-actions{grid-template-columns:1fr}}
      `;
      document.head.appendChild(style);
    }

    function nearestLive(lat, lon) {
      let best = null;
      for (const h of HOTSPOTS || []) {
        const r = rec(h.caisson);
        if (r.unloadTime) continue;
        if (num(r.lat) == null || num(r.lon) == null) continue;
        const distance = haversine(lat, lon, Number(r.lat), Number(r.lon));
        if (!best || distance < best.distance) {
          best = { n: h.caisson, distance };
        }
      }
      return best;
    }

    function updateBadges() {
      const age = ageSeconds();
      const gpsStatus = document.getElementById('gpsStatus');
      const accuracyStatus = document.getElementById('accuracyStatus');

      if (!gpsRunning) {
        if (gpsStatus) gpsStatus.textContent = 'GPS off';
        return;
      }

      if (!lastPosition || age == null) {
        if (gpsStatus) gpsStatus.textContent = 'GPS searching…';
        return;
      }

      if (age > GPS_STALE_MS / 1000) {
        if (gpsStatus) gpsStatus.textContent = `GPS stale ${age.toFixed(0)}s`;
        if (accuracyStatus) accuracyStatus.textContent = 'Move dot hidden';
        const layer = document.getElementById('gpsLayer');
        if (layer) layer.innerHTML = '';
      } else {
        if (gpsStatus) gpsStatus.textContent = `GPS live ${age.toFixed(1)}s`;
        const accuracy = feet(lastPosition.coords.accuracy);
        if (accuracyStatus) accuracyStatus.textContent =
          accuracy == null ? 'Accuracy —' : `Accuracy ±${accuracy} ft`;
      }

      refreshDiagnostic();
    }

    function acceptPosition(position, source) {
      if (!position || !position.coords) return;

      const now = Date.now();
      const timestamp = Number(position.timestamp) || now;
      const coordinateAge = now - timestamp;

      if (coordinateAge > GPS_REJECT_AGE_MS) {
        rejectedCount++;
        lastErrorText = `Rejected cached fix (${Math.round(coordinateAge / 1000)}s old)`;
        updateBadges();
        return;
      }

      if (timestamp < lastCoordinateTime - 500) {
        rejectedCount++;
        lastErrorText = 'Rejected out-of-order GPS fix';
        updateBadges();
        return;
      }

      lastCoordinateTime = Math.max(lastCoordinateTime, timestamp);
      lastAcceptedAt = now;
      lastGoodAt = now;
      lastPosition = position;
      lastSource = source;
      lastErrorText = 'None';
      updateCount++;

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const best = nearestLive(lat, lon);
      nearest = best?.n ?? null;

      if (selected == null || rec(selected).unloadTime) {
        selected = nearest;
      }

      renderPins();
      drawBlueDot();
      showTarget();

      if (autoCenter) centerOnGPS();
      updateBadges();
    }

    function gpsErrorV10(error) {
      lastErrorText =
        error?.code === 1 ? 'Location permission denied' :
        error?.code === 2 ? 'Position unavailable' :
        error?.code === 3 ? 'GPS request timed out' :
        error?.message || 'Unknown GPS error';

      const status = document.getElementById('gpsStatus');
      if (status) status.textContent = lastErrorText;
      refreshDiagnostic();

      if (error?.code === 1) {
        message('Allow Precise Location for Safari in iPhone Settings');
      }
    }

    function pollFreshPosition() {
      if (!gpsRunning) return;
      navigator.geolocation.getCurrentPosition(
        position => acceptPosition(position, 'fresh poll'),
        gpsErrorV10,
        OPTIONS
      );
    }

    function stopLiveGps() {
      gpsRunning = false;

      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      clearInterval(pollTimer);
      clearInterval(ageTimer);
      pollTimer = null;
      ageTimer = null;

      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }

      const locate = document.getElementById('locate');
      if (locate) {
        locate.textContent = 'Start GPS';
        locate.onclick = startLiveGps;
      }

      updateBadges();
    }

    function startLiveGps() {
      stopLiveGps();

      if (!navigator.geolocation) {
        message('This browser does not provide GPS location');
        return;
      }

      gpsRunning = true;
      lastAcceptedAt = 0;
      lastCoordinateTime = 0;
      lastErrorText = 'None';

      const status = document.getElementById('gpsStatus');
      if (status) status.textContent = 'GPS searching…';

      const locate = document.getElementById('locate');
      if (locate) {
        locate.textContent = 'Stop GPS';
        locate.onclick = stopLiveGps;
      }

      watchId = navigator.geolocation.watchPosition(
        position => acceptPosition(position, 'watch'),
        gpsErrorV10,
        OPTIONS
      );

      pollFreshPosition();
      pollTimer = setInterval(pollFreshPosition, POLL_MS);
      ageTimer = setInterval(updateBadges, 500);
    }

    function chooseNearestNow() {
      if (!lastPosition || ageSeconds() == null || ageSeconds() > GPS_STALE_MS / 1000) {
        selected = null;
        showTarget();
        message('No fresh GPS fix. Tap Start GPS and wait for GPS live.');
        return;
      }

      const best = nearestLive(
        lastPosition.coords.latitude,
        lastPosition.coords.longitude
      );

      nearest = best?.n ?? null;
      selected = nearest;
      renderPins();
      showTarget();

      if (selected != null) {
        scrollToSpot(selected);
        message(`Nearest unfinished caisson: ${selected}`);
      } else {
        message('No unfinished GPS-saved caisson found');
      }
    }

    function diagnosticsHtml() {
      const p = lastPosition;
      const age = ageSeconds();
      const stale = age == null || age > GPS_STALE_MS / 1000;
      const nearestDistance = p && nearest != null ? distanceTo(nearest) : null;

      return `
        <div class="gps-v10-grid">
          <div class="gps-v10-item"><b>Status</b><span class="${stale ? 'gps-v10-stale' : 'gps-v10-live'}">${gpsRunning ? (stale ? 'STALE / SEARCHING' : 'LIVE') : 'OFF'}</span></div>
          <div class="gps-v10-item"><b>Last update age</b><span>${age == null ? '—' : `${age.toFixed(1)} seconds`}</span></div>
          <div class="gps-v10-item"><b>Latitude</b><span>${p ? p.coords.latitude.toFixed(7) : '—'}</span></div>
          <div class="gps-v10-item"><b>Longitude</b><span>${p ? p.coords.longitude.toFixed(7) : '—'}</span></div>
          <div class="gps-v10-item"><b>Accuracy</b><span>${p && feet(p.coords.accuracy) != null ? `±${feet(p.coords.accuracy)} ft` : '—'}</span></div>
          <div class="gps-v10-item"><b>Speed</b><span>${p && Number.isFinite(p.coords.speed) ? `${(p.coords.speed * 2.23694).toFixed(1)} mph` : '—'}</span></div>
          <div class="gps-v10-item"><b>Heading</b><span>${p && Number.isFinite(p.coords.heading) ? `${Math.round(p.coords.heading)}°` : '—'}</span></div>
          <div class="gps-v10-item"><b>Update source</b><span>${lastSource}</span></div>
          <div class="gps-v10-item"><b>Accepted updates</b><span>${updateCount}</span></div>
          <div class="gps-v10-item"><b>Rejected stale updates</b><span>${rejectedCount}</span></div>
          <div class="gps-v10-item"><b>Nearest unfinished</b><span>${nearest ?? '—'}</span></div>
          <div class="gps-v10-item"><b>Nearest distance</b><span>${nearestDistance == null ? '—' : `${nearestDistance} ft`}</span></div>
          <div class="gps-v10-item" style="grid-column:1/-1"><b>Last GPS error</b><span>${lastErrorText}</span></div>
        </div>`;
    }

    function refreshDiagnostic() {
      const body = document.getElementById('gpsV10DiagnosticBody');
      if (body) body.innerHTML = diagnosticsHtml();
    }

    function openDiagnostics() {
      ensureStyles();
      document.getElementById('gpsV10Modal')?.remove();

      const modal = document.createElement('div');
      modal.id = 'gpsV10Modal';
      modal.className = 'gps-v10-modal';
      modal.innerHTML = `
        <div class="gps-v10-box">
          <div class="gps-v10-head">
            <h2>Live GPS Diagnostics</h2>
            <button class="gps-v10-close" id="gpsV10Close">Close</button>
          </div>
          <div id="gpsV10DiagnosticBody">${diagnosticsHtml()}</div>
          <div class="gps-v10-actions">
            <button id="gpsV10Restart">Restart Fresh GPS</button>
            <button id="gpsV10Nearest">Select Nearest Caisson</button>
          </div>
        </div>`;

      document.body.appendChild(modal);
      document.getElementById('gpsV10Close').onclick = () => modal.remove();
      document.getElementById('gpsV10Restart').onclick = startLiveGps;
      document.getElementById('gpsV10Nearest').onclick = chooseNearestNow;
    }

    function addGpsTools() {
      const tools = document.querySelector('.tools');
      if (!tools) return;

      if (!document.getElementById('gpsDiagnosticBtnV10')) {
        const button = document.createElement('button');
        button.id = 'gpsDiagnosticBtnV10';
        button.textContent = 'GPS Diagnostics';
        button.onclick = openDiagnostics;
        tools.appendChild(button);
      }

      if (!document.getElementById('nearestNowBtnV10')) {
        const button = document.createElement('button');
        button.id = 'nearestNowBtnV10';
        button.textContent = 'Nearest Caisson Now';
        button.onclick = chooseNearestNow;
        tools.appendChild(button);
      }

      const gpsButton = document.getElementById('gpsBtn');
      if (gpsButton) {
        gpsButton.textContent = 'Restart Fresh GPS';
        gpsButton.onclick = startLiveGps;
      }

      const locate = document.getElementById('locate');
      if (locate && !gpsRunning) locate.onclick = startLiveGps;

      const version = document.querySelector('.title span');
      if (version) version.textContent = 'v10 GPS LIVE';
    }

    // Replace the original functions used throughout the app.
    startGPS = startLiveGps;
    stopGPS = stopLiveGps;
    updateGPS = position => acceptPosition(position, 'app update');
    geoError = gpsErrorV10;
    chooseNext = chooseNearestNow;

    ensureStyles();

    const observer = new MutationObserver(addGpsTools);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    addGpsTools();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && gpsRunning) {
        startLiveGps();
      }
    });

    window.addEventListener('pageshow', event => {
      if (event.persisted && gpsRunning) startLiveGps();
    });

    updateBadges();
  }
})();
