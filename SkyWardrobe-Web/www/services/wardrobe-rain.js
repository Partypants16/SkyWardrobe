/**
 * WardrobeRain — generates rain-aware wardrobe notes and accessory recommendations.
 * Depends on RainService being loaded first.
 */
window.WardrobeRain = (function () {
  const RS = window.RainService;

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

    const minAway   = Math.round((nextRain.dt - nowSec) / 60);
    const hoursAway = minAway / 60;
    const timeLabel = RS.formatTime(nextRain.dt, tz);
    const intensity = RS.getRainIntensity(nextRain.rain_3h);

    // Determine duration (is it prolonged rain?)
    const prolonged = rainPeriods.length > 0 &&
      (rainPeriods[0].endDt - rainPeriods[0].startDt) >= 10800 * 2; // 2+ slots = 6h

    if (hoursAway <= 1.5) {
      if (intensity === "heavy" || intensity === "severe") {
        return `Heavy rain arriving around ${timeLabel} — take waterproof gear and boots.`;
      }
      return `Rain arriving around ${timeLabel} — pack an umbrella before you leave.`;
    }

    if (hoursAway <= 6) {
      const intensityNote = intensity === "moderate" || intensity === "heavy"
        ? ` (${intensity} rain expected)`
        : "";
      return `Dry for now, but rain likely around ${timeLabel}${intensityNote}. Take a jacket or umbrella if you'll be out.`;
    }

    if (hoursAway <= 12) {
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
    const prolonged  = rainPeriods.length > 0 &&
      (rainPeriods[0].endDt - rainPeriods[0].startDt) >= 10800 * 2;

    const needsUmbrella         = pop >= 0.40;
    const needsWaterproofShoes  = intensity === "moderate" || intensity === "heavy" || intensity === "severe";
    const needsRainJacket       = prolonged || intensity === "heavy" || intensity === "severe" || (pop >= 0.65 && mm3h >= 3);

    return { needsUmbrella, needsWaterproofShoes, needsRainJacket, intensity, pop };
  }

  return { generateRainNote, getAccessories };
})();
