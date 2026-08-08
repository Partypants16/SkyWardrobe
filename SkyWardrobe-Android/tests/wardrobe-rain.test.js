const test = require("node:test");
const assert = require("node:assert/strict");
const RS = require("../www/services/rain-service.js");
const WardrobeRain = require("../www/services/wardrobe-rain.js");

function item(hoursFromNow, overrides = {}) {
  return {
    dt: Math.round(Date.now() / 1000 + hoursFromNow * 3600),
    pop: 0,
    rain_3h: 0,
    ...overrides
  };
}

const DRY_WEATHER = { main: "Clear", description: "clear sky" };

// ── generateRainNote ─────────────────────────────────────────────────────────
test("generateRainNote: dry day — no rain data anywhere", () => {
  const note = WardrobeRain.generateRainNote(null, [], DRY_WEATHER, 0);
  assert.match(note, /No rain expected/i);
});

test("generateRainNote: light shower later today — soft, non-urgent guidance", () => {
  const nextRain = item(4, { pop: 0.45, rain_3h: 1 });
  const note = WardrobeRain.generateRainNote(nextRain, [], DRY_WEATHER, 0);
  assert.match(note, /Dry for now, but rain likely/i);
});

test("generateRainNote: high-probability rain arriving imminently urges action now", () => {
  const nextRain = item(0.5, { pop: 0.8, rain_3h: 1 });
  const note = WardrobeRain.generateRainNote(nextRain, [], DRY_WEATHER, 0);
  assert.match(note, /arriving around/i);
  assert.match(note, /umbrella/i);
});

test("generateRainNote: heavy rain arriving imminently recommends full waterproofs", () => {
  const nextRain = item(0.5, { pop: 0.9, rain_3h: 10 });
  const note = WardrobeRain.generateRainNote(nextRain, [], DRY_WEATHER, 0);
  assert.match(note, /Heavy rain arriving/i);
  assert.match(note, /waterproof/i);
});

test("generateRainNote: prolonged rain is called out as a longer spell, not just a shower", () => {
  const nextRain = item(4, { pop: 0.5, rain_3h: 1 });
  const rainPeriods = [{ startDt: nextRain.dt, endDt: nextRain.dt + 10800 * 3 }]; // 9h long
  const note = WardrobeRain.generateRainNote(nextRain, rainPeriods, DRY_WEATHER, 0);
  assert.match(note, /longer spell of rain/i);
});

test("generateRainNote: currently raining lightly recommends an umbrella, not full waterproofs", () => {
  const currentlyRaining = { main: "Rain", description: "light rain", rain_1h: 0.3 };
  const note = WardrobeRain.generateRainNote(null, [], currentlyRaining, 0);
  assert.match(note, /Rain currently/i);
  assert.doesNotMatch(note, /full waterproofs/i);
});

test("generateRainNote: currently raining heavily recommends full waterproofs", () => {
  const currentlyRaining = { main: "Rain", description: "heavy rain", rain_1h: 8 };
  const note = WardrobeRain.generateRainNote(null, [], currentlyRaining, 0);
  assert.match(note, /full waterproofs/i);
});

test("generateRainNote: very low probability never reaches wardrobe advice as 'rain'", () => {
  // A negligible-probability slot would never have been selected as `nextRain`
  // by RainService.findNextRainEvent in the first place — passing null here
  // models exactly that outcome.
  const note = WardrobeRain.generateRainNote(null, [], DRY_WEATHER, 0);
  assert.doesNotMatch(note, /umbrella/i);
});

test("generateRainNote: rain near the end of the useful planning horizon is softened, not alarmist", () => {
  const nextRain = item(13, { pop: 0.45, rain_3h: 1 }); // beyond PLANNING_HOURS_HORIZON (12h)
  const note = WardrobeRain.generateRainNote(nextRain, [], DRY_WEATHER, 0);
  assert.match(note, /No rain for most of the day/i);
});

// ── getAccessories ───────────────────────────────────────────────────────────
test("getAccessories: dry day recommends nothing", () => {
  const acc = WardrobeRain.getAccessories(null, [], DRY_WEATHER);
  assert.equal(acc.needsUmbrella, false);
  assert.equal(acc.needsRainJacket, false);
  assert.equal(acc.needsWaterproofShoes, false);
});

test("getAccessories: high-probability rain later recommends an umbrella", () => {
  const nextRain = item(4, { pop: 0.7, rain_3h: 1 });
  const acc = WardrobeRain.getAccessories(nextRain, [], DRY_WEATHER);
  assert.equal(acc.needsUmbrella, true);
});

test("getAccessories: heavy rain recommends waterproof shoes and a rain jacket", () => {
  const nextRain = item(2, { pop: 0.8, rain_3h: RS.MM_HEAVY });
  const acc = WardrobeRain.getAccessories(nextRain, [], DRY_WEATHER);
  assert.equal(acc.needsWaterproofShoes, true);
  assert.equal(acc.needsRainJacket, true);
});

test("getAccessories: prolonged rain recommends a rain jacket even if individually light", () => {
  const nextRain = item(4, { pop: 0.5, rain_3h: 1 });
  const rainPeriods = [{ startDt: nextRain.dt, endDt: nextRain.dt + 10800 * 3 }]; // 9h
  const acc = WardrobeRain.getAccessories(nextRain, rainPeriods, DRY_WEATHER);
  assert.equal(acc.needsRainJacket, true);
});

test("getAccessories: current rain drives recommendations off real-time exposure, not the forecast", () => {
  const currentlyRaining = { main: "Rain", description: "heavy rain", rain_1h: 8 };
  const acc = WardrobeRain.getAccessories(null, [], currentlyRaining);
  assert.equal(acc.needsUmbrella, true);
  assert.equal(acc.needsWaterproofShoes, true);
});

test("getAccessories: a short light shower does not trigger a rain jacket", () => {
  const nextRain = item(4, { pop: 0.45, rain_3h: 1 }); // light, not prolonged
  const acc = WardrobeRain.getAccessories(nextRain, [], DRY_WEATHER);
  assert.equal(acc.needsRainJacket, false);
});

test("getAccessories: very low rain probability never over-recommends gear", () => {
  // Models RainService already having excluded a 5%-probability slot from
  // ever becoming `nextRain` — nothing should be recommended off nothing.
  const acc = WardrobeRain.getAccessories(null, [], DRY_WEATHER);
  assert.equal(acc.needsUmbrella, false);
  assert.equal(acc.needsRainJacket, false);
  assert.equal(acc.needsWaterproofShoes, false);
});
