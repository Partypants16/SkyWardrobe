/**
 * RainGraphComponent — canvas-based precipitation probability chart.
 * No external charting library required.
 * Depends on RainService.
 */
window.RainGraphComponent = (function () {
  const RS = window.RainService;

  let _canvasId   = null;
  let _lastData   = null;
  let _resizeObs  = null;

  const PADDING = { top: 28, right: 24, bottom: 52, left: 48 };

  // ── Color helpers ────────────────────────────────────────────────────────────
  function popColor(pop, alpha) {
    const a = alpha !== undefined ? alpha : 1;
    if (pop < 0.2)  return `rgba(147, 197, 253, ${a})`;
    if (pop < 0.4)  return `rgba(96,  165, 250, ${a})`;
    if (pop < 0.6)  return `rgba(59,  130, 246, ${a})`;
    if (pop < 0.8)  return `rgba(37,  99,  235, ${a})`;
    return               `rgba(30,  64,  175, ${a})`;
  }

  function getThemeColors() {
    const s = getComputedStyle(document.body);
    return {
      ink:   s.getPropertyValue("--ink").trim()  || "#17211f",
      muted: s.getPropertyValue("--muted").trim() || "#63706d",
      line:  s.getPropertyValue("--line").trim()  || "rgba(216,226,223,0.4)"
    };
  }

  // ── Canvas drawing ───────────────────────────────────────────────────────────
  function draw(canvas, list, nextRain, tz) {
    const items = list.slice(0, 8);   // 24h / 3h slots
    if (items.length === 0) return;

    const dpr     = window.devicePixelRatio || 1;
    const w       = canvas.clientWidth  || 600;
    const h       = canvas.clientHeight || 200;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const colors = getThemeColors();
    const P      = PADDING;
    const innerW = w - P.left - P.right;
    const innerH = h - P.top  - P.bottom;
    const barW   = innerW / items.length;
    const nowSec = Date.now() / 1000;

    // Background clear
    ctx.clearRect(0, 0, w, h);

    // ── Grid lines ────────────────────────────────────────────────────────────
    ctx.strokeStyle = colors.line;
    ctx.lineWidth   = 1;
    const ySteps = [0, 25, 50, 75, 100];
    for (const pct of ySteps) {
      const y = P.top + innerH - (pct / 100) * innerH;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(P.left, y);
      ctx.lineTo(P.left + innerW, y);
      ctx.stroke();

      // Y-axis labels
      ctx.setLineDash([]);
      ctx.fillStyle   = colors.muted;
      ctx.font        = `${11 * Math.min(1, w / 400)}px 'Outfit', system-ui`;
      ctx.textAlign   = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`${pct}%`, P.left - 6, y);
    }
    ctx.setLineDash([]);

    // ── Rainfall amount area (secondary) ─────────────────────────────────────
    const maxMm = Math.max(1, ...items.map((i) => i.rain_3h || 0));
    const mmPoints = items.map((item, idx) => ({
      x: P.left + idx * barW + barW / 2,
      y: P.top  + innerH - Math.min(1, (item.rain_3h || 0) / maxMm) * innerH * 0.7
    }));

    if (mmPoints.some((p) => items[mmPoints.indexOf(p)]?.rain_3h > 0)) {
      ctx.beginPath();
      ctx.moveTo(P.left, P.top + innerH);
      for (const pt of mmPoints) ctx.lineTo(pt.x, pt.y);
      ctx.lineTo(P.left + innerW, P.top + innerH);
      ctx.closePath();
      ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(mmPoints[0].x, mmPoints[0].y);
      for (let i = 1; i < mmPoints.length; i++) {
        const prev = mmPoints[i - 1];
        const curr = mmPoints[i];
        const cpx  = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // ── Probability bars ──────────────────────────────────────────────────────
    const BAR_GAP = Math.max(2, barW * 0.1);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pop  = item.pop || 0;
      const x    = P.left + i * barW + BAR_GAP / 2;
      const bw   = barW - BAR_GAP;
      const bh   = Math.max(2, (pop / 1) * innerH);
      const y    = P.top + innerH - bh;

      // Highlight rain-likely bars
      if (pop >= RS.RAIN_PROB_THRESHOLD) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
        ctx.fillRect(x, P.top, bw, innerH);
      }

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, P.top + innerH);
      grad.addColorStop(0,   popColor(pop, 0.85));
      grad.addColorStop(1,   popColor(pop, 0.35));
      ctx.fillStyle = grad;

      const radius = Math.min(4, bw / 4);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bw - radius, y);
      ctx.quadraticCurveTo(x + bw, y,     x + bw, y + radius);
      ctx.lineTo(x + bw, P.top + innerH);
      ctx.lineTo(x,       P.top + innerH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // Probability label on tall bars
      if (pop >= 0.30 && bh > 22) {
        ctx.fillStyle    = "rgba(255,255,255,0.9)";
        ctx.font         = `bold ${11 * Math.min(1, w / 400)}px 'Outfit', system-ui`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`${Math.round(pop * 100)}%`, x + bw / 2, y + 4);
      }
    }

    // ── Next-rain marker ─────────────────────────────────────────────────────
    if (nextRain) {
      const rainIdx = items.findIndex((i) => i.dt === nextRain.dt);
      if (rainIdx >= 0) {
        const mx = P.left + rainIdx * barW + barW / 2;
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.lineWidth   = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(mx, P.top);
        ctx.lineTo(mx, P.top + innerH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        const label  = `Rain ~${RS.formatTime(nextRain.dt, tz)}`;
        const labelW = ctx.measureText(label).width + 12;
        const lx     = Math.min(mx - 4, w - P.right - labelW);
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.fillRect(lx, P.top + 2, labelW, 18);
        ctx.fillStyle    = "#fff";
        ctx.font         = `bold 10px 'Outfit', system-ui`;
        ctx.textAlign    = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label, lx + 6, P.top + 5);
      }
    }

    // ── Current time indicator ───────────────────────────────────────────────
    if (items.length > 0 && nowSec >= items[0].dt && nowSec <= items[items.length - 1].dt + 10800) {
      const span = items[items.length - 1].dt + 10800 - items[0].dt;
      const pct  = Math.min(1, Math.max(0, (nowSec - items[0].dt) / span));
      const nx   = P.left + pct * innerW;
      ctx.strokeStyle = colors.ink;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(nx, P.top);
      ctx.lineTo(nx, P.top + innerH);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── X-axis time labels ───────────────────────────────────────────────────
    ctx.fillStyle    = colors.muted;
    ctx.font         = `${11 * Math.min(1, w / 400)}px 'Outfit', system-ui`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const x    = P.left + i * barW + barW / 2;
      const t    = RS.formatTime(item.dt, tz || 0);
      ctx.fillText(t, x, P.top + innerH + 8);
    }

    // ── Axis label ───────────────────────────────────────────────────────────
    ctx.fillStyle    = colors.muted;
    ctx.font         = `10px 'Outfit', system-ui`;
    ctx.textAlign    = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Rain probability — next 24 h", P.left, P.top + innerH + 34);
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  function init(canvasId) {
    _canvasId = canvasId;

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    _resizeObs = new ResizeObserver(() => {
      if (_lastData) draw(canvas, _lastData.list, _lastData.nextRain, _lastData.tz);
    });
    _resizeObs.observe(canvas.parentElement || document.body);
  }

  function render(list, nextRain, tz) {
    _lastData = { list, nextRain, tz };
    const canvas = document.getElementById(_canvasId);
    if (!canvas) return;
    draw(canvas, list, nextRain, tz);
  }

  function destroy() {
    if (_resizeObs) { _resizeObs.disconnect(); _resizeObs = null; }
    _lastData = null;
  }

  return { init, render, destroy };
})();
