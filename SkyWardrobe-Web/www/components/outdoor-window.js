/**
 * OutdoorWindowComponent — renders the best outdoor activity window card.
 */
window.OutdoorWindowComponent = (function () {
  function render(containerId, outdoorWindow) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!outdoorWindow) {
      el.innerHTML = `
        <div class="section-header">
          <span class="section-icon">🌤</span>
          <h2 class="section-title">Outdoor Window</h2>
        </div>
        <div class="outdoor-no-window">
          <p class="muted-text">No clear outdoor window in the next 24 hours.</p>
        </div>`;
      return;
    }

    const { startTime, endTime, minTemp, maxTemp, rainRisk, windLabel, durationH } = outdoorWindow;
    const durLabel = durationH === 3 ? "3 hours"
                   : durationH === 6 ? "6 hours"
                   : `${durationH} hours`;

    el.innerHTML = `
      <div class="section-header">
        <span class="section-icon">🌤</span>
        <h2 class="section-title">Best Outdoor Window</h2>
      </div>
      <div class="outdoor-card">
        <div class="outdoor-time">${startTime} – ${endTime}</div>
        <div class="outdoor-dur">${durLabel} window</div>
        <div class="outdoor-meta">
          <span class="outdoor-chip">🌡 ${minTemp}–${maxTemp}°C</span>
          <span class="outdoor-chip outdoor-chip--rain">${rainRisk}</span>
          <span class="outdoor-chip">${windLabel}</span>
        </div>
      </div>`;
  }

  return { render };
})();
