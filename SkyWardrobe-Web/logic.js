require("dotenv").config();

const path = require("path");
const express = require("express");
const axios = require("axios");
const app = express();
const { getRecommendedItem } = require("./db");

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const CITY = "Melbourne,AU";
const PORT = process.env.PORT || 3000;

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

app.get("/weather", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    if (!process.env.OPENWEATHER_KEY) {
      throw new Error("OPENWEATHER_KEY environment variable is not defined");
    }

    const response = await axios.get(OPENWEATHER_URL, {
      params: {
        q: CITY,
        appid: process.env.OPENWEATHER_KEY,
        units: "metric"
      }
    });

    const weatherData = parseWeatherData(response.data);
    const outfit = await generateOutfit(weatherData);

    res.json({
      ...weatherData,
      outfit
    });
  } catch (err) {
    console.error("Weather fetch failed, returning mock data:", err.message);
    const weatherData = {
      coord: { lon: 144.9633, lat: -37.814 },
      weather: [{ id: 800, main: "Clear", description: "clear sky (mock)", icon: "01d" }],
      temp: 15.0,
      feels_like: 14.5,
      temp_min: 13.0,
      temp_max: 17.0,
      pressure: 1012,
      humidity: 62,
      wind_speed: 4.1,
      name: "Melbourne (Mock)",
      cod: 200,
      main: "Clear",
      description: "clear sky (mock)",
      icon: "01d"
    };
    
    const outfit = await generateOutfit(weatherData);
    
    res.json({
      ...weatherData,
      outfit
    });
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/up", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
