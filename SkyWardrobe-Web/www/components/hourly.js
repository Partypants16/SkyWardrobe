/**
 * HourlyComponent — horizontally scrollable 3-hour forecast timeline.
 * Depends on RainService.
 */
window.HourlyComponent = (function () {
  const RS = window.RainService;

  const WEATHER_ICONS = {
    "01d": "☀️", "01n": "🌙",
    "02d": "🌤",  "02n": "🌤",
    "03d": "🌥",  "03n": "🌥",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧",  "09n": "🌧",
    "10d": "🌦",  "10n": "🌧",
    "11d": "⛈",  "11n": "⛈",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫",  "50n": "🌫"
  };

  function weatherIcon(iconCode) {
    return WEATHER_ICONS[iconCode] || "🌡";
  }

  function popClass(pop) {
    if (pop >= 0.70) return "pop-high";
    if (pop >= 0.40) return "pop-medium";
    if (pop >= 0.20) return "pop-low";
    return "";
  }

  function renderCard(item, tz, isCurrent) {
    const time       = RS.formatTime(item.dt, tz);
    const icon       = weatherIcon(item.weather_icon);
    const temp       = Number.isFinite(item.temp) ? `${Math.round(item.temp)}°` : "--";
    const feelsLike  = Number.isFinite(item.feels_like) ? `${Math.round(item.feels_like)}°` : "--";
    const pop        = item.pop || 0;
    const popPct     = Math.round(pop * 100);
    const rain3h     = item.rain_3h || 0;
    const windSpd    = Number.isFinite(item.wind_speed) ? `${item.wind_speed.toFixed(1)} m/s` : "--";
    const desc       = item.weather_desc || item.weather_main || "";
    const cls        = [
      "hourly-card",
      isCurrent ? "hourly-card--current" : "",
      RS.isRainLikely(item) ? "hourly-card--rainy" : ""
    ].filter(Boolean).join(" ");

    return `
      <div class="${cls}" title="${RS.capitalise(desc)}">
        <div class="hourly-time">${time}</div>
        <div class="hourly-icon">${icon}</div>
        <div class="hourly-temp">${temp}</div>
        <div class="hourly-feels">Feels ${feelsLike}</div>
        <div class="hourly-pop ${popClass(pop)}">
          ${pop >= 0.10 ? `💧 ${popPct}%` : `<span class="pop-dry">No rain</span>`}
        </div>
        ${rain3h > 0 ? `<div class="hourly-mm">${rain3h.toFixed(1)} mm</div>` : ""}
        <div class="hourly-wind">↗ ${windSpd}</div>
      </div>`;
  }

  function render(containerId, list, tz, currentWeather) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!Array.isArray(list) || list.length === 0) {
      el.innerHTML = `<p class="muted-text">Hourly forecast unavailable.</p>`;
      return;
    }

    const nowSec = Date.now() / 1000;
    // Up to 24h / 3h = 8 slots
    const items  = list.slice(0, 8);

    // Find closest to current time
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < items.length; i++) {
      const diff = Math.abs(items[i].dt - nowSec);
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    }

    const cards = items.map((item, i) => renderCard(item, tz, i === closestIdx)).join("");

    el.innerHTML = `
      <div class="section-header">
        <span class="section-icon">🕐</span>
        <h2 class="section-title">Hourly Forecast</h2>
        <span class="section-subtitle">Next 24 hours (3-hour intervals)</span>
      </div>
      <div class="hourly-scroll" role="list" aria-label="Hourly weather forecast">${cards}</div>`;

    // Scroll so current card is visible
    const scroll = el.querySelector(".hourly-scroll");
    if (scroll) {
      const currentCard = scroll.children[closestIdx];
      if (currentCard) {
        const offset = currentCard.offsetLeft - scroll.offsetWidth / 2 + currentCard.offsetWidth / 2;
        scroll.scrollLeft = Math.max(0, offset);
      }
    }
  }

  function setLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="section-header">
        <span class="section-icon">🕐</span>
        <h2 class="section-title">Hourly Forecast</h2>
      </div>
      <p class="muted-text">Loading hourly data…</p>`;
  }

  return { render, setLoading };
})();
