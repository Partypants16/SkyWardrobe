/**
 * RainService — pure rain-logic functions (no DOM).
 * All functions operate on the OWM /forecast list array.
 * Each list item has: { dt, pop, rain_3h, snow_3h, temp, feels_like, wind_speed, weather_main, ... }
 */
window.RainService = (function () {
  // ── Thresholds ──────────────────────────────────────────────────────────────
  const RAIN_PROB_THRESHOLD    = 0.40; // >= 40% probability → rain likely
  const RAIN_POSSIBLE_THRESHOLD = 0.20; // >= 20% → possible rain (softer signal)
  const RAIN_AMOUNT_BOOST      = 0.5;  // mm/3h — small amount boosts confidence at 25%+ pop

  // Rainfall amount per 3-hour window (mm)
  const MM_LIGHT    = 2.5;   // < 2.5 mm/3h  → light
  const MM_MODERATE = 7.5;   // < 7.5 mm/3h  → moderate
  const MM_HEAVY    = 22.5;  // < 22.5 mm/3h → heavy; above → severe

  // Outdoor comfort thresholds
  const OUTDOOR_MIN_TEMP   = 8;    // °C
  const OUTDOOR_MAX_TEMP   = 34;   // °C
  const OUTDOOR_MAX_WIND   = 12;   // m/s
  const OUTDOOR_MAX_POP    = 0.30; // 30%
  const OUTDOOR_MIN_SLOTS  = 2;    // minimum consecutive 3h slots to count

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function formatTime(dtSec, timezoneOffsetSec) {
    const offset = timezoneOffsetSec || 0;
    const d = new Date((dtSec + offset) * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  }

  function formatDate(dtSec, timezoneOffsetSec) {
    const offset = timezoneOffsetSec || 0;
    const d = new Date((dtSec + offset) * 1000);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  }

  function formatDateTime(dtSec, timezoneOffsetSec) {
    const offset = timezoneOffsetSec || 0;
    const d = new Date((dtSec + offset) * 1000);
    const today = new Date();
    const itemDate = new Date((dtSec + offset + today.getTimezoneOffset() * 60) * 1000);
    const isToday = today.toDateString() === itemDate.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
    if (isToday) return timeStr;
    const dayStr = d.toLocaleDateString([], { weekday: "short", timeZone: "UTC" });
    return `${dayStr} ${timeStr}`;
  }

  function capitalise(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function isCurrentlyRaining(currentWeather) {
    if (!currentWeather) return false;
    const main = (currentWeather.main || "").toLowerCase();
    const desc = (currentWeather.description || "").toLowerCase();
    return (
      main.includes("rain") ||
      main.includes("drizzle") ||
      main.includes("thunderstorm") ||
      desc.includes("rain") ||
      desc.includes("drizzle") ||
      desc.includes("shower") ||
      Number.isFinite(currentWeather.rain_1h) && currentWeather.rain_1h > 0
    );
  }

  // ── Core Functions ───────────────────────────────────────────────────────────

  function getRainIntensity(mm3h) {
    const mm = mm3h || 0;
    if (mm <= 0)         return "none";
    if (mm < MM_LIGHT)   return "light";
    if (mm < MM_MODERATE) return "moderate";
    if (mm < MM_HEAVY)   return "heavy";
    return "severe";
  }

  function isRainLikely(item) {
    if (!item) return false;
    const pop   = item.pop || 0;
    const rain  = item.rain_3h || 0;
    return pop >= RAIN_PROB_THRESHOLD || (pop >= 0.25 && rain >= RAIN_AMOUNT_BOOST);
  }

  function findNextRainEvent(list) {
    if (!Array.isArray(list)) return null;
    const nowSec = Date.now() / 1000;
    return list.find((item) => item.dt >= nowSec && isRainLikely(item)) || null;
  }

  /**
   * Group consecutive rainy forecast slots into RainPeriod objects.
   * Merges consecutive items separated by at most one non-rainy slot (gap tolerance).
   */
  function groupRainPeriods(list) {
    if (!Array.isArray(list) || list.length === 0) return [];
    const nowSec = Date.now() / 1000 - 3600; // Include current hour
    const periods = [];
    let current = null;
    let gapCount = 0;
    const GAP_TOLERANCE = 1; // allow 1 non-rainy slot gap to merge periods

    for (const item of list) {
      if (item.dt < nowSec) continue;

      if (isRainLikely(item)) {
        gapCount = 0;
        if (!current) {
          current = {
            startDt:     item.dt,
            endDt:       item.dt + 10800, // 3h slot
            maxPop:      item.pop || 0,
            totalMm:     item.rain_3h || 0,
            maxIntensity: "none",
            items:       [item]
          };
        } else {
          current.endDt     = item.dt + 10800;
          current.maxPop    = Math.max(current.maxPop, item.pop || 0);
          current.totalMm  += item.rain_3h || 0;
          current.items.push(item);
        }
      } else {
        if (current) {
          gapCount++;
          if (gapCount > GAP_TOLERANCE) {
            current.maxIntensity = getRainIntensity(current.totalMm / current.items.length);
            periods.push(current);
            current = null;
            gapCount = 0;
          }
        }
      }
    }

    if (current) {
      current.maxIntensity = getRainIntensity(current.totalMm / current.items.length);
      periods.push(current);
    }

    return periods;
  }

  function generateSummaryText(nextRain, currentWeather, timezoneOffset) {
    const tz = timezoneOffset || 0;

    if (isCurrentlyRaining(currentWeather)) {
      const rain1h = currentWeather.rain_1h || 0;
      const intensity = getRainIntensity(rain1h * 3);
      const intensityLabel = intensity === "none" ? "Light" : capitalise(intensity);
      return `${intensityLabel} rain currently occurring.`;
    }

    if (!nextRain) {
      return "No rain expected in the next 24 hours.";
    }

    const nowSec    = Date.now() / 1000;
    const minAway   = Math.round((nextRain.dt - nowSec) / 60);
    const hoursAway = minAway / 60;

    if (minAway <= 5)      return "Rain possible right now.";
    if (minAway < 60)      return `Rain expected in about ${minAway} minutes.`;
    if (hoursAway < 2)     return `Rain likely around ${formatTime(nextRain.dt, tz)}.`;
    return `Rain expected around ${formatTime(nextRain.dt, tz)}.`;
  }

  function generateInsights(list, currentWeather, timezoneOffset) {
    if (!Array.isArray(list) || list.length === 0) return [];
    const tz      = timezoneOffset || 0;
    const nowSec  = Date.now() / 1000;
    const insights = [];
    const future  = list.filter((i) => i.dt >= nowSec);
    const next24  = future.slice(0, 8);

    if (next24.length === 0) return [];

    // 1. Best departure time (first slot that tips to rainy after a dry stretch)
    const periods = groupRainPeriods(next24);
    if (periods.length > 0) {
      const firstPeriod = periods[0];
      const minBefore = Math.round((firstPeriod.startDt - nowSec) / 60);
      if (minBefore > 30) {
        const label = formatTime(firstPeriod.startDt, tz);
        insights.push(`Best time to head out: before ${label} — rain becomes likely afterwards.`);
      }
    }

    // 2. Heaviest rain slot
    let heaviestSlot = null;
    let maxMm = 0;
    for (const item of next24) {
      const mm = item.rain_3h || 0;
      if (mm > maxMm) { maxMm = mm; heaviestSlot = item; }
    }
    if (heaviestSlot && maxMm >= MM_MODERATE) {
      const intensity = getRainIntensity(maxMm);
      insights.push(`${capitalise(intensity)} rain expected around ${formatTime(heaviestSlot.dt, tz)}.`);
    }

    // 3. Rain clearing time (last rainy slot followed by dry)
    const rainPeriods = groupRainPeriods(next24);
    if (rainPeriods.length > 0) {
      const lastPeriod = rainPeriods[rainPeriods.length - 1];
      const clearDt    = lastPeriod.endDt;
      const clearTime  = formatTime(clearDt, tz);
      if (clearDt < nowSec + 86400) {
        insights.push(`Rain should clear around ${clearTime}.`);
      }
    }

    // 4. Strong winds
    const windySlots = next24.filter((i) => (i.wind_speed || 0) > 10);
    if (windySlots.length >= 2) {
      const firstWindy = windySlots[0];
      insights.push(`Strong winds expected from ${formatTime(firstWindy.dt, tz)}.`);
    }

    // 5. Temperature drop
    if (next24.length >= 4) {
      const earlyTemp = next24[0].temp;
      const lateTemp  = next24[next24.length - 1].temp;
      if (Number.isFinite(earlyTemp) && Number.isFinite(lateTemp)) {
        const drop = earlyTemp - lateTemp;
        if (drop >= 5) {
          const dropSlot = next24.find((i, idx) => idx > 0 && (next24[idx - 1].temp - i.temp) >= 3);
          const dropStr  = dropSlot ? ` from ${formatTime(dropSlot.dt, tz)}` : " later today";
          insights.push(`Temperature drops ${Math.round(drop)}°C${dropStr}.`);
        }
      }
    }

    // 6. All clear
    if (rainPeriods.length === 0 && next24.length >= 4) {
      insights.push("Clear conditions all day — no rain expected.");
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  function findBestOutdoorWindow(list, timezoneOffset) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const tz     = timezoneOffset || 0;
    const nowSec = Date.now() / 1000;
    const future = list.filter((i) => i.dt >= nowSec);
    const next24 = future.slice(0, 8);

    // Find the longest qualifying stretch
    let bestStart = -1;
    let bestLen   = 0;
    let curStart  = -1;
    let curLen    = 0;

    for (let i = 0; i < next24.length; i++) {
      const item = next24[i];
      const pop  = item.pop || 0;
      const temp = item.temp;
      const wind = item.wind_speed || 0;
      const day  = item.pod !== "n";

      const good = day &&
        pop  <= OUTDOOR_MAX_POP &&
        Number.isFinite(temp) &&
        temp >= OUTDOOR_MIN_TEMP &&
        temp <= OUTDOOR_MAX_TEMP &&
        wind <= OUTDOOR_MAX_WIND;

      if (good) {
        if (curLen === 0) curStart = i;
        curLen++;
        if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
      } else {
        curLen = 0;
      }
    }

    if (bestLen < OUTDOOR_MIN_SLOTS || bestStart < 0) return null;

    const windowItems = next24.slice(bestStart, bestStart + bestLen);
    const temps       = windowItems.map((i) => i.temp).filter(Number.isFinite);
    const maxPop      = Math.max(...windowItems.map((i) => i.pop || 0));
    const maxWind     = Math.max(...windowItems.map((i) => i.wind_speed || 0));

    let rainRisk;
    if (maxPop < 0.1)       rainRisk = "Very low rain risk";
    else if (maxPop < 0.2)  rainRisk = "Low rain risk";
    else if (maxPop < 0.30) rainRisk = "Small chance of rain";
    else                    rainRisk = "Some rain possible";

    let windLabel;
    if (maxWind < 3)        windLabel = "Calm";
    else if (maxWind < 6)   windLabel = "Light winds";
    else if (maxWind < 10)  windLabel = "Moderate winds";
    else                    windLabel = "Breezy";

    return {
      startDt:  windowItems[0].dt,
      endDt:    windowItems[windowItems.length - 1].dt + 10800,
      startTime: formatTime(windowItems[0].dt, tz),
      endTime:   formatTime(windowItems[windowItems.length - 1].dt + 10800, tz),
      minTemp:   Math.round(Math.min(...temps)),
      maxTemp:   Math.round(Math.max(...temps)),
      rainRisk,
      windLabel,
      durationH: bestLen * 3
    };
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    getRainIntensity,
    isRainLikely,
    isCurrentlyRaining,
    findNextRainEvent,
    groupRainPeriods,
    generateSummaryText,
    generateInsights,
    findBestOutdoorWindow,
    formatTime,
    formatDate,
    formatDateTime,
    capitalise,
    RAIN_PROB_THRESHOLD,
    RAIN_POSSIBLE_THRESHOLD,
    MM_LIGHT,
    MM_MODERATE,
    MM_HEAVY
  };
})();
