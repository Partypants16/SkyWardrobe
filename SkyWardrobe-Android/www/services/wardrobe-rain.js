/**
 * WardrobeRain — generates rain-aware wardrobe notes and accessory recommendations.
 * Depends on RainService being loaded first.
 *
 * Exposed as window.WardrobeRain in the browser and module.exports in Node
 * (so the pure logic below can be covered by automated tests without a DOM).
 */
const WardrobeRain = (function () {
  const RS = typeof window !== "undefined" && window.RainService
    ? window.RainService
    : require("./rain-service.js");

  // ── Thresholds (kept as named constants rather than scattered literals) ──────
  // Umbrella recommendation reuses RainService's own "rain likely" probability
  // bar, so wardrobe advice and the next-rain headline never disagree.
  const UMBRELLA_POP_THRESHOLD  = RS.RAIN_PROB_THRESHOLD; // 0.40
  const JACKET_POP_THRESHOLD    = 0.65; // high confidence...
  const JACKET_MM_THRESHOLD     = 3;    // ...combined with a meaningful amount (mm/3h)
  const PROLONGED_RAIN_SLOTS    = 2;    // 2+ consecutive 3h slots (6h+) counts as "prolonged"
  const PROLONGED_RAIN_SECONDS  = 10800 * PROLONGED_RAIN_SLOTS;
  const SOON_HOURS_HORIZON      = 6;    // "dry for now, but rain likely around X" window
  const PLANNING_HOURS_HORIZON  = 12;   // beyond this we soften urgency language

  function isProlonged(rainPeriods) {
    return Array.isArray(rainPeriods) && rainPeriods.length > 0 &&
      (rainPeriods[0].endDt - rainPeriods[0].startDt) >= PROLONGED_RAIN_SECONDS;
  }

  /**
   * Generates a contextual note about rain for the wardrobe panel.
   * @param {object|null} nextRain  — the next rain forecast item (or null)
   * @param {Array}       rainPeriods — grouped rain periods
   * @param {object}      currentWeather — current OWM weather
   * @param {number}      timezoneOffset — seconds
   * @returns {string} human-readable note
   */
  function generateRainNote(nextRain, rainPeriods, currentWeather, timezoneOffset) {
    const tz     = timezoneOffset || 0;
    const nowSec = Date.now() / 1000;

    if (RS.isCurrentlyRaining(currentWeather)) {
      const rain1h  = currentWeather.rain_1h || 0;
      const intensity = RS.getRainIntensity(rain1h * 3);
      if (intensity === "heavy" || intensity === "severe") {
        return "Heavy rain right now — wear full waterproofs and waterproof boots.";
      }
      return "Rain currently — an umbrella and water-resistant layer are recommended.";
    }

    if (!nextRain) {
      return "No rain expected in the next 24 hours. Dress for the temperature alone.";
    }

    const hoursAway = (nextRain.dt - nowSec) / 3600;
    // Day-aware label (e.g. "Tue 6:00 PM") so advice never implies "today"
    // for a rain slot that's actually tomorrow, even within the 24h horizon.
    const timeLabel = RS.formatDateTime(nextRain.dt, tz);
    const intensity = RS.getRainIntensity(nextRain.rain_3h);
    const prolonged = isProlonged(rainPeriods);

    if (hoursAway <= RS.RAIN_IMMINENT_HOURS) {
      if (intensity === "heavy" || intensity === "severe") {
        return `Heavy rain arriving around ${timeLabel} — take waterproof gear and boots.`;
      }
      return `Rain arriving around ${timeLabel} — pack an umbrella before you leave.`;
    }

    if (hoursAway <= SOON_HOURS_HORIZON) {
      const intensityNote = intensity === "moderate" || intensity === "heavy"
        ? ` (${intensity} rain expected)`
        : "";
      const prolongedNote = prolonged ? " This looks like a longer spell of rain, not just a quick shower." : "";
      return `Dry for now, but rain likely around ${timeLabel}${intensityNote}. Take a jacket or umbrella if you'll be out.${prolongedNote}`;
    }

    if (hoursAway <= PLANNING_HOURS_HORIZON) {
      return `Rain expected this ${timeOfDay(nextRain.dt, tz)} around ${timeLabel}. No urgency right now, but plan ahead.`;
    }

    return `No rain for most of the day — light rain possible later around ${timeLabel}.`;
  }

  function timeOfDay(dtSec, tz) {
    const d    = new Date((dtSec + tz) * 1000);
    const hour = d.getUTCHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
  }

  /**
   * Returns which rain accessories to recommend.
   * @returns {{ needsUmbrella, needsWaterproofShoes, needsRainJacket, reasons }}
   */
  function getAccessories(nextRain, rainPeriods, currentWeather) {
    const raining = RS.isCurrentlyRaining(currentWeather);
    const hasRain = raining || nextRain !== null;

    if (!hasRain) {
      return { needsUmbrella: false, needsWaterproofShoes: false, needsRainJacket: false };
    }

    const pop        = nextRain?.pop || (raining ? 1 : 0);
    const mm3h       = nextRain?.rain_3h || (raining ? (currentWeather.rain_1h || 0) * 3 : 0);
    const intensity  = RS.getRainIntensity(mm3h);
    const prolonged  = isProlonged(rainPeriods);

    const needsUmbrella        = pop >= UMBRELLA_POP_THRESHOLD;
    const needsWaterproofShoes = intensity === "moderate" || intensity === "heavy" || intensity === "severe";
    const needsRainJacket      = prolonged || intensity === "heavy" || intensity === "severe" ||
      (pop >= JACKET_POP_THRESHOLD && mm3h >= JACKET_MM_THRESHOLD);

    return { needsUmbrella, needsWaterproofShoes, needsRainJacket, intensity, pop };
  }

  return { generateRainNote, getAccessories };
})();

if (typeof window !== "undefined") window.WardrobeRain = WardrobeRain;
if (typeof module !== "undefined" && module.exports) module.exports = WardrobeRain;
