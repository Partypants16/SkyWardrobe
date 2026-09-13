/**
 * RadarComponent — interactive Leaflet map with RainViewer animated precipitation overlay.
 * Lazy-initialised via IntersectionObserver.
 * No API key required.
 */
window.RadarComponent = (function () {
  const RF = window.RadarFrames;

  // ── State ────────────────────────────────────────────────────────────────────
  let _map          = null;
  let _marker       = null;
  let _activeLayer  = null; // exactly one RainViewer tile layer is ever attached to the map
  let _frames       = [];
  let _currentIdx   = 0;
  let _playing      = true;   // the user's intended play/pause state
  let _timer        = null;   // only non-null while actually animating
  let _initialized  = false;
  let _host         = "";
  let _lat          = -37.814;
  let _lon          = 144.963;
  let _onResize     = null;
  let _onVisibility = null;

  const FRAME_MS    = 600;
  const TILE_SIZE   = 256;
  const COLOR_SCHEME = 2; // Universal Blue
  const OPTIONS     = "1_1";   // smooth=1, snow=1
  const RAINVIEWER_ATTRIBUTION =
    'Rain data © <a href="https://rainviewer.com" target="_blank" rel="noopener">RainViewer</a>';

  // ── RainViewer helpers ───────────────────────────────────────────────────────
  async function fetchFrames() {
    const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!resp.ok) throw new Error(`RainViewer API returned ${resp.status}`);
    const data = await resp.json();
    _host = data.host || "https://tilecache.rainviewer.com";
    return RF.buildFrameList(data.radar);
  }

  // ── Layer helpers ────────────────────────────────────────────────────────────
  // Only the currently-visible frame's tile layer is ever attached to the map.
  // Older implementations kept every frame's layer loaded simultaneously,
  // which meant every frame's tiles were fetched (and stayed resident) at
  // once — this swaps a single layer in/out instead, so switching frames
  // costs one set of tile requests (browser HTTP cache serves repeats on
  // loop) rather than requesting every frame up front.
  function showFrame(idx) {
    if (_frames.length === 0) return;
    const clamped = Math.max(0, Math.min(idx, _frames.length - 1));
    const frame = _frames[clamped];

    const newLayer = L.tileLayer(RF.tileUrl(_host, frame, { tileSize: TILE_SIZE, colorScheme: COLOR_SCHEME, options: OPTIONS }), {
      opacity:     0.65,
      tileSize:    TILE_SIZE,
      maxZoom:     19,
      zIndex:      10,
      attribution: RAINVIEWER_ATTRIBUTION
    });
    newLayer.addTo(_map);

    const previousLayer = _activeLayer;
    _activeLayer = newLayer;
    if (previousLayer) _map.removeLayer(previousLayer);

    _currentIdx = clamped;
    updateTimeline();
    updateTimestampLabel();
  }

  function nextFrame() {
    showFrame((_currentIdx + 1) % _frames.length);
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

    const pct = RF.nowMarkerPercent(_frames);
    // RainViewer frequently has no nowcast frames at all, which puts the
    // "Now" marker right at (or past) the far edge — directly under the
    // static "Past"/"Forecast" label there. Drop whichever static label
    // "Now" would collide with instead of letting the text overlap.
    const pastLabel     = pct <= 8  ? "" : `<span class="radar-tl-label">Past</span>`;
    const forecastLabel = pct >= 92 ? "" : `<span class="radar-tl-label radar-tl-label--right">Forecast</span>`;
    el.innerHTML = `
      ${pastLabel}
      <span class="radar-tl-now" style="left:${pct}%">Now</span>
      ${forecastLabel}`;
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

      _currentIdx = RF.defaultFrameIndex(_frames);
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

    // Keep the map correctly sized across viewport/orientation changes —
    // without this a Leaflet map can render with grey/mis-aligned tiles
    // after the window is resized post-init.
    _onResize = () => _map && _map.invalidateSize();
    window.addEventListener("resize", _onResize);

    // Pause the animation timer while the tab is hidden so we don't keep
    // swapping (and re-requesting) radar tiles for a screen no one can see.
    // Only resumes if the user hadn't explicitly paused it themselves.
    _onVisibility = () => {
      if (document.hidden) {
        if (_timer) { clearInterval(_timer); _timer = null; }
      } else if (_playing && !_timer && _frames.length > 0) {
        _timer = setInterval(nextFrame, FRAME_MS);
      }
    };
    document.addEventListener("visibilitychange", _onVisibility);

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
    if (_onResize) { window.removeEventListener("resize", _onResize); _onResize = null; }
    if (_onVisibility) { document.removeEventListener("visibilitychange", _onVisibility); _onVisibility = null; }
    if (_activeLayer && _map) _map.removeLayer(_activeLayer);
    _activeLayer = null;
    _frames = [];
    if (_map) { _map.remove(); _map = null; }
    _initialized = false;
  }

  return { init, setLocation, recentre, togglePlayPause, destroy };
})();
