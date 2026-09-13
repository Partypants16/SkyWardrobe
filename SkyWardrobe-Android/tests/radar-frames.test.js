const test = require("node:test");
const assert = require("node:assert/strict");
const RadarFrames = require("../www/services/radar-frames.js");

// ── buildFrameList ───────────────────────────────────────────────────────────
test("buildFrameList: combines past and nowcast, tagging each frame's type", () => {
  const radarData = {
    past:    [{ time: 100, path: "/a" }, { time: 200, path: "/b" }],
    nowcast: [{ time: 300, path: "/c" }]
  };
  const frames = RadarFrames.buildFrameList(radarData);
  assert.equal(frames.length, 3);
  assert.deepEqual(frames.map((f) => f.type), ["past", "past", "nowcast"]);
});

test("buildFrameList: preserves chronological order as given by the provider", () => {
  const radarData = { past: [{ time: 100, path: "/a" }, { time: 200, path: "/b" }], nowcast: [] };
  const frames = RadarFrames.buildFrameList(radarData);
  assert.deepEqual(frames.map((f) => f.time), [100, 200]);
});

test("buildFrameList: handles a missing nowcast array (provider has none available right now)", () => {
  const frames = RadarFrames.buildFrameList({ past: [{ time: 100, path: "/a" }] });
  assert.equal(frames.length, 1);
  assert.equal(frames[0].type, "past");
});

test("buildFrameList: handles completely missing/empty radar data without throwing", () => {
  assert.deepEqual(RadarFrames.buildFrameList(undefined), []);
  assert.deepEqual(RadarFrames.buildFrameList({}), []);
  assert.deepEqual(RadarFrames.buildFrameList({ past: [], nowcast: [] }), []);
});

// ── lastIndexOfType / defaultFrameIndex ──────────────────────────────────────
test("defaultFrameIndex: selects the most recent 'past' frame as the starting point", () => {
  const frames = RadarFrames.buildFrameList({
    past:    [{ time: 100, path: "/a" }, { time: 200, path: "/b" }],
    nowcast: [{ time: 300, path: "/c" }]
  });
  assert.equal(RadarFrames.defaultFrameIndex(frames), 1); // the last "past" frame
});

test("defaultFrameIndex: falls back to the first frame when there are no past frames", () => {
  const frames = RadarFrames.buildFrameList({ past: [], nowcast: [{ time: 300, path: "/c" }] });
  assert.equal(RadarFrames.defaultFrameIndex(frames), 0);
});

test("defaultFrameIndex: -1 for an empty frame list (no radar data at all)", () => {
  assert.equal(RadarFrames.defaultFrameIndex([]), -1);
});

// ── nowMarkerPercent ─────────────────────────────────────────────────────────
test("nowMarkerPercent: sits at the boundary between past and nowcast frames", () => {
  const frames = RadarFrames.buildFrameList({
    past:    [{ time: 100, path: "/a" }, { time: 200, path: "/b" }], // indices 0,1
    nowcast: [{ time: 300, path: "/c" }, { time: 400, path: "/d" }]  // indices 2,3
  });
  // last "past" index is 1, out of 4 total frames (0..3) -> 1/3 * 100
  assert.equal(RadarFrames.nowMarkerPercent(frames), (1 / 3) * 100);
});

test("nowMarkerPercent: defaults to 50 for a single-frame or empty list", () => {
  assert.equal(RadarFrames.nowMarkerPercent([{ time: 100, path: "/a", type: "past" }]), 50);
  assert.equal(RadarFrames.nowMarkerPercent([]), 50);
});

// ── tileUrl ──────────────────────────────────────────────────────────────────
test("tileUrl: builds the documented RainViewer tile template", () => {
  const url = RadarFrames.tileUrl("https://tilecache.rainviewer.com", { path: "/v2/radar/abc123" }, {
    tileSize: 256, colorScheme: 2, options: "1_1"
  });
  assert.equal(url, "https://tilecache.rainviewer.com/v2/radar/abc123/256/{z}/{x}/{y}/2/1_1.png");
});

test("tileUrl: applies sensible defaults when options are omitted", () => {
  const url = RadarFrames.tileUrl("https://host", { path: "/p" });
  assert.equal(url, "https://host/p/256/{z}/{x}/{y}/2/1_1.png");
});
