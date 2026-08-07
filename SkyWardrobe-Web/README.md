# SkyWardrobe Web

SkyWardrobe Web is the web-based version of the SkyWardrobe real-time weather advisor. It features a responsive dashboard interface that fetches live weather metrics and maps them to a local SQLite database of clothing items to generate a dynamic "Outfit of the Day".

## Features
* **Live Weather Integration**: Connects to the OpenWeatherMap API to retrieve current conditions (temperature, feels-like temperature, humidity, wind speed, gusts, cloud cover, and precipitation).
* **SQLite Recommendation Engine**: Queries a local SQLite database to select a suitable garment from five categories: Top, Bottom, Outerwear, Footwear, and Accessory.
* **Stylist Descriptions**: Sourced with rich, descriptive fashion copy inspired by e-commerce catalogs (FashionGen-style).
* **Randomized Options**: Selects from matching items at random to ensure variety in recommended outfits.
* **Resilient Fallback Mode**: Serves pre-configured mock weather values and elegant garment placeholders if the external API is offline or key configuration is missing.

## Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) installed on your system.

### 2. Configuration
Create a `.env` file in the root of the `SkyWardrobe-Web/` directory with your OpenWeatherMap credentials:
```env
OPENWEATHER_KEY=your_openweather_api_key
OPENWEATHER_CITY=Melbourne,AU
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Initialize and Seed the Database
Create the SQLite database file (`wardrobe.db`) and seed it with a rich catalog of FashionGen-styled items:
```bash
# Initialize database tables
npm run init-db

# Seed with standard wardrobe items
npm run seed-db
```

### 5. Run the Server
Start the Express server locally:
```bash
npm start
```
Once started, navigate to `http://localhost:3000` in your web browser.

## Scripts
* `npm run build`: Generates the client-side configuration bundle `www/config.js` with your environment variables.
* `npm run init-db`: Creates the `clothing_items` table structure in SQLite.
* `npm run seed-db`: Clears and repopulates the wardrobe database with 25 curated, weather-tagged items.
* `npm test`: Runs static syntax checks on backend, frontend, and build scripts.
