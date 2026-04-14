export function renderDashboardHTML(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Site Growth Dashboard</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #101114;
        --panel: #17191f;
        --panel-2: #1f232c;
        --border: #2b3340;
        --text: #eceff4;
        --muted: #99a3b3;
        --accent: #d8a845;
        --accent-2: #7dcfff;
        --danger: #ff7a90;
        --ok: #90d07d;
        --shadow: 0 20px 40px rgba(0, 0, 0, 0.28);
        --radius: 14px;
        --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
        --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: var(--sans); }
      body { padding: 18px; }
      a { color: var(--accent-2); }

      .shell {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr) 360px;
        gap: 16px;
        min-height: calc(100vh - 36px);
      }

      .rail,
      .workspace,
      .inspector {
        min-width: 0;
      }

      .stack {
        display: grid;
        gap: 16px;
      }

      .panel {
        background: linear-gradient(180deg, rgba(216, 168, 69, 0.04), transparent 40%), var(--panel);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .panel-head {
        padding: 14px 16px 0;
      }

      .panel-head h1,
      .panel-head h2,
      .panel-head h3 {
        margin: 0;
        font-size: 0.98rem;
        line-height: 1.25;
        letter-spacing: 0.02em;
      }

      .panel-head p {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .panel-body {
        padding: 16px;
      }

      .brand {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .brand small {
        color: var(--muted);
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .brand strong {
        font-size: 1.22rem;
      }

      .control-group {
        display: grid;
        gap: 12px;
      }

      .field {
        display: grid;
        gap: 6px;
      }

      .field label {
        font-size: 0.82rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .field input,
      .field select,
      .field button,
      .inspector select {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--panel-2);
        color: var(--text);
        font: inherit;
        padding: 10px 12px;
      }

      .field button,
      .action {
        background: linear-gradient(180deg, rgba(216, 168, 69, 0.14), rgba(216, 168, 69, 0.08));
        border-color: rgba(216, 168, 69, 0.45);
        color: #fff4d8;
        cursor: pointer;
        font-weight: 600;
      }

      .field button:hover,
      .action:hover {
        filter: brightness(1.05);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .summary-card {
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
      }

      .summary-card .k {
        display: block;
        color: var(--muted);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .summary-card .v {
        display: block;
        margin-top: 6px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .workspace .panel {
        min-height: 0;
      }

      .timeline-list {
        display: grid;
        gap: 8px;
        max-height: 48vh;
        overflow: auto;
      }

      .timeline-item {
        width: 100%;
        text-align: left;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
        color: var(--text);
        padding: 12px;
        cursor: pointer;
      }

      .timeline-item.is-active {
        border-color: rgba(125, 207, 255, 0.6);
        background: rgba(125, 207, 255, 0.08);
      }

      .timeline-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 0.76rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .timeline-path {
        margin-top: 8px;
        font-family: var(--mono);
        font-size: 0.82rem;
        word-break: break-word;
      }

      .timeline-note {
        margin-top: 8px;
        color: var(--muted);
        font-size: 0.88rem;
      }

      .empty {
        padding: 14px;
        border: 1px dashed var(--border);
        border-radius: 12px;
        color: var(--muted);
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .bars {
        display: grid;
        gap: 10px;
      }

      .bar-row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
      }

      .bar-row .day {
        color: var(--muted);
        font-family: var(--mono);
        font-size: 0.78rem;
      }

      .bar-stack {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .bar {
        height: 10px;
        border-radius: 999px;
        min-width: 2px;
      }

      .bar.pageviews {
        background: linear-gradient(90deg, rgba(216, 168, 69, 0.85), rgba(216, 168, 69, 0.35));
      }

      .bar.visitors {
        background: linear-gradient(90deg, rgba(125, 207, 255, 0.85), rgba(125, 207, 255, 0.35));
      }

      .bar-value {
        color: var(--muted);
        font-family: var(--mono);
        font-size: 0.78rem;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }

      .table th,
      .table td {
        border-bottom: 1px solid var(--border);
        padding: 10px 0;
        text-align: left;
        vertical-align: top;
      }

      .table th {
        color: var(--muted);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .path {
        font-family: var(--mono);
        font-size: 0.8rem;
        word-break: break-word;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: var(--mono);
        font-size: 0.78rem;
        line-height: 1.55;
      }

      .heatmap-grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 4px;
        margin-top: 12px;
      }

      .heat-cell {
        aspect-ratio: 1 / 1;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.04);
        background: rgba(255, 255, 255, 0.04);
        position: relative;
      }

      .heat-cell span {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.78);
        font-family: var(--mono);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid var(--border);
        font-size: 0.75rem;
        color: var(--muted);
        background: rgba(255, 255, 255, 0.02);
      }

      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .status {
        margin-top: 10px;
        color: var(--muted);
        font-size: 0.82rem;
      }

      .status.is-error {
        color: var(--danger);
      }

      .status.is-ok {
        color: var(--ok);
      }

      @media (max-width: 1200px) {
        .shell {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <aside class="rail">
        <div class="stack">
          <section class="panel">
            <div class="panel-body">
              <div class="brand">
                <small>Context Rail</small>
                <strong>Site Growth Dashboard</strong>
                <span class="status" id="status-line">Enter your admin token to unlock the dashboard.</span>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Action Surface</h2>
              <p>Provide the admin token, choose a time window, then refresh. The timeline in the center is the source of truth.</p>
            </div>
            <div class="panel-body">
              <div class="control-group">
                <div class="field">
                  <label for="token">Admin Token</label>
                  <input id="token" type="password" autocomplete="off" placeholder="Paste token from Wrangler secret">
                </div>
                <div class="field">
                  <label for="days">Time Window</label>
                  <select id="days">
                    <option value="7">Last 7 days</option>
                    <option value="30" selected>Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>
                <div class="field">
                  <button id="refresh" type="button">Refresh Dashboard</button>
                </div>
                <div class="field">
                  <button id="dispatch" class="action" type="button">Run Newsletter Dispatch</button>
                </div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Runtime Metrics</h2>
              <p>Operational metrics that answer what the site is doing now.</p>
            </div>
            <div class="panel-body">
              <div id="summary" class="summary-grid">
                <div class="empty">Summary metrics will appear here after the first successful fetch.</div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Projection Surface</h2>
              <p>Derived top-level views. Useful, but not the canonical event record.</p>
            </div>
            <div class="panel-body">
              <div id="top-pages-rail" class="empty">Top pages will appear here.</div>
            </div>
          </section>
        </div>
      </aside>

      <main class="workspace">
        <div class="stack">
          <section class="panel">
            <div class="panel-head">
              <h2>Truth Surface</h2>
              <p>Recent events are the append-only timeline. Click an event to inspect its payload.</p>
            </div>
            <div class="panel-body">
              <div id="timeline" class="timeline-list">
                <div class="empty">No events loaded yet. Refresh after entering a valid token.</div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Daily Activity</h2>
              <p>Pageviews and unique visitors per day, derived from the event stream.</p>
            </div>
            <div class="panel-body">
              <div id="daily" class="bars">
                <div class="empty">Daily series will appear here.</div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Top Pages And Click Targets</h2>
              <p>These are rollups over pageview and article-click events.</p>
            </div>
            <div class="panel-body">
              <div class="stack">
                <div id="top-pages" class="empty">Top pages will appear here.</div>
                <div id="top-clicks" class="empty">Top article clicks will appear here.</div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <aside class="inspector">
        <div class="stack">
          <section class="panel">
            <div class="panel-head">
              <h2>Explanation Surface</h2>
              <p>Selected event payload and derived metadata.</p>
            </div>
            <div class="panel-body">
              <pre id="inspector">Select an event in the timeline to inspect it here.</pre>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Click Grid</h2>
              <p>This is a coarse click heatmap projection built from normalized click coordinates.</p>
            </div>
            <div class="panel-body">
              <div class="field">
                <label for="heatmap-path">Tracked Path</label>
                <select id="heatmap-path">
                  <option value="">Choose a page</option>
                </select>
              </div>
              <div class="row" id="heatmap-meta"></div>
              <div id="heatmap" class="empty">Choose a tracked path to see the click grid.</div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Subscribers</h2>
              <p>Recent subscribers and their current state.</p>
            </div>
            <div class="panel-body">
              <div id="subscribers" class="empty">Subscriber state will appear here.</div>
            </div>
          </section>
        </div>
      </aside>
    </div>

    <script>
      (function () {
        var state = {
          token: sessionStorage.getItem("growth-admin-token") || "",
          days: Number(sessionStorage.getItem("growth-dashboard-days") || 30),
          selectedEventId: null,
          recentEvents: [],
          topPages: []
        };

        var tokenInput = document.getElementById("token");
        var daysSelect = document.getElementById("days");
        var refreshButton = document.getElementById("refresh");
        var dispatchButton = document.getElementById("dispatch");
        var statusLine = document.getElementById("status-line");
        var summaryEl = document.getElementById("summary");
        var timelineEl = document.getElementById("timeline");
        var inspectorEl = document.getElementById("inspector");
        var dailyEl = document.getElementById("daily");
        var topPagesEl = document.getElementById("top-pages");
        var topPagesRailEl = document.getElementById("top-pages-rail");
        var topClicksEl = document.getElementById("top-clicks");
        var heatmapPathEl = document.getElementById("heatmap-path");
        var heatmapMetaEl = document.getElementById("heatmap-meta");
        var heatmapEl = document.getElementById("heatmap");
        var subscribersEl = document.getElementById("subscribers");

        tokenInput.value = state.token;
        daysSelect.value = String(state.days);

        function setStatus(message, kind) {
          statusLine.textContent = message;
          statusLine.className = "status" + (kind ? " is-" + kind : "");
        }

        function authHeaders() {
          return state.token ? { Authorization: "Bearer " + state.token } : {};
        }

        async function api(path, options) {
          options = options || {};
          var headers = Object.assign({}, authHeaders(), options.headers || {});
          var response = await fetch(path, Object.assign({}, options, { headers: headers }));
          var contentType = response.headers.get("content-type") || "";
          var body = contentType.indexOf("application/json") >= 0 ? await response.json() : await response.text();
          if (!response.ok) {
            var message = typeof body === "string" ? body : (body && body.error) || "Request failed";
            throw new Error(message);
          }
          return body;
        }

        function escapeHtml(value) {
          return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function formatNumber(value) {
          return new Intl.NumberFormat("en-US").format(Number(value || 0));
        }

        function renderSummary(summary) {
          if (!summary) {
            summaryEl.innerHTML = '<div class="empty">Summary metrics will appear here after the first successful fetch.</div>';
            return;
          }
          var cards = [
            ["Pageviews", summary.pageviews],
            ["Visitors", summary.uniqueVisitors],
            ["Article Clicks", summary.articleClicks],
            ["Tracked Clicks", summary.uiClicks],
            ["Active Subs", summary.activeSubscribers],
            ["New Subs", summary.newSubscribers]
          ];
          summaryEl.innerHTML = cards.map(function (card) {
            return '<div class="summary-card"><span class="k">' + escapeHtml(card[0]) + '</span><span class="v">' + formatNumber(card[1]) + '</span></div>';
          }).join("");
        }

        function renderDaily(summary) {
          if (!summary || !summary.dailyPageviews || !summary.dailyPageviews.length) {
            dailyEl.innerHTML = '<div class="empty">No daily series yet. Once pageviews are tracked, the daily bars will appear here.</div>';
            return;
          }
          var visitorMap = Object.create(null);
          (summary.dailyVisitors || []).forEach(function (row) {
            visitorMap[row.day] = Number(row.count || 0);
          });
          var maxPageviews = 1;
          var maxVisitors = 1;
          summary.dailyPageviews.forEach(function (row) {
            maxPageviews = Math.max(maxPageviews, Number(row.count || 0));
            maxVisitors = Math.max(maxVisitors, visitorMap[row.day] || 0);
          });
          dailyEl.innerHTML = summary.dailyPageviews.map(function (row) {
            var pageviews = Number(row.count || 0);
            var visitors = visitorMap[row.day] || 0;
            return '<div class="bar-row">'
              + '<div class="day">' + escapeHtml(row.day) + '</div>'
              + '<div class="bar-stack">'
              + '<div class="bar pageviews" style="width:' + Math.max(4, Math.round((pageviews / maxPageviews) * 220)) + 'px"></div>'
              + '<div class="bar visitors" style="width:' + Math.max(4, Math.round((visitors / maxVisitors) * 180)) + 'px"></div>'
              + '</div>'
              + '<div class="bar-value">' + formatNumber(pageviews) + ' pv / ' + formatNumber(visitors) + ' uv</div>'
              + '</div>';
          }).join("");
        }

        function renderTable(title, rows, columns) {
          if (!rows || !rows.length) {
            return '<div class="empty">' + escapeHtml(title) + ' will appear here after data is collected.</div>';
          }
          var head = columns.map(function (column) {
            return '<th>' + escapeHtml(column.label) + '</th>';
          }).join("");
          var body = rows.map(function (row) {
            return '<tr>' + columns.map(function (column) {
              var value = row[column.key];
              if (column.kind === "path") {
                return '<td class="path">' + escapeHtml(value || "—") + '</td>';
              }
              return '<td>' + escapeHtml(column.format ? column.format(value, row) : formatNumber(value)) + '</td>';
            }).join("") + '</tr>';
          }).join("");
          return '<table class="table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
        }

        function renderTopPages(rows) {
          state.topPages = rows || [];
          topPagesEl.innerHTML = renderTable("Top pages", rows, [
            { key: "pathname", label: "Path", kind: "path", format: function (value) { return value || "—"; } },
            { key: "pageviews", label: "Pageviews" },
            { key: "uniqueVisitors", label: "Visitors" }
          ]);

          if (!rows || !rows.length) {
            topPagesRailEl.innerHTML = '<div class="empty">Top pages will appear here.</div>';
            heatmapPathEl.innerHTML = '<option value="">Choose a page</option>';
            return;
          }

          topPagesRailEl.innerHTML = rows.slice(0, 6).map(function (row) {
            return '<div class="pill"><span>' + escapeHtml(row.pathname) + '</span><strong>' + formatNumber(row.pageviews) + '</strong></div>';
          }).join("");

          var options = ['<option value="">Choose a page</option>'];
          rows.forEach(function (row) {
            options.push('<option value="' + escapeHtml(row.pathname) + '">' + escapeHtml(row.pathname) + '</option>');
          });
          heatmapPathEl.innerHTML = options.join("");
        }

        function renderTopClicks(rows) {
          topClicksEl.innerHTML = renderTable("Top article clicks", rows, [
            { key: "targetPath", label: "Target", kind: "path", format: function (value) { return value || "—"; } },
            { key: "clicks", label: "Clicks" },
            { key: "uniqueVisitors", label: "Visitors" }
          ]);
        }

        function renderSubscribers(rows) {
          if (!rows || !rows.length) {
            subscribersEl.innerHTML = '<div class="empty">No subscribers yet. When the newsletter endpoint receives submissions, they will appear here.</div>';
            return;
          }
          subscribersEl.innerHTML = renderTable("Subscribers", rows, [
            { key: "email", label: "Email", format: function (value) { return value || "—"; } },
            { key: "status", label: "Status", format: function (value) { return value || "—"; } },
            { key: "createdAt", label: "Created", format: function (value) { return value || "—"; } }
          ]);
        }

        function renderInspector(item) {
          if (!item) {
            inspectorEl.textContent = "Select an event in the timeline to inspect it here.";
            return;
          }
          inspectorEl.textContent = JSON.stringify(item, null, 2);
        }

        function renderTimeline(rows) {
          state.recentEvents = rows || [];
          if (!rows || !rows.length) {
            timelineEl.innerHTML = '<div class="empty">No tracked events yet. Once the site posts pageviews or clicks, the timeline will populate.</div>';
            renderInspector(null);
            return;
          }

          timelineEl.innerHTML = rows.map(function (row) {
            var active = state.selectedEventId === row.id ? " is-active" : "";
            var path = row.targetPath || row.pathname || "—";
            var note = row.context ? 'Context: ' + row.context : (row.targetText ? row.targetText : "");
            return '<button type="button" class="timeline-item' + active + '" data-event-id="' + row.id + '">'
              + '<div class="timeline-meta"><span>' + escapeHtml(row.eventType) + '</span><span>' + escapeHtml(row.createdAt) + '</span></div>'
              + '<div class="timeline-path">' + escapeHtml(path) + '</div>'
              + '<div class="timeline-note">' + escapeHtml(note || "No extra context") + '</div>'
              + '</button>';
          }).join("");

          if (state.selectedEventId == null && rows.length) {
            state.selectedEventId = rows[0].id;
          }
          var selected = rows.find(function (row) { return row.id === state.selectedEventId; }) || rows[0];
          state.selectedEventId = selected.id;
          renderInspector(selected);
          Array.prototype.forEach.call(timelineEl.querySelectorAll(".timeline-item"), function (button) {
            button.addEventListener("click", function () {
              state.selectedEventId = Number(button.getAttribute("data-event-id"));
              renderTimeline(state.recentEvents);
            });
          });
        }

        function renderHeatmap(data) {
          if (!data || !data.path) {
            heatmapEl.innerHTML = '<div class="empty">Choose a tracked path to see the click grid.</div>';
            heatmapMetaEl.innerHTML = "";
            return;
          }
          if (!data.totalClicks) {
            heatmapEl.innerHTML = '<div class="empty">No tracked clicks for this path in the selected window.</div>';
            heatmapMetaEl.innerHTML = '<span class="pill">Path: ' + escapeHtml(data.path) + '</span>';
            return;
          }
          heatmapMetaEl.innerHTML = '<span class="pill">Path: ' + escapeHtml(data.path) + '</span>'
            + '<span class="pill">Clicks: ' + formatNumber(data.totalClicks) + '</span>'
            + '<span class="pill">Grid: ' + escapeHtml(data.xBins + "×" + data.yBins) + '</span>';

          var max = Math.max.apply(Math, data.cells.map(function (row) { return row.count; }).concat([1]));
          heatmapEl.innerHTML = '<div class="heatmap-grid">' + data.cells.map(function (cell) {
            var alpha = cell.count ? Math.max(0.1, cell.count / max) : 0.04;
            return '<div class="heat-cell" style="background: rgba(216, 168, 69, ' + alpha.toFixed(3) + ')"><span>' + (cell.count ? formatNumber(cell.count) : "") + '</span></div>';
          }).join("") + '</div>';
        }

        async function loadHeatmap(path) {
          if (!path) {
            renderHeatmap(null);
            return;
          }
          var query = new URLSearchParams({
            path: path,
            days: String(state.days),
            xBins: "12",
            yBins: "12"
          });
          var data = await api("/api/admin/heatmap?" + query.toString());
          renderHeatmap(data);
        }

        async function refreshDashboard() {
          state.token = tokenInput.value.trim();
          state.days = Number(daysSelect.value || 30);
          sessionStorage.setItem("growth-admin-token", state.token);
          sessionStorage.setItem("growth-dashboard-days", String(state.days));

          if (!state.token) {
            setStatus("Enter the admin token to load private analytics.", "error");
            return;
          }

          setStatus("Loading dashboard…");

          try {
            var summaryQuery = new URLSearchParams({ days: String(state.days) });
            var results = await Promise.all([
              api("/api/admin/summary?" + summaryQuery.toString()),
              api("/api/admin/top-pages?" + summaryQuery.toString()),
              api("/api/admin/top-clicks?" + summaryQuery.toString()),
              api("/api/admin/recent-events?" + new URLSearchParams({ days: String(state.days), limit: "80" }).toString()),
              api("/api/admin/subscribers?limit=40")
            ]);

            renderSummary(results[0]);
            renderDaily(results[0]);
            renderTopPages(results[1].rows || []);
            renderTopClicks(results[2].rows || []);
            renderTimeline(results[3].rows || []);
            renderSubscribers(results[4].rows || []);

            if (!heatmapPathEl.value && state.topPages.length) {
              heatmapPathEl.value = state.topPages[0].pathname;
            }
            await loadHeatmap(heatmapPathEl.value);
            setStatus("Dashboard refreshed.", "ok");
          } catch (error) {
            console.error(error);
            setStatus(error.message || "Dashboard refresh failed.", "error");
          }
        }

        async function runDispatch() {
          state.token = tokenInput.value.trim();
          if (!state.token) {
            setStatus("Enter the admin token before running newsletter dispatch.", "error");
            return;
          }
          setStatus("Running newsletter dispatch…");
          try {
            var result = await api("/api/admin/dispatch-now", { method: "POST" });
            setStatus("Dispatch finished. Created " + formatNumber(result.createdDispatches) + " new dispatches and sent " + formatNumber(result.sentDeliveries) + " emails.", "ok");
          } catch (error) {
            console.error(error);
            setStatus(error.message || "Newsletter dispatch failed.", "error");
          }
        }

        refreshButton.addEventListener("click", function () {
          refreshDashboard();
        });

        dispatchButton.addEventListener("click", function () {
          runDispatch();
        });

        heatmapPathEl.addEventListener("change", function () {
          loadHeatmap(heatmapPathEl.value).catch(function (error) {
            console.error(error);
            setStatus(error.message || "Failed to load click grid.", "error");
          });
        });

        if (state.token) {
          refreshDashboard();
        }
      })();
    </script>
  </body>
</html>`;
}
