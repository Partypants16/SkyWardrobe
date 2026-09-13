require("dotenv").config();

const path = require("path");
const express = require("express");
const axios = require("axios");
const app = express();
const { getRecommendedItem } = require("./db");

const OPENWEATHER_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const OPENWEATHER_GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const PORT = process.env.PORT || 3000;
const DEFAULT_CITY = process.env.OPENWEATHER_CITY || "Melbourne,AU";

app.use(express.static(path.join(__dirname, "www")));

function parseWeatherData(data) {
  return {
    coord: {
      lon: data.coord?.lon ?? null,
      lat: data.coord?.lat ?? null
    },
    weather: (data.weather || []).map((item) => ({
      id: item.id ?? null,
      main: item.main ?? null,
      description: item.description ?? null,
      icon: item.icon ?? null
    })),
    base: data.base ?? null,
    temp: data.main?.temp ?? null,
    feels_like: data.main?.feels_like ?? null,
    temp_min: data.main?.temp_min ?? null,
    temp_max: data.main?.temp_max ?? null,
    pressure: data.main?.pressure ?? null,
    humidity: data.main?.humidity ?? null,
    sea_level: data.main?.sea_level ?? null,
    grnd_level: data.main?.grnd_level ?? null,
    visibility: data.visibility ?? null,
    wind_speed: data.wind?.speed ?? null,
    wind_deg: data.wind?.deg ?? null,
    wind_gust: data.wind?.gust ?? null,
    clouds_all: data.clouds?.all ?? null,
    rain_1h: data.rain?.["1h"] ?? null,
    rain_3h: data.rain?.["3h"] ?? null,
    snow_1h: data.snow?.["1h"] ?? null,
    snow_3h: data.snow?.["3h"] ?? null,
    dt: data.dt ?? null,
    sys: {
      type: data.sys?.type ?? null,
      id: data.sys?.id ?? null,
      message: data.sys?.message ?? null,
      country: data.sys?.country ?? null,
      sunrise: data.sys?.sunrise ?? null,
      sunset: data.sys?.sunset ?? null
    },
    timezone: data.timezone ?? null,
    id: data.id ?? null,
    name: data.name ?? null,
    cod: data.cod ?? null,
    main: data.weather?.[0]?.main ?? null,
    description: data.weather?.[0]?.description ?? null,
    icon: data.weather?.[0]?.icon ?? null,
    raw: data
  };
}

function parseForecastData(data) {
  return {
    city: {
      name: data.city?.name ?? null,
      country: data.city?.country ?? null,
      coord: {
        lat: data.city?.coord?.lat ?? null,
        lon: data.city?.coord?.lon ?? null
      },
      timezone: data.city?.timezone ?? null,
      sunrise: data.city?.sunrise ?? null,
      sunset: data.city?.sunset ?? null
    },
    list: (data.list || []).map((item) => ({
      dt: item.dt ?? null,
      dt_txt: item.dt_txt ?? null,
      temp: item.main?.temp ?? null,
      feels_like: item.main?.feels_like ?? null,
      temp_min: item.main?.temp_min ?? null,
      temp_max: item.main?.temp_max ?? null,
      humidity: item.main?.humidity ?? null,
      pressure: item.main?.pressure ?? null,
      weather_id: item.weather?.[0]?.id ?? null,
      weather_main: item.weather?.[0]?.main ?? null,
      weather_desc: item.weather?.[0]?.description ?? null,
      weather_icon: item.weather?.[0]?.icon ?? null,
      wind_speed: item.wind?.speed ?? null,
      wind_deg: item.wind?.deg ?? null,
      wind_gust: item.wind?.gust ?? null,
      clouds: item.clouds?.all ?? null,
      pop: item.pop ?? 0,
      rain_3h: item.rain?.["3h"] ?? 0,
      snow_3h: item.snow?.["3h"] ?? 0,
      visibility: item.visibility ?? null,
      pod: item.sys?.pod ?? null
    }))
  };
}

async function generateOutfit(weatherData) {
  const temp = weatherData.temp ?? 15;
  const description = (weatherData.description || "").toLowerCase();
  const mainCondition = (weatherData.main || "").toLowerCase();

  const raining = description.includes("rain") ||
                  description.includes("drizzle") ||
                  description.includes("shower") ||
                  description.includes("storm") ||
                  description.includes("thunder") ||
                  mainCondition.includes("rain") ||
                  mainCondition.includes("drizzle") ||
                  mainCondition.includes("thunderstorm");

  const windy = (weatherData.wind_speed ?? 0) > 8;
  const humid = (weatherData.humidity ?? 0) > 70;

  const categories = ["top", "bottom", "outerwear", "footwear", "accessory"];
  const outfit = {};

  for (const category of categories) {
    try {
      const item = await getRecommendedItem(category, temp, raining, windy, humid);
      if (item) {
        outfit[category] = {
          name: item.name,
          description: item.description || "No description provided."
        };
      } else {
        outfit[category] = {
          name: `No suitable ${category}`,
          description: "Populate your database with matching items to see recommendations."
        };
      }
    } catch (err) {
      console.error(`Database query failed for ${category}:`, err.message);
      outfit[category] = {
        name: `Default ${category}`,
        description: "Failed to load item from database."
      };
    }
  }

  return outfit;
}

// ── /weather ──────────────────────────────────────────────────────────────────
app.get("/weather", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    if (!process.env.OPENWEATHER_KEY) {
      throw new Error("OPENWEATHER_KEY environment variable is not defined");
    }

    const params = {
      appid: process.env.OPENWEATHER_KEY,
      units: "metric"
    };

    if (req.query.lat && req.query.lon) {
      params.lat = req.query.lat;
      params.lon = req.query.lon;
    } else {
      params.q = req.query.q || DEFAULT_CITY;
    }

    const response = await axios.get(OPENWEATHER_WEATHER_URL, { params });
    const weatherData = parseWeatherData(response.data);
    const outfit = await generateOutfit(weatherData);

    res.json({ ...weatherData, outfit });
  } catch (err) {
    console.error("Weather fetch failed, returning fallback placeholder data:", err.message);
    const weatherData = {
      coord: { lon: 144.9633, lat: -37.814 },
      weather: [{ id: 800, main: "Clear", description: "clear sky (fallback data)", icon: "01d" }],
      temp: 15.0,
      feels_like: 14.5,
      temp_min: 13.0,
      temp_max: 17.0,
      pressure: 1012,
      humidity: 62,
      wind_speed: 4.1,
      name: "Melbourne (fallback)",
      cod: 200,
      main: "Clear",
      description: "clear sky (fallback data)",
      icon: "01d"
    };

    const outfit = await generateOutfit(weatherData);
    // `mock: true` tells the client this is NOT live data, so it can be shown
    // honestly rather than presented as a real current reading.
    res.json({ ...weatherData, outfit, mock: true });
  }
});

// ── /forecast ─────────────────────────────────────────────────────────────────
app.get("/forecast", async (req, res) => {
  try {
    res.set("Cache-Control", "max-age=600"); // Cache 10 minutes

    if (!process.env.OPENWEATHER_KEY) {
      throw new Error("OPENWEATHER_KEY environment variable is not defined");
    }

    const params = {
      appid: process.env.OPENWEATHER_KEY,
      units: "metric",
      cnt: 40
    };

    if (req.query.lat && req.query.lon) {
      params.lat = req.query.lat;
      params.lon = req.query.lon;
    } else {
      params.q = req.query.q || DEFAULT_CITY;
    }

    const response = await axios.get(OPENWEATHER_FORECAST_URL, { params });
    res.json(parseForecastData(response.data));
  } catch (err) {
    console.error("Forecast fetch failed:", err.message);
    res.status(500).json({ error: err.message, list: [], city: null });
  }
});

// ── /geocode ──────────────────────────────────────────────────────────────────
app.get("/geocode", async (req, res) => {
  try {
    if (!req.query.q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    if (!process.env.OPENWEATHER_KEY) {
      throw new Error("OPENWEATHER_KEY environment variable is not defined");
    }

    const response = await axios.get(OPENWEATHER_GEO_URL, {
      params: {
        q: req.query.q,
        limit: 5,
        appid: process.env.OPENWEATHER_KEY
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error("Geocode fetch failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health / Up ───────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/up", (req, res) => res.status(200).send("OK"));

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
