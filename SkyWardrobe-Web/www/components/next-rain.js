/**
 * NextRainComponent — renders the "When Will It Rain?" summary card.
 * Depends on RainService.
 */
window.NextRainComponent = (function () {
  const RS = window.RainService;

  const INTENSITY_LABELS = {
    none:     { label: "None",     icon: "💧", cls: "intensity-none"     },
    light:    { label: "Light",    icon: "🌦",  cls: "intensity-light"    },
    moderate: { label: "Moderate", icon: "🌧",  cls: "intensity-moderate" },
    heavy:    { label: "Heavy",    icon: "⛈",  cls: "intensity-heavy"    },
    severe:   { label: "Severe",   icon: "🌩",  cls: "intensity-severe"   }
  };

  function intensityMeta(intensity) {
    return INTENSITY_LABELS[intensity] || INTENSITY_LABELS.none;
  }

  function formatDuration(startDt, endDt) {
    const h = Math.round((endDt - startDt) / 3600);
    if (h < 1) return "< 1 hour";
    if (h === 1) return "~1 hour";
    return `~${h} hours`;
  }

  function renderPeriodCard(period, tz, isFirst) {
    const meta   = intensityMeta(period.maxIntensity);
    const startT = RS.formatTime(period.startDt, tz);
    const endT   = RS.formatTime(period.endDt, tz);
    const dur    = formatDuration(period.startDt, period.endDt);
    const popPct = Math.round(period.maxPop * 100);
    const mm     = period.totalMm > 0 ? `${period.totalMm.toFixed(1)} mm expected` : null;
    const label  = isFirst ? "Next rain" : "Also";

    return `
      <div class="rain-period-card ${isFirst ? "rain-period-card--primary" : ""}">
        <div class="rain-period-label">${label}</div>
        <div class="rain-period-time">${startT} – ${endT}</div>
        <div class="rain-period-meta">
          <span class="rain-period-badge ${meta.cls}">${meta.icon} ${meta.label}</span>
          <span class="rain-period-stat">${popPct}% chance</span>
          ${mm ? `<span class="rain-period-stat">${mm}</span>` : ""}
          <span class="rain-period-stat rain-period-dur">${dur}</span>
        </div>
      </div>`;
  }

  function render(containerId, summaryText, rainPeriods, tz) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const hasPeriods = Array.isArray(rainPeriods) && rainPeriods.length > 0;
    const periodsHtml = hasPeriods
      ? rainPeriods.slice(0, 3).map((p, i) => renderPeriodCard(p, tz, i === 0)).join("")
      : `<div class="rain-no-rain">
           <span class="rain-no-rain-icon">☀️</span>
           <span>No rain periods in the forecast window.</span>
         </div>`;

    el.innerHTML = `
      <div class="section-header">
        <span class="section-icon">🌧</span>
        <h2 class="section-title">When Will It Rain?</h2>
      </div>
      <p class="rain-summary-text" id="next-rain-summary-text">${summaryText || "Loading forecast…"}</p>
      <div class="rain-period-list">${periodsHtml}</div>`;
  }

  function setLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="section-header">
        <span class="section-icon">🌧</span>
        <h2 class="section-title">When Will It Rain?</h2>
      </div>
      <p class="rain-summary-text muted-text">Loading forecast…</p>`;
  }

  function setError(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="section-header">
        <span class="section-icon">🌧</span>
        <h2 class="section-title">When Will It Rain?</h2>
      </div>
      <p class="rain-summary-text error-text">Forecast unavailable: ${message || "Unknown error"}</p>`;
  }

  return { render, setLoading, setError };
})();
