const fs = require("fs");
const path = require("path");
require("dotenv").config();

const wwwDir = path.join(__dirname, "..", "www");
const configPath = path.join(wwwDir, "config.js");

const config = {
  OPENWEATHER_KEY: process.env.OPENWEATHER_KEY || "",
  OPENWEATHER_CITY: process.env.OPENWEATHER_CITY || "Melbourne,AU",
  API_BASE_URL: ""
};

fs.mkdirSync(wwwDir, { recursive: true });
fs.writeFileSync(
  configPath,
  `window.SKYWARDROBE_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

console.log("Prepared local Capacitor web assets in www.");
