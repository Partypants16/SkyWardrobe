/**
 * RadarFrames — pure helpers for turning a RainViewer weather-maps.json
 * response into an ordered, labelled frame list. No network, no DOM, no
 * Leaflet — kept separate from radar.js purely so this logic is unit
 * testable without a live RainViewer call or a browser.
 *
 * Exposed as window.RadarFrames in the browser and module.exports in Node.
 */
const RadarFrames = (function () {
  /**
   * Combines RainViewer's `radar.past` and `radar.nowcast` arrays into one
   * chronologically-ordered list, each frame tagged with its type so the UI
   * can distinguish observed history from a forecast/nowcast frame.
   * @param {{past?: Array<{time:number,path:string}>, nowcast?: Array<{time:number,path:string}>}} radarData
   */
  function buildFrameList(radarData) {
    const past    = (radarData?.past    || []).map((f) => ({ time: f.time, path: f.path, type: "past" }));
    const nowcast = (radarData?.nowcast || []).map((f) => ({ time: f.time, path: f.path, type: "nowcast" }));
    return [...past, ...nowcast];
  }

  /** Index of the last frame matching `type`, or -1 if none exist. */
  function lastIndexOfType(frames, type) {
    if (!Array.isArray(frames)) return -1;
    for (let i = frames.length - 1; i >= 0; i--) {
      if (frames[i].type === type) return i;
    }
    return -1;
  }

  /**
   * The frame that should be shown on load: the most recent observed
   * ("past") frame, since that represents "now". Falls back to the first
   * frame if there are no past frames (e.g. only nowcast data is available),
   * and to -1 for an empty list.
   */
  function defaultFrameIndex(frames) {
    if (!Array.isArray(frames) || frames.length === 0) return -1;
    const lastPast = lastIndexOfType(frames, "past");
    return lastPast >= 0 ? lastPast : 0;
  }

  /** Percentage (0-100) along the timeline where the "now" boundary sits. */
  function nowMarkerPercent(frames) {
    if (!Array.isArray(frames) || frames.length <= 1) return 50;
    const idx = lastIndexOfType(frames, "past");
    return idx >= 0 ? (idx / (frames.length - 1)) * 100 : 50;
  }

  /** Builds a Leaflet-style tile URL template for a given frame. */
  function tileUrl(host, frame, opts) {
    const { tileSize = 256, colorScheme = 2, options = "1_1" } = opts || {};
    return `${host}${frame.path}/${tileSize}/{z}/{x}/{y}/${colorScheme}/${options}.png`;
  }

  return { buildFrameList, lastIndexOfType, defaultFrameIndex, nowMarkerPercent, tileUrl };
})();

if (typeof window !== "undefined") window.RadarFrames = RadarFrames;
if (typeof module !== "undefined" && module.exports) module.exports = RadarFrames;
