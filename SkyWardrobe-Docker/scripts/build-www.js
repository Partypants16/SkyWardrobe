const fs = require("fs");
const path = require("path");
require("dotenv").config();

const wwwDir = path.join(__dirname, "..", "www");
const configPath = path.join(wwwDir, "config.js");

// NOTE: OPENWEATHER_KEY must never be written here — it is a secret and is
// only ever used server-side (see logic.js). The browser talks to our own
// /weather, /forecast and /geocode proxy endpoints, which attach the key.
const config = {
  OPENWEATHER_CITY: process.env.OPENWEATHER_CITY || "Melbourne,AU",
  API_BASE_URL: process.env.SKYWARDROBE_API_BASE_URL || ""
};

fs.mkdirSync(wwwDir, { recursive: true });
fs.writeFileSync(
  configPath,
  `window.SKYWARDROBE_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

console.log("Prepared web assets in www.");
