# SkyWardrobe Android

SkyWardrobe Android is a Capacitor-wrapped mobile build of SkyWardrobe. It shares the same weather-to-wardrobe concept and Rain & Radar feature set as [SkyWardrobe-Web](../SkyWardrobe-Web), but runs as a fully standalone WebView bundle with no backend of its own — everything happens on the device.

## Architecture differences from SkyWardrobe-Web

This app has **no Express server and no SQLite database**. Concretely:

* **Weather / forecast / geocoding** are fetched **directly from OpenWeatherMap** using a key baked into the app bundle at build time (see [Security tradeoff](#security-tradeoff-read-this) below). RainViewer (radar) needs no key and is called directly too, same as the web app.
* **Wardrobe recommendations** are picked entirely on-device from the bundled `www/clothing_items.json` (not the web app's SQLite database), so the app has no server dependency of any kind. Rain-aware wardrobe advice (the "Rain Advisory" note, umbrella/jacket/waterproof-shoe chips) layers on top using the same `wardrobe-rain.js` logic as the web app.

An optional `SKYWARDROBE_API_BASE_URL` still exists if you ever *do* want to point this at a companion SkyWardrobe-Web server instead (e.g. for a fleet of devices sharing one server-side key) — when set, requests go through its `/weather`, `/forecast`, `/geocode` proxy instead and the local key is unused. It is not required and most setups should leave it blank.

## Security tradeoff (read this)

A mobile app with no backend cannot hide a secret — anyone can unzip the installed APK and read `www/config.js`. There is no way to fully prevent this for a client-only app; OpenWeatherMap does not offer per-app request signing or package-name restrictions the way some other providers do. To limit the blast radius:

* **Use a key dedicated to this app.** Don't reuse the SkyWardrobe-Web server's key. If the mobile key leaks, it only affects this one key's own (typically free-tier, rate-limited) usage.
* **Expect it to be extractable.** Treat it as effectively public once shipped. Monitor usage on OpenWeatherMap's dashboard and rotate if you see abuse.
* This is a deliberate, informed tradeoff for a fully standalone app — not an oversight.

## Getting Started

### 1. Prerequisites
[Node.js](https://nodejs.org) and an [OpenWeatherMap](https://openweathermap.org/api) API key (ideally a dedicated one for this app — see above).

### 2. Configuration
Create a `.env` file in `SkyWardrobe-Android/`:
```env
OPENWEATHER_KEY=your_dedicated_openweathermap_key
OPENWEATHER_CITY=Melbourne,AU
```

### 3. Install dependencies
```bash
npm install
```

### 4. Build and sync
```bash
npm run cap:sync   # builds www/config.js, then npx cap sync
npm run cap:open   # opens the project in Android Studio
```

## Scripts
* `npm run build`: Generates `www/config.js` from your `.env`.
* `npm run cap:sync`: Build, then sync the web assets into the native Android project.
* `npm run cap:open`: Open the Android project in Android Studio.
* `npm test`: Syntax-checks every JS file, then runs the automated unit test suite (`www/services/*`, `www/components/radar.js`'s frame-processing logic) — the same suite used by SkyWardrobe-Web, since the logic is shared byte-for-byte.

## Provider limitations
Same as the web app:
* OpenWeatherMap forecast is 3-hourly — the UI never claims minute-level precision from it.
* RainViewer nowcast (future) frames are frequently unavailable; the radar degrades gracefully to observed/past frames only.
* No official weather alerts and no UV index — neither is fabricated; both are simply absent.
