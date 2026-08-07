const test = require("node:test");
const assert = require("node:assert/strict");
const RS = require("../www/services/rain-service.js");

// Helper: build a forecast item `hoursFromNow` hours away from "now".
function item(hoursFromNow, overrides = {}) {
  return {
    dt: Math.round(Date.now() / 1000 + hoursFromNow * 3600),
    pop: 0,
    rain_3h: 0,
    temp: 20,
    feels_like: 20,
    wind_speed: 2,
    weather_main: "Clear",
    pod: "d",
    ...overrides
  };
}

// ── getRainIntensity ─────────────────────────────────────────────────────────
test("getRainIntensity: none for zero/undefined/null rainfall", () => {
  assert.equal(RS.getRainIntensity(0), "none");
  assert.equal(RS.getRainIntensity(undefined), "none");
  assert.equal(RS.getRainIntensity(null), "none");
});

test("getRainIntensity: light/moderate/heavy/severe boundaries", () => {
  assert.equal(RS.getRainIntensity(0.1), "light");
  assert.equal(RS.getRainIntensity(RS.MM_LIGHT - 0.01), "light");
  assert.equal(RS.getRainIntensity(RS.MM_LIGHT), "moderate");
  assert.equal(RS.getRainIntensity(RS.MM_MODERATE - 0.01), "moderate");
  assert.equal(RS.getRainIntensity(RS.MM_MODERATE), "heavy");
  assert.equal(RS.getRainIntensity(RS.MM_HEAVY - 0.01), "heavy");
  assert.equal(RS.getRainIntensity(RS.MM_HEAVY), "severe");
  assert.equal(RS.getRainIntensity(50), "severe");
});

// ── isRainLikely ─────────────────────────────────────────────────────────────
test("isRainLikely: high probability alone is enough", () => {
  assert.equal(RS.isRainLikely({ pop: RS.RAIN_PROB_THRESHOLD, rain_3h: 0 }), true);
});

test("isRainLikely: low probability with negligible rainfall is not rain-likely", () => {
  // A 90% chance of a totally negligible amount should not count as "rain"
  // for the headline features — probability alone doesn't override amount.
  assert.equal(RS.isRainLikely({ pop: 0.05, rain_3h: 0 }), false);
});

test("isRainLikely: moderate probability + meaningful amount counts", () => {
  assert.equal(RS.isRainLikely({ pop: 0.25, rain_3h: 1 }), true);
});

test("isRainLikely: handles missing pop/rain_3h fields without throwing", () => {
  assert.equal(RS.isRainLikely({}), false);
  assert.equal(RS.isRainLikely(null), false);
  assert.equal(RS.isRainLikely(undefined), false);
});

// ── isCurrentlyRaining ───────────────────────────────────────────────────────
test("isCurrentlyRaining: true when main/description mention rain", () => {
  assert.equal(RS.isCurrentlyRaining({ main: "Rain", description: "light rain" }), true);
  assert.equal(RS.isCurrentlyRaining({ main: "Thunderstorm", description: "storm" }), true);
  assert.equal(RS.isCurrentlyRaining({ main: "Clouds", description: "overcast clouds" }), false);
});

test("isCurrentlyRaining: true when rain_1h is positive even with a dry description", () => {
  assert.equal(RS.isCurrentlyRaining({ main: "Clouds", description: "overcast clouds", rain_1h: 0.4 }), true);
});

test("isCurrentlyRaining: false for null/undefined current weather", () => {
  assert.equal(RS.isCurrentlyRaining(null), false);
  assert.equal(RS.isCurrentlyRaining(undefined), false);
});

// ── findNextRainEvent ────────────────────────────────────────────────────────
test("findNextRainEvent: finds the next rain-likely slot", () => {
  const list = [item(0, { pop: 0.1 }), item(3, { pop: 0.1 }), item(6, { pop: 0.8, rain_3h: 2 }), item(9, { pop: 0.9, rain_3h: 4 })];
  const found = RS.findNextRainEvent(list);
  assert.ok(found);
  assert.equal(found.pop, 0.8);
});

test("findNextRainEvent: returns null when nothing is rain-likely", () => {
  const list = [item(0, { pop: 0.05 }), item(3, { pop: 0.1 }), item(6, { pop: 0 })];
  assert.equal(RS.findNextRainEvent(list), null);
});

test("findNextRainEvent: a very low probability slot is not treated as a rain event", () => {
  const list = [item(3, { pop: 0.05, rain_3h: 0 })];
  assert.equal(RS.findNextRainEvent(list), null);
});

test("findNextRainEvent: high probability but negligible rainfall is still evaluated on probability alone", () => {
  const list = [item(3, { pop: 0.9, rain_3h: 0.1 })];
  // 90% probability alone clears RAIN_PROB_THRESHOLD regardless of amount —
  // likelihood and intensity are independent concerns.
  assert.ok(RS.findNextRainEvent(list));
});

test("findNextRainEvent: missing pop/rain_3h fields are treated as no rain, not a crash", () => {
  const list = [{ dt: Math.round(Date.now() / 1000 + 3600) }];
  assert.equal(RS.findNextRainEvent(list), null);
});

test("findNextRainEvent: ignores rain beyond the 24h forecast horizon", () => {
  // A realistic 3-hourly list running out to ~39h, with the only rain-likely
  // slot sitting well past FORECAST_HORIZON_SLOTS (8 x 3h = 24h). It must not
  // surface as "next rain" — the rest of the UI (graph/hourly/insights) only
  // ever looks 24h ahead, so this keeps every section consistent.
  const list = Array.from({ length: 14 }, (_, i) =>
    item(i * 3, i === 13 ? { pop: 0.9, rain_3h: 5 } : { pop: 0.05, rain_3h: 0 }));
  assert.equal(RS.findNextRainEvent(list), null);
});

test("findNextRainEvent: ignores past items", () => {
  const list = [item(-3, { pop: 0.9, rain_3h: 5 }), item(3, { pop: 0.1 })];
  assert.equal(RS.findNextRainEvent(list), null);
});

// ── groupRainPeriods ─────────────────────────────────────────────────────────
test("groupRainPeriods: groups one continuous run of rainy slots into a single event", () => {
  const list = [item(3, { pop: 0.8, rain_3h: 2 }), item(6, { pop: 0.7, rain_3h: 3 }), item(9, { pop: 0.6, rain_3h: 1 })];
  const periods = RS.groupRainPeriods(list);
  assert.equal(periods.length, 1);
  assert.equal(periods[0].items.length, 3);
});

test("groupRainPeriods: splits into multiple events across a real dry gap", () => {
  const list = [
    item(3,  { pop: 0.8, rain_3h: 2 }),
    item(6,  { pop: 0.1, rain_3h: 0 }),
    item(9,  { pop: 0.1, rain_3h: 0 }),
    item(12, { pop: 0.7, rain_3h: 1 })
  ];
  const periods = RS.groupRainPeriods(list);
  assert.equal(periods.length, 2);
});

test("groupRainPeriods: a single-slot dry gap still merges into one event", () => {
  const list = [
    item(3, { pop: 0.8, rain_3h: 2 }),
    item(6, { pop: 0.1, rain_3h: 0 }), // one dry slot within gap tolerance
    item(9, { pop: 0.7, rain_3h: 1 })
  ];
  const periods = RS.groupRainPeriods(list);
  assert.equal(periods.length, 1);
});

test("groupRainPeriods: a single rainy interval produces one event", () => {
  const periods = RS.groupRainPeriods([item(3, { pop: 0.9, rain_3h: 5 })]);
  assert.equal(periods.length, 1);
  assert.equal(periods[0].startDt, periods[0].items[0].dt);
});

test("groupRainPeriods: an event right at the end of the forecast list is still closed out", () => {
  const list = [item(0, { pop: 0.1 }), item(21, { pop: 0.8, rain_3h: 2 })];
  const periods = RS.groupRainPeriods(list);
  assert.equal(periods.length, 1);
  assert.equal(periods[0].endDt, list[1].dt + 10800);
});

test("groupRainPeriods: no rain anywhere returns an empty list", () => {
  const list = [item(3, { pop: 0 }), item(6, { pop: 0.1 })];
  assert.deepEqual(RS.groupRainPeriods(list), []);
});

test("groupRainPeriods: empty/invalid input never throws", () => {
  assert.deepEqual(RS.groupRainPeriods([]), []);
  assert.deepEqual(RS.groupRainPeriods(null), []);
});

// ── generateSummaryText ──────────────────────────────────────────────────────
test("generateSummaryText: currently raining takes priority over the forecast", () => {
  const text = RS.generateSummaryText(null, { main: "Rain", description: "light rain", rain_1h: 0.5 }, 0);
  assert.match(text, /currently occurring/);
});

test("generateSummaryText: no rain expected", () => {
  const text = RS.generateSummaryText(null, { main: "Clear", description: "clear sky" }, 0);
  assert.equal(text, "No meaningful rain expected in the next 24 hours.");
});

test("generateSummaryText: never claims minute-level precision (3-hourly data can't support it)", () => {
  const nextRain = item(0.5, { pop: 0.9, rain_3h: 2 });
  const text = RS.generateSummaryText(nextRain, { main: "Clear", description: "clear" }, 0);
  assert.doesNotMatch(text, /minutes/i);
  assert.match(text, /soon/i);
});

test("generateSummaryText: rain further out is described by clock time, not a countdown", () => {
  const nextRain = item(5, { pop: 0.9, rain_3h: 2 });
  const text = RS.generateSummaryText(nextRain, { main: "Clear", description: "clear" }, 0);
  assert.doesNotMatch(text, /minutes/i);
  assert.match(text, /becomes likely around/i);
});

// ── generateInsights ─────────────────────────────────────────────────────────
test("generateInsights: highlights the heaviest rain slot when it's meaningful", () => {
  const list = [
    item(3, { pop: 0.8, rain_3h: RS.MM_MODERATE + 1 }),
    item(6, { pop: 0.3, rain_3h: 0.5 })
  ];
  const insights = RS.generateInsights(list, { main: "Clear", description: "clear" }, 0);
  assert.ok(insights.some((i) => /rain expected around/i.test(i)));
});

test("generateInsights: all-clear message when nothing rainy is forecast", () => {
  const list = Array.from({ length: 8 }, (_, i) => item(i * 3, { pop: 0, rain_3h: 0 }));
  const insights = RS.generateInsights(list, { main: "Clear", description: "clear" }, 0);
  assert.ok(insights.some((i) => /no rain expected/i.test(i)));
});

test("generateInsights: never returns more than 5 insights", () => {
  const list = [
    item(3,  { pop: 0.9, rain_3h: RS.MM_HEAVY + 1 }),
    item(6,  { pop: 0.1, rain_3h: 0 }),
    item(9,  { wind_speed: 15 }),
    item(12, { wind_speed: 15 }),
    item(15, { temp: 5 }),
    item(18, { pop: 0.9, rain_3h: 3 }),
    item(21, { pop: 0.1 })
  ];
  const insights = RS.generateInsights(list, { main: "Clear", description: "clear" }, 0);
  assert.ok(insights.length <= 5);
});

// ── findBestOutdoorWindow ────────────────────────────────────────────────────
test("findBestOutdoorWindow: finds a good window when conditions allow", () => {
  const list = Array.from({ length: 8 }, (_, i) =>
    item(i * 3, { pop: 0.05, temp: 20, wind_speed: 3, pod: "d" }));
  const win = RS.findBestOutdoorWindow(list, 0);
  assert.ok(win);
  assert.ok(win.durationH >= 6);
});

test("findBestOutdoorWindow: returns null when conditions are poor throughout", () => {
  const list = Array.from({ length: 8 }, (_, i) =>
    item(i * 3, { pop: 0.9, rain_3h: 5, temp: 20, wind_speed: 3, pod: "d" }));
  assert.equal(RS.findBestOutdoorWindow(list, 0), null);
});

test("findBestOutdoorWindow: a single qualifying slot below OUTDOOR_MIN_SLOTS does not count", () => {
  const list = [
    item(0, { pop: 0.05, temp: 20, wind_speed: 3, pod: "d" }),
    item(3, { pop: 0.9,  temp: 20, wind_speed: 3, pod: "d" })
  ];
  assert.equal(RS.findBestOutdoorWindow(list, 0), null);
});

// ── Time formatting / timezone / day-boundary ────────────────────────────────
test("formatDateTime: no weekday prefix for a time later today", () => {
  const laterToday = Date.now() / 1000 + 3 * 3600;
  const label = RS.formatDateTime(laterToday, 0);
  assert.doesNotMatch(label, /^[A-Za-z]{3} /); // no "Tue " weekday prefix
});

test("formatDateTime: adds a weekday prefix once the date rolls over (midnight/day boundary)", () => {
  const tomorrow = Date.now() / 1000 + 26 * 3600; // safely past local midnight regardless of current hour
  const label = RS.formatDateTime(tomorrow, 0);
  assert.match(label, /^[A-Za-z]{3} /);
});

test("formatTimezone-sensitive formatting: a large positive offset shifts the displayed hour", () => {
  const dtSec = 0; // 1970-01-01T00:00:00Z
  const utcLabel = RS.formatTime(dtSec, 0);
  const offsetLabel = RS.formatTime(dtSec, 12 * 3600); // UTC+12
  assert.notEqual(utcLabel, offsetLabel);
});
