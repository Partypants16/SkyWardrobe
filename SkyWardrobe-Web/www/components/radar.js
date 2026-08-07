/**
 * RadarComponent — interactive Leaflet map with RainViewer animated precipitation overlay.
 * Lazy-initialised via IntersectionObserver.
 * No API key required.
 */
window.RadarComponent = (function () {
  // ── State ────────────────────────────────────────────────────────────────────
  let _map          = null;
  let _marker       = null;
  let _layers       = [];
  let _frames       = [];
  let _currentIdx   = 0;
  let _playing      = true;
  let _timer        = null;
  let _initialized  = false;
  let _host         = "";
  let _lat          = -37.814;
  let _lon          = 144.963;

  const FRAME_MS    = 600;
  const TILE_SIZE   = 256;
  const COLOR_SCHEME = 2; // Universal Blue
  const OPTIONS     = "1_1";   // smooth=1, snow=1

  // ── RainViewer helpers ───────────────────────────────────────────────────────
  function tileUrl(frame) {
    return `${_host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`;
  }

  async function fetchFrames() {
    const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!resp.ok) throw new Error(`RainViewer API returned ${resp.status}`);
    const data = await resp.json();
    _host = data.host || "https://tilecache.rainviewer.com";

    const past    = (data.radar?.past     || []).map((f) => ({ ...f, type: "past" }));
    const nowcast = (data.radar?.nowcast  || []).map((f) => ({ ...f, type: "nowcast" }));
    return [...past, ...nowcast];
  }

  // ── Layer helpers ────────────────────────────────────────────────────────────
  function showFrame(idx) {
    if (_layers.length === 0) return;
    const clamped = Math.max(0, Math.min(idx, _layers.length - 1));
    _layers.forEach((layer, i) => layer.setOpacity(i === clamped ? 0.65 : 0));
    _currentIdx = clamped;
    updateTimeline();
    updateTimestampLabel();
  }

  function nextFrame() {
    showFrame((_currentIdx + 1) % _layers.length);
  }

  function startAnim() {
    if (_timer) clearInterval(_timer);
    _playing = true;
    _timer   = setInterval(nextFrame, FRAME_MS);
    updatePlayBtn();
  }

  function stopAnim() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    _playing = false;
    updatePlayBtn();
  }

  // ── UI Updates ───────────────────────────────────────────────────────────────
  function updatePlayBtn() {
    const btn = document.getElementById("radar-play-pause");
    if (btn) btn.textContent = _playing ? "⏸ Pause" : "▶ Play";
  }

  function updateTimeline() {
    const progress = document.getElementById("radar-timeline-progress");
    const handle   = document.getElementById("radar-timeline-handle");
    if (!progress || !handle || _frames.length === 0) return;
    const pct = (_currentIdx / (_frames.length - 1)) * 100;
    progress.style.width  = `${pct}%`;
    handle.style.left     = `${pct}%`;
  }

  function updateTimestampLabel() {
    const el = document.getElementById("radar-current-time");
    if (!el || _frames.length === 0) return;
    const frame = _frames[_currentIdx];
    if (!frame) return;
    const d   = new Date(frame.time * 1000);
    const str = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const tag = frame.type === "nowcast" ? " (forecast)" : "";
    el.textContent = `${str}${tag}`;
  }

  function renderTimelineLabels() {
    const el = document.getElementById("radar-time-labels-inner");
    if (!el || _frames.length === 0) return;

    const nowIdx = _frames.findLastIndex((f) => f.type === "past");
    const pct    = nowIdx >= 0 ? (nowIdx / (_frames.length - 1)) * 100 : 50;
    el.innerHTML = `
      <span class="radar-tl-label">Past</span>
      <span class="radar-tl-now" style="left:${pct}%">Now</span>
      <span class="radar-tl-label radar-tl-label--right">Forecast</span>`;
  }

  function showRadarError() {
    const err = document.getElementById("radar-error");
    const ctl = document.getElementById("radar-controls");
    if (err) err.hidden = false;
    if (ctl) ctl.hidden = true;
  }

  // ── Init / Load ──────────────────────────────────────────────────────────────
  async function loadRadar() {
    const loadEl = document.getElementById("radar-loading");
    if (loadEl) loadEl.hidden = false;

    try {
      _frames = await fetchFrames();

      if (_frames.length === 0) throw new Error("No radar frames available");

      // Build tile layers (all hidden initially)
      _layers = _frames.map((frame) => {
        return L.tileLayer(tileUrl(frame), {
          opacity:     0,
          tileSize:    TILE_SIZE,
          maxZoom:     19,
          zIndex:      10,
          attribution: 'Rain data © <a href="https://rainviewer.com" target="_blank" rel="noopener">RainViewer</a>'
        });
      });
      _layers.forEach((layer) => layer.addTo(_map));

      // Default to last past frame
      const lastPastIdx = _frames.findLastIndex((f) => f.type === "past");
      _currentIdx = lastPastIdx >= 0 ? lastPastIdx : 0;

      renderTimelineLabels();

      // Wire up the timeline scrubber click
      const track = document.getElementById("radar-timeline-track");
      if (track) {
        track.addEventListener("click", (e) => {
          const rect = track.getBoundingClientRect();
          const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const idx  = Math.round(pct * (_frames.length - 1));
          showFrame(idx);
        });
      }

      showFrame(_currentIdx);
      startAnim();

      if (loadEl) loadEl.hidden = true;

      // Show controls
      const ctl = document.getElementById("radar-controls");
      if (ctl) ctl.hidden = false;

    } catch (err) {
      console.error("Radar load failed:", err);
      if (loadEl) loadEl.hidden = true;
      showRadarError();
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  function init(mapContainerId, lat, lon) {
    if (_initialized) return;
    if (typeof L === "undefined") {
      console.warn("Leaflet not loaded — radar unavailable");
      showRadarError();
      return;
    }

    _lat = lat;
    _lon = lon;
    _initialized = true;

    _map = L.map(mapContainerId, {
      center:      [lat, lon],
      zoom:        8,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // OSM base layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom:     19
    }).addTo(_map);

    // Location marker
    _marker = L.circleMarker([lat, lon], {
      radius:      9,
      fillColor:   "#087f83",
      color:       "#ffffff",
      weight:      2.5,
      opacity:     1,
      fillOpacity: 0.95,
      zIndexOffset: 1000
    }).addTo(_map).bindPopup("📍 Your location");

    // Load radar frames
    loadRadar();
  }

  function setLocation(lat, lon) {
    _lat = lat;
    _lon = lon;
    if (_map) {
      _map.setView([lat, lon], _map.getZoom());
      if (_marker) _marker.setLatLng([lat, lon]);
    }
  }

  function recentre() {
    if (_map) _map.setView([_lat, _lon], 8, { animate: true });
  }

  function togglePlayPause() {
    if (_playing) stopAnim();
    else startAnim();
  }

  function destroy() {
    stopAnim();
    _layers = [];
    _frames = [];
    if (_map) { _map.remove(); _map = null; }
    _initialized = false;
  }

  return { init, setLocation, recentre, togglePlayPause, destroy };
})();
