require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express(); 

app.get("/weather", async (req, res) => {
  try {
    const url = "https://api.openweathermap.org/data/2.5/weather";
    const params = {
      q: "Melbourne,AU",
      appid: process.env.OPENWEATHER_KEY,
      units: "metric"
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    // Parse the JSON
    const parsed = {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      wind_speed: data.wind.speed
    };

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
