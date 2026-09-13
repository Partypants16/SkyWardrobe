const fs = require("fs");
const path = require("path");
require("dotenv").config();

const wwwDir = path.join(__dirname, "..", "www");
const configPath = path.join(wwwDir, "config.js");

// This app is fully standalone — no backend of its own — so it calls
// OpenWeatherMap directly from the device, which means the key ships inside
// the installed app bundle. That is an inherent tradeoff of a client-only
// mobile app, not an oversight: anyone can unzip the APK and read this file.
// Mitigate by using a key dedicated to this app (not shared with the web
// app or anything else) so a leak stays rate-limited and isolated.
//
// API_BASE_URL is optional: if you ever do point this at a companion
// SkyWardrobe-Web server, requests go through its proxy instead and the key
// below is simply unused.
const config = {
  OPENWEATHER_KEY: process.env.OPENWEATHER_KEY || "",
  OPENWEATHER_CITY: process.env.OPENWEATHER_CITY || "Melbourne,AU",
  API_BASE_URL: process.env.SKYWARDROBE_API_BASE_URL || ""
};

if (!config.OPENWEATHER_KEY && !config.API_BASE_URL) {
  console.warn(
    "WARNING: Neither OPENWEATHER_KEY nor SKYWARDROBE_API_BASE_URL is set. " +
    "Weather, forecast and geocoding will not work until one of them is configured."
  );
}

fs.mkdirSync(wwwDir, { recursive: true });
fs.writeFileSync(
  configPath,
  `window.SKYWARDROBE_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

console.log("Prepared local Capacitor web assets in www.");
