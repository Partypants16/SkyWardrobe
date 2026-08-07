const dashboardState = {
  weather: null,
  lastUpdated: null
};

const elements = {
  refreshButton: document.getElementById("refreshButton"),
  location: document.getElementById("location"),
  temperature: document.getElementById("temperature"),
  feelsLike: document.getElementById("feelsLike"),
  description: document.getElementById("description"),
  weatherIcon: document.getElementById("weatherIcon"),
  tempRange: document.getElementById("tempRange"),
  updatedAt: document.getElementById("updatedAt"),
  humidity: document.getElementById("humidity"),
  windSpeed: document.getElementById("windSpeed"),
  windDirection: document.getElementById("windDirection"),
  windGust: document.getElementById("windGust"),
  condition: document.getElementById("condition"),
  clouds: document.getElementById("clouds"),
  pressure: document.getElementById("pressure"),
  pressureLevels: document.getElementById("pressureLevels"),
  visibility: document.getElementById("visibility"),
  rain: document.getElementById("rain"),
  snow: document.getElementById("snow"),
  coordinates: document.getElementById("coordinates"),
  country: document.getElementById("country"),
  sunrise: document.getElementById("sunrise"),
  sunset: document.getElementById("sunset"),
  timezone: document.getElementById("timezone"),
  cityId: document.getElementById("cityId"),
  stationType: document.getElementById("stationType"),
  base: document.getElementById("base"),
  outfitTop: document.getElementById("outfitTop"),
  outfitTopDesc: document.getElementById("outfitTopDesc"),
  outfitBottom: document.getElementById("outfitBottom"),
  outfitBottomDesc: document.getElementById("outfitBottomDesc"),
  outfitOuterwear: document.getElementById("outfitOuterwear"),
  outfitOuterwearDesc: document.getElementById("outfitOuterwearDesc"),
  outfitFootwear: document.getElementById("outfitFootwear"),
  outfitFootwearDesc: document.getElementById("outfitFootwearDesc"),
  outfitAccessory: document.getElementById("outfitAccessory"),
  outfitAccessoryDesc: document.getElementById("outfitAccessoryDesc"),
  status: document.getElementById("status"),
  lastUpdated: document.getElementById("lastUpdated")
};

function formatTemperature(value) {
  return Number.isFinite(value) ? `${Math.round(value)}\u00B0C` : "--";
}

function formatHumidity(value) {
  return Number.isFinite(value) ? `${value}%` : "--";
}

function formatWindSpeed(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} m/s` : "--";
}

function formatPressure(value) {
  return Number.isFinite(value) ? `${value} hPa` : "--";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value}%` : "--";
}

function formatVisibility(value) {
  return Number.isFinite(value) ? `${(value / 1000).toFixed(1)} km` : "--";
}

function formatPrecipitation(oneHour, threeHour) {
  if (Number.isFinite(oneHour)) {
    return `${oneHour.toFixed(1)} mm/h`;
  }

  if (Number.isFinite(threeHour)) {
    return `${threeHour.toFixed(1)} mm/3h`;
  }

  return "0 mm";
}

function formatCoordinate(value, suffix) {
  return Number.isFinite(value) ? `${Math.abs(value).toFixed(2)}${suffix}` : "--";
}

function formatDirection(degrees) {
  if (!Number.isFinite(degrees)) {
    return "Direction --";
  }

  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % labels.length;
  return `${labels[index]} ${degrees}\u00B0`;
}

function formatTimezone(seconds) {
  if (!Number.isFinite(seconds)) {
    return "--";
  }

  const sign = seconds >= 0 ? "+" : "-";
  const absolute = Math.abs(seconds);
  const hours = String(Math.floor(absolute / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((absolute % 3600) / 60)).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

function formatWeatherTime(timestamp, timezoneOffset = 0) {
  if (!Number.isFinite(timestamp)) {
    return "--";
  }

  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  });
}

function formatMeasurementTime(timestamp, timezoneOffset = 0) {
  if (!Number.isFinite(timestamp)) {
    return "Measured --";
  }

  const date = new Date((timestamp + timezoneOffset) * 1000);
  return `Measured ${date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  })}`;
}

function formatDescription(value) {
  return value || "No condition available";
}

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

function getAppConfig() {
  return window.SKYWARDROBE_CONFIG || {};
}

function buildWeatherApiUrl() {
  const config = getAppConfig();
  const city = config.OPENWEATHER_CITY || "Melbourne,AU";

  if (!config.OPENWEATHER_KEY) {
    throw new Error("Missing OpenWeather key. Run npm run build to generate the configuration.");
  }

  const url = new URL(OPENWEATHER_URL);
  url.searchParams.set("q", city);
  url.searchParams.set("appid", config.OPENWEATHER_KEY);
  url.searchParams.set("units", "metric");
  return url.toString();
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather service returned ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.cod && Number(data.cod) >= 400) {
    throw new Error(data.message || "Weather fetch failed");
  }

  return data;
}

async function fetchWeatherData() {
  const config = getAppConfig();
  const apiBaseUrl = (config.API_BASE_URL || "").replace(/\/$/, "");
  const isHttpPage = window.location.protocol === "http:" || window.location.protocol === "https:";

  if (apiBaseUrl) {
    return fetchJson(`${apiBaseUrl}/weather`);
  }

  if (isHttpPage) {
    try {
      return await fetchJson("/weather");
    } catch (error) {
      if (!config.OPENWEATHER_KEY) {
        throw error;
      }
    }
  }

  return fetchJson(buildWeatherApiUrl());
}

function firstWeatherItem(data) {
  return Array.isArray(data.weather) ? data.weather[0] : null;
}

function numericValue(...values) {
  const value = values.find((item) => item !== null && item !== undefined && item !== "");
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function textValue(...values) {
  const value = values.find((item) => item !== null && item !== undefined && item !== "");
  return value === undefined ? null : String(value);
}

function normalizeWeatherData(data) {
  const raw = data.raw || data;
  const condition = firstWeatherItem(data) || firstWeatherItem(raw) || {};
  const main = raw.main && typeof raw.main === "object" ? raw.main : {};
  const wind = raw.wind && typeof raw.wind === "object" ? raw.wind : {};
  const clouds = raw.clouds && typeof raw.clouds === "object" ? raw.clouds : {};
  const rain = raw.rain && typeof raw.rain === "object" ? raw.rain : {};
  const snow = raw.snow && typeof raw.snow === "object" ? raw.snow : {};
  const sys = raw.sys && typeof raw.sys === "object" ? raw.sys : {};
  const coord = raw.coord && typeof raw.coord === "object" ? raw.coord : {};

  return {
    coord: {
      lon: numericValue(data.coord?.lon, coord.lon),
      lat: numericValue(data.coord?.lat, coord.lat)
    },
    weather: Array.isArray(data.weather) ? data.weather : Array.isArray(raw.weather) ? raw.weather : [],
    base: textValue(data.base, raw.base),
    temp: numericValue(data.temp, main.temp),
    feels_like: numericValue(data.feels_like, main.feels_like),
    temp_min: numericValue(data.temp_min, main.temp_min),
    temp_max: numericValue(data.temp_max, main.temp_max),
    pressure: numericValue(data.pressure, main.pressure),
    humidity: numericValue(data.humidity, main.humidity),
    sea_level: numericValue(data.sea_level, main.sea_level),
    grnd_level: numericValue(data.grnd_level, main.grnd_level),
    visibility: numericValue(data.visibility, raw.visibility),
    wind_speed: numericValue(data.wind_speed, wind.speed),
    wind_deg: numericValue(data.wind_deg, wind.deg),
    wind_gust: numericValue(data.wind_gust, wind.gust),
    clouds_all: numericValue(data.clouds_all, clouds.all),
    rain_1h: numericValue(data.rain_1h, rain["1h"]),
    rain_3h: numericValue(data.rain_3h, rain["3h"]),
    snow_1h: numericValue(data.snow_1h, snow["1h"]),
    snow_3h: numericValue(data.snow_3h, snow["3h"]),
    dt: numericValue(data.dt, raw.dt),
    sys: {
      type: numericValue(data.sys?.type, sys.type),
      id: numericValue(data.sys?.id, sys.id),
      message: textValue(data.sys?.message, sys.message),
      country: textValue(data.sys?.country, sys.country),
      sunrise: numericValue(data.sys?.sunrise, sys.sunrise),
      sunset: numericValue(data.sys?.sunset, sys.sunset)
    },
    timezone: numericValue(data.timezone, raw.timezone),
    id: numericValue(data.id, raw.id),
    name: textValue(data.name, raw.name),
    cod: numericValue(data.cod, raw.cod),
    main: textValue(data.main, condition.main),
    description: textValue(data.description, condition.description),
    icon: textValue(data.icon, condition.icon),
    outfit: data.outfit || raw.outfit || null
  };
}

function hasExpandedWeatherFields(weather) {
  return Boolean(
    Number.isFinite(weather.coord?.lat)
    || Number.isFinite(weather.coord?.lon)
    || Number.isFinite(weather.pressure)
    || Number.isFinite(weather.visibility)
    || Number.isFinite(weather.clouds_all)
    || Number.isFinite(weather.dt)
  );
}

// Client-side scoring and recommendation profiles removed in favor of server-side SQLite backend.

function saveWeatherData(data) {
  dashboardState.weather = normalizeWeatherData(data);
  dashboardState.lastUpdated = new Date();
  localStorage.setItem("skyWardrobeWeather", JSON.stringify({
    data: dashboardState.weather,
    lastUpdated: dashboardState.lastUpdated.toISOString()
  }));
}

function loadSavedWeatherData() {
  const saved = localStorage.getItem("skyWardrobeWeather");

  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    dashboardState.weather = normalizeWeatherData(parsed.data);
    dashboardState.lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : null;
    renderDashboard();
    elements.status.classList.remove("error");
    elements.status.textContent = hasExpandedWeatherFields(dashboardState.weather)
      ? "Showing saved weather data."
      : "Showing older saved weather data. Refresh to load the expanded dashboard fields.";
  } catch (error) {
    localStorage.removeItem("skyWardrobeWeather");
  }
}

function renderDashboard() {
  const weather = dashboardState.weather ? normalizeWeatherData(dashboardState.weather) : null;

  if (!weather) {
    return;
  }

  dashboardState.weather = weather;

  // Apply dynamic weather-driven body themes
  document.body.className = "";
  const isNight = weather.dt && weather.sys?.sunrise && weather.sys?.sunset &&
                  (weather.dt < weather.sys.sunrise || weather.dt > weather.sys.sunset);

  if (isNight) {
    document.body.classList.add("theme-night");
  } else {
    const mainWeather = (weather.main || "").toLowerCase();
    if (mainWeather.includes("clear")) {
      document.body.classList.add("theme-clear");
    } else if (mainWeather.includes("cloud")) {
      document.body.classList.add("theme-clouds");
    } else if (mainWeather.includes("rain") || mainWeather.includes("drizzle") || mainWeather.includes("thunderstorm")) {
      document.body.classList.add("theme-rain");
    } else if (mainWeather.includes("snow")) {
      document.body.classList.add("theme-snow");
    } else {
      document.body.classList.add("theme-clouds");
    }
  }
  const iconUrl = weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : "";
  const lon = weather.coord?.lon;
  const lat = weather.coord?.lat;
  const country = weather.sys?.country;
  const locationParts = [weather.name, country].filter(Boolean);

  elements.location.textContent = locationParts.length
    ? `${locationParts.join(", ")} weather translated into what to wear now.`
    : "Weather translated into what to wear now.";
  elements.temperature.textContent = formatTemperature(weather.temp);
  elements.feelsLike.textContent = `Feels like ${formatTemperature(weather.feels_like)}`;
  elements.description.textContent = formatDescription(weather.description);
  elements.tempRange.textContent = `Range ${formatTemperature(weather.temp_min)} to ${formatTemperature(weather.temp_max)}`;
  elements.updatedAt.textContent = formatMeasurementTime(weather.dt, weather.timezone);
  elements.humidity.textContent = formatHumidity(weather.humidity);
  elements.windSpeed.textContent = formatWindSpeed(weather.wind_speed);
  elements.windDirection.textContent = formatDirection(weather.wind_deg);
  elements.windGust.textContent = formatWindSpeed(weather.wind_gust);
  elements.condition.textContent = weather.main || formatDescription(weather.description);
  elements.clouds.textContent = formatPercent(weather.clouds_all);
  elements.pressure.textContent = formatPressure(weather.pressure);
  elements.pressureLevels.textContent = `Sea ${formatPressure(weather.sea_level)} / ground ${formatPressure(weather.grnd_level)}`;
  elements.visibility.textContent = formatVisibility(weather.visibility);
  elements.rain.textContent = formatPrecipitation(weather.rain_1h, weather.rain_3h);
  elements.snow.textContent = formatPrecipitation(weather.snow_1h, weather.snow_3h);
  elements.coordinates.textContent = Number.isFinite(lat) && Number.isFinite(lon)
    ? `${formatCoordinate(lat, lat >= 0 ? "N" : "S")}, ${formatCoordinate(lon, lon >= 0 ? "E" : "W")}`
    : "--";
  elements.country.textContent = country || "--";
  elements.sunrise.textContent = formatWeatherTime(weather.sys?.sunrise, weather.timezone);
  elements.sunset.textContent = formatWeatherTime(weather.sys?.sunset, weather.timezone);
  elements.timezone.textContent = formatTimezone(weather.timezone);
  elements.cityId.textContent = weather.id ?? "--";
  elements.stationType.textContent = weather.sys?.type ?? "--";
  elements.base.textContent = weather.base || "--";

  const outfit = weather.outfit || {};
  const renderItem = (category, elementsName, elementsDesc) => {
    const item = outfit[category] || {};
    elementsName.textContent = item.name || `No suitable ${category}`;
    elementsDesc.textContent = item.description || "Populate database with matching items.";
  };

  renderItem("top", elements.outfitTop, elements.outfitTopDesc);
  renderItem("bottom", elements.outfitBottom, elements.outfitBottomDesc);
  renderItem("outerwear", elements.outfitOuterwear, elements.outfitOuterwearDesc);
  renderItem("footwear", elements.outfitFootwear, elements.outfitFootwearDesc);
  renderItem("accessory", elements.outfitAccessory, elements.outfitAccessoryDesc);

  if (iconUrl) {
    elements.weatherIcon.src = iconUrl;
    elements.weatherIcon.alt = `${formatDescription(weather.description)} icon`;
    elements.weatherIcon.hidden = false;
  } else {
    elements.weatherIcon.hidden = true;
  }

  elements.lastUpdated.textContent = dashboardState.lastUpdated
    ? `Last refreshed: ${dashboardState.lastUpdated.toLocaleString()}`
    : "Last refreshed: --";
}

function renderError(message) {
  elements.status.textContent = message;
  elements.status.classList.add("error");
  elements.location.textContent = "Weather translated into what to wear now.";
  elements.temperature.textContent = "--";
  elements.feelsLike.textContent = "Feels like --";
  elements.description.textContent = "Weather unavailable";
  elements.tempRange.textContent = "Range --";
  elements.updatedAt.textContent = "Measured --";
  elements.humidity.textContent = "--";
  elements.windSpeed.textContent = "--";
  elements.windDirection.textContent = "Direction --";
  elements.windGust.textContent = "--";
  elements.condition.textContent = "--";
  elements.clouds.textContent = "--";
  elements.pressure.textContent = "--";
  elements.pressureLevels.textContent = "Sea / ground --";
  elements.visibility.textContent = "--";
  elements.rain.textContent = "--";
  elements.snow.textContent = "--";
  elements.coordinates.textContent = "--";
  elements.country.textContent = "--";
  elements.sunrise.textContent = "--";
  elements.sunset.textContent = "--";
  elements.timezone.textContent = "--";
  elements.cityId.textContent = "--";
  elements.stationType.textContent = "--";
  elements.base.textContent = "--";
  const clearItem = (elementsName, elementsDesc) => {
    elementsName.textContent = "--";
    elementsDesc.textContent = "";
  };
  clearItem(elements.outfitTop, elements.outfitTopDesc);
  clearItem(elements.outfitBottom, elements.outfitBottomDesc);
  clearItem(elements.outfitOuterwear, elements.outfitOuterwearDesc);
  clearItem(elements.outfitFootwear, elements.outfitFootwearDesc);
  clearItem(elements.outfitAccessory, elements.outfitAccessoryDesc);
  elements.weatherIcon.hidden = true;
}

async function refreshWeather() {
  elements.refreshButton.disabled = true;
  elements.status.classList.remove("error");
  elements.status.textContent = "Refreshing weather data...";

  try {
    const data = await fetchWeatherData();
    saveWeatherData(data);
    renderDashboard();
    elements.status.classList.remove("error");
    elements.status.textContent = hasExpandedWeatherFields(dashboardState.weather)
      ? "Dashboard refreshed with the latest expanded weather data."
      : "Refresh worked, but the server is still returning the older compact weather data. Restart the local server to load the new fields.";
  } catch (error) {
    renderError(error.message || "Weather fetch failed");
  } finally {
    elements.refreshButton.disabled = false;
  }
}

elements.refreshButton.addEventListener("click", refreshWeather);
loadSavedWeatherData();
refreshWeather();
