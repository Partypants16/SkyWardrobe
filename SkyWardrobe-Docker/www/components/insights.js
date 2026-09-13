/**
 * InsightsComponent — renders contextual weather insights.
 */
window.InsightsComponent = (function () {
  function render(containerId, insights) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!Array.isArray(insights) || insights.length === 0) {
      el.hidden = true;
      return;
    }

    el.hidden = false;
    const items = insights
      .map((text) => `<li class="insight-item">${text}</li>`)
      .join("");

    el.innerHTML = `
      <div class="section-header">
        <span class="section-icon">💡</span>
        <h2 class="section-title">Weather Insights</h2>
      </div>
      <ul class="insight-list">${items}</ul>`;
  }

  function setError(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.hidden = true;
  }

  return { render, setError };
})();
