// ── Dashboard state ──────────────────────────────────────────────────────────
const dashboardState = {
  weather:      null,
  forecast:     null,
  lastUpdated:  null,
  location: {
    lat:      null,
    lon:      null,
    name:     null,
    usingGPS: false
  }
};

// ── DOM element refs ─────────────────────────────────────────────────────────
const elements = {
  refreshButton:         document.getElementById("refreshButton"),
  location:              document.getElementById("location"),
  temperature:           document.getElementById("temperature"),
  feelsLike:             document.getElementById("feelsLike"),
  description:           document.getElementById("description"),
  weatherIcon:           document.getElementById("weatherIcon"),
  tempRange:             document.getElementById("tempRange"),
  updatedAt:             document.getElementById("updatedAt"),
  humidity:              document.getElementById("humidity"),
  windSpeed:             document.getElementById("windSpeed"),
  windDirection:         document.getElementById("windDirection"),
  windGust:              document.getElementById("windGust"),
  condition:             document.getElementById("condition"),
  clouds:                document.getElementById("clouds"),
  pressure:              document.getElementById("pressure"),
  pressureLevels:        document.getElementById("pressureLevels"),
  visibility:            document.getElementById("visibility"),
  rain:                  document.getElementById("rain"),
  snow:                  document.getElementById("snow"),
  coordinates:           document.getElementById("coordinates"),
  country:               document.getElementById("country"),
  sunrise:               document.getElementById("sunrise"),
  sunset:                document.getElementById("sunset"),
  timezone:              document.getElementById("timezone"),
  cityId:                document.getElementById("cityId"),
  stationType:           document.getElementById("stationType"),
  base:                  document.getElementById("base"),
  outfitTop:             document.getElementById("outfitTop"),
  outfitTopDesc:         document.getElementById("outfitTopDesc"),
  outfitBottom:          document.getElementById("outfitBottom"),
  outfitBottomDesc:      document.getElementById("outfitBottomDesc"),
  outfitOuterwear:       document.getElementById("outfitOuterwear"),
  outfitOuterwearDesc:   document.getElementById("outfitOuterwearDesc"),
  outfitFootwear:        document.getElementById("outfitFootwear"),
  outfitFootwearDesc:    document.getElementById("outfitFootwearDesc"),
  outfitAccessory:       document.getElementById("outfitAccessory"),
  outfitAccessoryDesc:   document.getElementById("outfitAccessoryDesc"),
  status:                document.getElementById("status"),
  lastUpdated:           document.getElementById("lastUpdated"),
  // Rain wardrobe
  rainWardrobeNote:      document.getElementById("rain-wardrobe-note"),
  rainWardrobeText:      document.getElementById("rain-wardrobe-text"),
  rainAccessories:       document.getElementById("rain-accessories"),
  // Location search
  citySearch:            document.getElementById("citySearch"),
  citySearchResults:     document.getElementById("citySearchResults"),
  gpsButton:             document.getElementById("gpsButton")
};

// ── Formatting helpers ───────────────────────────────────────────────────────
function formatTemperature(v) { return Number.isFinite(v) ? `${Math.round(v)}\u00B0C` : "--"; }
function formatHumidity(v)    { return Number.isFinite(v) ? `${v}%` : "--"; }
function formatWindSpeed(v)   { return Number.isFinite(v) ? `${v.toFixed(1)} m/s` : "--"; }
function formatPressure(v)    { return Number.isFinite(v) ? `${v} hPa` : "--"; }
function formatPercent(v)     { return Number.isFinite(v) ? `${v}%` : "--"; }
function formatVisibility(v)  { return Number.isFinite(v) ? `${(v / 1000).toFixed(1)} km` : "--"; }

function formatPrecipitation(oneHour, threeHour) {
  if (Number.isFinite(oneHour))   return `${oneHour.toFixed(1)} mm/h`;
  if (Number.isFinite(threeHour)) return `${threeHour.toFixed(1)} mm/3h`;
  return "0 mm";
}

function formatCoordinate(v, suffix) {
  return Number.isFinite(v) ? `${Math.abs(v).toFixed(2)}${suffix}` : "--";
}

function formatDirection(deg) {
  if (!Number.isFinite(deg)) return "Direction --";
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `${labels[Math.round(deg / 45) % 8]} ${deg}\u00B0`;
}

function formatTimezone(sec) {
  if (!Number.isFinite(sec)) return "--";
  const sign = sec >= 0 ? "+" : "-";
  const abs  = Math.abs(sec);
  const h    = String(Math.floor(abs / 3600)).padStart(2, "0");
  const m    = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

function formatWeatherTime(ts, tzOffset = 0) {
  if (!Number.isFinite(ts)) return "--";
  const d = new Date((ts + tzOffset) * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

function formatMeasurementTime(ts, tzOffset = 0) {
  if (!Number.isFinite(ts)) return "Measured --";
  const d = new Date((ts + tzOffset) * 1000);
  return `Measured ${d.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}`;
}

function formatDescription(v) { return v || "No condition available"; }

// ── Config / API helpers ─────────────────────────────────────────────────────
// The OpenWeatherMap key is a secret and lives only on the server (logic.js).
// The browser never calls OpenWeatherMap directly — it always goes through
// our own /weather, /forecast and /geocode proxy endpoints below.

function getAppConfig() { return window.SKYWARDROBE_CONFIG || {}; }

async function fetchJson(url, signal) {
  const resp = await fetch(url, signal ? { signal } : undefined);
  if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  if (data.cod && Number(data.cod) >= 400) throw new Error(data.message || "API error");
  return data;
}

function buildServerUrl(path, params) {
  const config  = getAppConfig();
  const baseUrl = (config.API_BASE_URL || "").replace(/\/$/, "");
  const url = new URL(baseUrl ? `${baseUrl}${path}` : path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

// ── Location params helper ──────────────────────────────────────────────────
function locationParams() {
  const loc = dashboardState.location;
  if (Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
    return { lat: loc.lat, lon: loc.lon };
  }
  const config = getAppConfig();
  return { q: config.OPENWEATHER_CITY || "Melbourne,AU" };
}

// ── Fetch weather (current) ──────────────────────────────────────────────────
async function fetchWeatherData(signal) {
  const params = locationParams();
  return fetchJson(buildServerUrl("/weather", params), signal);
}

// ── Fetch forecast ───────────────────────────────────────────────────────────
async function fetchForecastData(signal) {
  const params = locationParams();
  return fetchJson(buildServerUrl("/forecast", params), signal);
}

// ── Fetch geocode ────────────────────────────────────────────────────────────
async function fetchGeocode(query, signal) {
  return fetchJson(buildServerUrl("/geocode", { q: query }), signal);
}

// ── Data normalisation ───────────────────────────────────────────────────────
function firstWeatherItem(data) {
  return Array.isArray(data.weather) ? data.weather[0] : null;
}

function numericValue(...vals) {
  const v = vals.find((x) => x !== null && x !== undefined && x !== "");
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function textValue(...vals) {
  const v = vals.find((x) => x !== null && x !== undefined && x !== "");
  return v === undefined ? null : String(v);
}

function normalizeWeatherData(data) {
  const raw  = data.raw || data;
  const cond = firstWeatherItem(data) || firstWeatherItem(raw) || {};
  const main = raw.main && typeof raw.main === "object" ? raw.main : {};
  const wind = raw.wind && typeof raw.wind === "object" ? raw.wind : {};
  const cl   = raw.clouds && typeof raw.clouds === "object" ? raw.clouds : {};
  const rain = raw.rain  && typeof raw.rain  === "object" ? raw.rain  : {};
  const snow = raw.snow  && typeof raw.snow  === "object" ? raw.snow  : {};
  const sys  = raw.sys   && typeof raw.sys   === "object" ? raw.sys   : {};
  const coord= raw.coord && typeof raw.coord === "object" ? raw.coord : {};

  return {
    coord:      { lon: numericValue(data.coord?.lon, coord.lon), lat: numericValue(data.coord?.lat, coord.lat) },
    weather:    Array.isArray(data.weather) ? data.weather : Array.isArray(raw.weather) ? raw.weather : [],
    base:       textValue(data.base, raw.base),
    temp:       numericValue(data.temp, main.temp),
    feels_like: numericValue(data.feels_like, main.feels_like),
    temp_min:   numericValue(data.temp_min, main.temp_min),
    temp_max:   numericValue(data.temp_max, main.temp_max),
    pressure:   numericValue(data.pressure, main.pressure),
    humidity:   numericValue(data.humidity, main.humidity),
    sea_level:  numericValue(data.sea_level, main.sea_level),
    grnd_level: numericValue(data.grnd_level, main.grnd_level),
    visibility: numericValue(data.visibility, raw.visibility),
    wind_speed: numericValue(data.wind_speed, wind.speed),
    wind_deg:   numericValue(data.wind_deg,   wind.deg),
    wind_gust:  numericValue(data.wind_gust,  wind.gust),
    clouds_all: numericValue(data.clouds_all, cl.all),
    rain_1h:    numericValue(data.rain_1h, rain["1h"]),
    rain_3h:    numericValue(data.rain_3h, rain["3h"]),
    snow_1h:    numericValue(data.snow_1h, snow["1h"]),
    snow_3h:    numericValue(data.snow_3h, snow["3h"]),
    dt:         numericValue(data.dt, raw.dt),
    sys:        {
      type:    numericValue(data.sys?.type,    sys.type),
      id:      numericValue(data.sys?.id,      sys.id),
      message: textValue(data.sys?.message,    sys.message),
      country: textValue(data.sys?.country,    sys.country),
      sunrise: numericValue(data.sys?.sunrise, sys.sunrise),
      sunset:  numericValue(data.sys?.sunset,  sys.sunset)
    },
    timezone:    numericValue(data.timezone, raw.timezone),
    id:          numericValue(data.id, raw.id),
    name:        textValue(data.name, raw.name),
    cod:         numericValue(data.cod, raw.cod),
    main:        textValue(data.main, cond.main),
    description: textValue(data.description, cond.description),
    icon:        textValue(data.icon, cond.icon),
    outfit:      data.outfit || raw.outfit || null,
    mock:        Boolean(data.mock || raw.mock)
  };
}

function hasExpandedWeatherFields(w) {
  return Boolean(
    Number.isFinite(w.coord?.lat) || Number.isFinite(w.coord?.lon) ||
    Number.isFinite(w.pressure)   || Number.isFinite(w.visibility) ||
    Number.isFinite(w.clouds_all) || Number.isFinite(w.dt)
  );
}

// ── Storage ──────────────────────────────────────────────────────────────────
function saveWeatherData(data) {
  dashboardState.weather     = normalizeWeatherData(data);
  dashboardState.lastUpdated = new Date();
  try {
    localStorage.setItem("skyWardrobeWeather", JSON.stringify({
      data:        dashboardState.weather,
      lastUpdated: dashboardState.lastUpdated.toISOString()
    }));
  } catch (_) { /* storage may be unavailable */ }
}

function saveForecastData(data) {
  dashboardState.forecast = data;
  try {
    localStorage.setItem("skyWardrobeForecast", JSON.stringify({
      data:        data,
      savedAt:     new Date().toISOString()
    }));
  } catch (_) {}
}

function loadSavedData() {
  try {
    const w = localStorage.getItem("skyWardrobeWeather");
    if (w) {
      const parsed = JSON.parse(w);
      dashboardState.weather     = normalizeWeatherData(parsed.data);
      dashboardState.lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : null;
    }

    const f = localStorage.getItem("skyWardrobeForecast");
    if (f) {
      const parsed = JSON.parse(f);
      // Only restore if < 30 min old
      const savedAt = parsed.savedAt ? new Date(parsed.savedAt) : null;
      if (savedAt && (Date.now() - savedAt.getTime()) < 30 * 60 * 1000) {
        dashboardState.forecast = parsed.data;
      }
    }
  } catch (_) {
    localStorage.removeItem("skyWardrobeWeather");
    localStorage.removeItem("skyWardrobeForecast");
  }
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(weather) {
  document.body.className = "";
  const isNight = weather.dt && weather.sys?.sunrise && weather.sys?.sunset &&
                  (weather.dt < weather.sys.sunrise || weather.dt > weather.sys.sunset);

  if (isNight) {
    document.body.classList.add("theme-night");
    return;
  }

  const m = (weather.main || "").toLowerCase();
  if      (m.includes("clear"))                                   document.body.classList.add("theme-clear");
  else if (m.includes("cloud"))                                   document.body.classList.add("theme-clouds");
  else if (m.includes("rain") || m.includes("drizzle") || m.includes("thunderstorm"))
                                                                  document.body.classList.add("theme-rain");
  else if (m.includes("snow"))                                    document.body.classList.add("theme-snow");
  else                                                            document.body.classList.add("theme-clouds");
}

// ── Main render: current weather ─────────────────────────────────────────────
function renderDashboard() {
  const weather = dashboardState.weather
    ? normalizeWeatherData(dashboardState.weather)
    : null;

  if (!weather) return;
  dashboardState.weather = weather;

  applyTheme(weather);

  const iconUrl       = weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : "";
  const lon           = weather.coord?.lon;
  const lat           = weather.coord?.lat;
  const country       = weather.sys?.country;
  const locationParts = [weather.name, country].filter(Boolean);

  elements.location.textContent = locationParts.length
    ? `${locationParts.join(", ")} weather translated into what to wear now.`
    : "Weather translated into what to wear now.";

  elements.temperature.textContent   = formatTemperature(weather.temp);
  elements.feelsLike.textContent     = `Feels like ${formatTemperature(weather.feels_like)}`;
  elements.description.textContent   = formatDescription(weather.description);
  elements.tempRange.textContent     = `Range ${formatTemperature(weather.temp_min)} to ${formatTemperature(weather.temp_max)}`;
  elements.updatedAt.textContent     = formatMeasurementTime(weather.dt, weather.timezone);
  elements.humidity.textContent      = formatHumidity(weather.humidity);
  elements.windSpeed.textContent     = formatWindSpeed(weather.wind_speed);
  elements.windDirection.textContent = formatDirection(weather.wind_deg);
  elements.windGust.textContent      = formatWindSpeed(weather.wind_gust);
  elements.condition.textContent     = weather.main || formatDescription(weather.description);
  elements.clouds.textContent        = formatPercent(weather.clouds_all);
  elements.pressure.textContent      = formatPressure(weather.pressure);
  elements.pressureLevels.textContent= `Sea ${formatPressure(weather.sea_level)} / ground ${formatPressure(weather.grnd_level)}`;
  elements.visibility.textContent    = formatVisibility(weather.visibility);
  elements.rain.textContent          = formatPrecipitation(weather.rain_1h, weather.rain_3h);
  elements.snow.textContent          = formatPrecipitation(weather.snow_1h, weather.snow_3h);
  elements.coordinates.textContent   = Number.isFinite(lat) && Number.isFinite(lon)
    ? `${formatCoordinate(lat, lat >= 0 ? "N" : "S")}, ${formatCoordinate(lon, lon >= 0 ? "E" : "W")}`
    : "--";
  elements.country.textContent       = country || "--";
  elements.sunrise.textContent       = formatWeatherTime(weather.sys?.sunrise, weather.timezone);
  elements.sunset.textContent        = formatWeatherTime(weather.sys?.sunset,  weather.timezone);
  elements.timezone.textContent      = formatTimezone(weather.timezone);
  elements.cityId.textContent        = weather.id ?? "--";
  elements.stationType.textContent   = weather.sys?.type ?? "--";
  elements.base.textContent          = weather.base || "--";

  // Outfit items
  const outfit = weather.outfit || {};
  const renderItem = (cat, nameEl, descEl) => {
    const item = outfit[cat] || {};
    nameEl.textContent = item.name || `No suitable ${cat}`;
    descEl.textContent = item.description || "Populate database with matching items.";
  };
  renderItem("top",       elements.outfitTop,      elements.outfitTopDesc);
  renderItem("bottom",    elements.outfitBottom,    elements.outfitBottomDesc);
  renderItem("outerwear", elements.outfitOuterwear, elements.outfitOuterwearDesc);
  renderItem("footwear",  elements.outfitFootwear,  elements.outfitFootwearDesc);
  renderItem("accessory", elements.outfitAccessory, elements.outfitAccessoryDesc);

  if (iconUrl) {
    elements.weatherIcon.src    = iconUrl;
    elements.weatherIcon.alt    = `${formatDescription(weather.description)} icon`;
    elements.weatherIcon.hidden = false;
  } else {
    elements.weatherIcon.hidden = true;
  }

  elements.lastUpdated.textContent = dashboardState.lastUpdated
    ? `Last refreshed: ${dashboardState.lastUpdated.toLocaleString()}`
    : "Last refreshed: --";

  // Update location state from weather coords
  if (Number.isFinite(lat) && Number.isFinite(lon) && !Number.isFinite(dashboardState.location.lat)) {
    dashboardState.location.lat  = lat;
    dashboardState.location.lon  = lon;
    dashboardState.location.name = weather.name;
  }
}

// ── Rain feature rendering ────────────────────────────────────────────────────
let _radarInitialized = false;
let _graphInitialized = false;

function renderRainFeatures(forecast, currentWeather) {
  if (!forecast || !Array.isArray(forecast.list)) {
    window.NextRainComponent?.setError("next-rain-section", "Forecast unavailable.");
    window.HourlyComponent?.setError("hourly-section");
    return;
  }

  const list = forecast.list;
  const tz   = forecast.city?.timezone || currentWeather?.timezone || 0;
  const RS   = window.RainService;

  // ── Next rain card ────────────────────────────────────────────────────────
  const nextRain    = RS.findNextRainEvent(list);
  const rainPeriods = RS.groupRainPeriods(list);
  const summary     = RS.generateSummaryText(nextRain, currentWeather, tz);

  window.NextRainComponent?.render("next-rain-section", summary, rainPeriods, tz);

  // ── Rain probability graph ────────────────────────────────────────────────
  if (!_graphInitialized) {
    window.RainGraphComponent?.init("rain-graph-canvas");
    _graphInitialized = true;
  }
  window.RainGraphComponent?.render(list, nextRain, tz);

  // ── Hourly timeline ───────────────────────────────────────────────────────
  window.HourlyComponent?.render("hourly-section", list, tz, currentWeather);

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = RS.generateInsights(list, currentWeather, tz);
  window.InsightsComponent?.render("insights-section", insights);

  // ── Outdoor window ────────────────────────────────────────────────────────
  const outdoorWindow = RS.findBestOutdoorWindow(list, tz);
  window.OutdoorWindowComponent?.render("outdoor-window-section", outdoorWindow);

  // ── Rain wardrobe note ────────────────────────────────────────────────────
  if (window.WardrobeRain && currentWeather) {
    const note = window.WardrobeRain.generateRainNote(nextRain, rainPeriods, currentWeather, tz);
    const accessories = window.WardrobeRain.getAccessories(nextRain, rainPeriods, currentWeather);

    if (note && elements.rainWardrobeNote) {
      elements.rainWardrobeNote.hidden = false;
      if (elements.rainWardrobeText) elements.rainWardrobeText.textContent = note;

      // Accessory chips
      if (elements.rainAccessories) {
        const chips = [];
        if (accessories.needsUmbrella)         chips.push("☂️ Umbrella");
        if (accessories.needsRainJacket)        chips.push("🧥 Rain jacket");
        if (accessories.needsWaterproofShoes)   chips.push("🥾 Waterproof shoes");

        elements.rainAccessories.innerHTML = chips
          .map((c) => `<span class="rain-accessory-chip">${c}</span>`)
          .join("");
      }
    }
  }

  // ── Radar (lazy init on scroll) ───────────────────────────────────────────
  initRadarWhenVisible();
}

// Guards observer creation independently of _radarInitialized: renderRainFeatures()
// runs on every refresh, but the section may not have scrolled into view yet, so
// without this flag a fresh IntersectionObserver (and duplicate button listeners)
// would be created on every single refresh until the user finally scrolls to it.
let _radarObserverCreated = false;

function initRadarWhenVisible() {
  const radarSection = document.getElementById("radar-section");
  if (!radarSection || _radarObserverCreated) return;
  _radarObserverCreated = true;

  const obs = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const lat = Number.isFinite(dashboardState.location.lat) ? dashboardState.location.lat : -37.814;
        const lon = Number.isFinite(dashboardState.location.lon) ? dashboardState.location.lon : 144.963;
        window.RadarComponent?.init("radar-map", lat, lon);
        _radarInitialized = true;
        obs.disconnect();

        // Wire up radar controls (registered exactly once, guarded by _radarObserverCreated above)
        document.getElementById("radar-play-pause")?.addEventListener("click", () => {
          window.RadarComponent?.togglePlayPause();
        });
        document.getElementById("radar-recentre-btn")?.addEventListener("click", () => {
          window.RadarComponent?.recentre();
        });
      }
    }
  }, { threshold: 0.1 });

  obs.observe(radarSection);
}

// ── Error render ──────────────────────────────────────────────────────────────
function renderError(message) {
  elements.status.textContent = message;
  elements.status.classList.add("error");
  elements.location.textContent      = "Weather translated into what to wear now.";
  elements.temperature.textContent   = "--";
  elements.feelsLike.textContent     = "Feels like --";
  elements.description.textContent   = "Weather unavailable";
  elements.tempRange.textContent     = "Range --";
  elements.updatedAt.textContent     = "Measured --";
  elements.humidity.textContent      = "--";
  elements.windSpeed.textContent     = "--";
  elements.windDirection.textContent = "Direction --";
  elements.windGust.textContent      = "--";
  elements.condition.textContent     = "--";
  elements.clouds.textContent        = "--";
  elements.pressure.textContent      = "--";
  elements.pressureLevels.textContent= "Sea / ground --";
  elements.visibility.textContent    = "--";
  elements.rain.textContent          = "--";
  elements.snow.textContent          = "--";
  elements.coordinates.textContent   = "--";
  elements.country.textContent       = "--";
  elements.sunrise.textContent       = "--";
  elements.sunset.textContent        = "--";
  elements.timezone.textContent      = "--";
  elements.cityId.textContent        = "--";
  elements.stationType.textContent   = "--";
  elements.base.textContent          = "--";

  const clearItem = (n, d) => { n.textContent = "--"; d.textContent = ""; };
  clearItem(elements.outfitTop,      elements.outfitTopDesc);
  clearItem(elements.outfitBottom,   elements.outfitBottomDesc);
  clearItem(elements.outfitOuterwear,elements.outfitOuterwearDesc);
  clearItem(elements.outfitFootwear, elements.outfitFootwearDesc);
  clearItem(elements.outfitAccessory,elements.outfitAccessoryDesc);
  elements.weatherIcon.hidden = true;

  if (elements.rainWardrobeNote) elements.rainWardrobeNote.hidden = true;
}

// ── Refresh all ───────────────────────────────────────────────────────────────
// A monotonically increasing request generation guards against races: if the
// user switches location again before an in-flight request settles, the
// stale request's abort controller is cancelled and its result — even if it
// arrives late — is discarded rather than overwriting the newer location.
let _requestGeneration = 0;
let _activeAbort       = null;

async function refreshAll() {
  if (_activeAbort) _activeAbort.abort();
  const abortController = new AbortController();
  _activeAbort = abortController;
  const myGeneration = ++_requestGeneration;
  const isStale = () => myGeneration !== _requestGeneration;

  elements.refreshButton.disabled = true;
  elements.status.classList.remove("error");
  elements.status.textContent = "Refreshing weather data…";

  let weatherOk   = false;
  let forecastOk  = false;
  let currentWeather = null;

  // Fetch current weather
  try {
    const data = await fetchWeatherData(abortController.signal);
    if (isStale()) return;
    saveWeatherData(data);
    renderDashboard();
    weatherOk      = true;
    currentWeather = dashboardState.weather;
  } catch (err) {
    if (isStale() || err.name === "AbortError") return;
    renderError(err.message || "Weather fetch failed");
  }

  // Fetch forecast (independent — don't let it break current weather display)
  try {
    const forecast = await fetchForecastData(abortController.signal);
    if (isStale()) return;
    saveForecastData(forecast);
    renderRainFeatures(forecast, currentWeather);
    forecastOk = true;
  } catch (err) {
    if (isStale() || err.name === "AbortError") return;
    console.warn("Forecast fetch failed:", err.message);
    window.NextRainComponent?.setError("next-rain-section", "Forecast data temporarily unavailable.");
    window.HourlyComponent?.setError("hourly-section");
  }

  // Update radar location if it's already initialised
  if (_radarInitialized && Number.isFinite(dashboardState.location.lat)) {
    window.RadarComponent?.setLocation(dashboardState.location.lat, dashboardState.location.lon);
  }

  // Status message
  if (weatherOk) {
    const expanded = hasExpandedWeatherFields(dashboardState.weather);
    const forecastNote = forecastOk ? "" : " (forecast unavailable)";
    elements.status.classList.remove("error");
    if (dashboardState.weather.mock) {
      elements.status.classList.add("error");
      elements.status.textContent = `Live weather is unavailable right now — showing placeholder fallback conditions, not real data.${forecastNote}`;
    } else {
      elements.status.textContent = expanded
        ? `Dashboard refreshed with the latest weather data.${forecastNote}`
        : `Refresh worked, but the server is returning compact weather data.${forecastNote}`;
    }
  }

  if (!isStale()) elements.refreshButton.disabled = false;
}

// ── Location search ───────────────────────────────────────────────────────────
let _geocodeTimer = null;

function showSearchResults(results) {
  const el = elements.citySearchResults;
  if (!el) return;

  if (!results || results.length === 0) {
    el.hidden = true;
    return;
  }

  el.innerHTML = results
    .map((r) => {
      const name    = r.name || "";
      const country = r.country || "";
      const state   = r.state ? `, ${r.state}` : "";
      return `<div class="search-result-item"
                   data-lat="${r.lat}" data-lon="${r.lon}" data-name="${name}${state}"
                   role="button" tabindex="0">
                ${name}${state} <span class="search-result-country">${country}</span>
              </div>`;
    })
    .join("");

  el.querySelectorAll(".search-result-item").forEach((item) => {
    const selectResult = () => {
      const lat  = parseFloat(item.dataset.lat);
      const lon  = parseFloat(item.dataset.lon);
      const name = item.dataset.name;
      selectLocation(lat, lon, name);
    };
    item.addEventListener("click",  selectResult);
    item.addEventListener("keydown", (e) => { if (e.key === "Enter") selectResult(); });
  });

  el.hidden = false;
}

function hideSearchResults() {
  if (elements.citySearchResults) elements.citySearchResults.hidden = true;
}

async function selectLocation(lat, lon, name) {
  dashboardState.location = { lat, lon, name, usingGPS: false };
  if (elements.citySearch) elements.citySearch.value = name || "";
  hideSearchResults();
  if (elements.gpsButton) elements.gpsButton.classList.remove("gps-active");
  await refreshAll();
}

function requestGPSLocation() {
  if (!navigator.geolocation) {
    elements.status.textContent = "GPS is not supported by this browser.";
    return;
  }

  elements.gpsButton.textContent = "⏳";
  elements.status.textContent = "Detecting your location…";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat  = position.coords.latitude;
      const lon  = position.coords.longitude;
      dashboardState.location = { lat, lon, name: null, usingGPS: true };
      elements.gpsButton.textContent = "📍";
      elements.gpsButton.classList.add("gps-active");
      if (elements.citySearch) elements.citySearch.value = "";
      await refreshAll();
    },
    (err) => {
      elements.gpsButton.textContent = "📍";
      let msg = "Could not detect your location. Using default city.";
      if (err.code === err.PERMISSION_DENIED) {
        msg = "Location access denied. Search for a city instead.";
      } else if (err.code === err.TIMEOUT) {
        msg = "Location request timed out. Search for a city instead.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = "Your location is unavailable right now. Search for a city instead.";
      }
      elements.status.textContent = msg;
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

// ── Event listeners ───────────────────────────────────────────────────────────
elements.refreshButton?.addEventListener("click", refreshAll);

elements.gpsButton?.addEventListener("click", requestGPSLocation);

let _geocodeGeneration = 0;

elements.citySearch?.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (_geocodeTimer) clearTimeout(_geocodeTimer);
  if (q.length < 2) { hideSearchResults(); return; }

  const myGeneration = ++_geocodeGeneration;
  _geocodeTimer = setTimeout(async () => {
    try {
      const results = await fetchGeocode(q);
      // Discard results from a superseded (older) search query.
      if (myGeneration !== _geocodeGeneration) return;
      showSearchResults(results);
    } catch (_) {
      if (myGeneration !== _geocodeGeneration) return;
      hideSearchResults();
    }
  }, 400);
});

elements.citySearch?.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideSearchResults();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".location-search-wrap")) hideSearchResults();
});

// ── Startup ───────────────────────────────────────────────────────────────────
function startup() {
  loadSavedData();

  if (dashboardState.weather) {
    renderDashboard();
    elements.status.classList.remove("error");
    elements.status.textContent = hasExpandedWeatherFields(dashboardState.weather)
      ? "Showing saved weather data. Refreshing…"
      : "Showing older saved data. Refreshing…";
  }

  if (dashboardState.forecast) {
    renderRainFeatures(dashboardState.forecast, dashboardState.weather);
  }

  refreshAll();
}

startup();
