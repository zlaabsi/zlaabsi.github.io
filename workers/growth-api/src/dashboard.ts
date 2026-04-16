export function renderDashboardHTML(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Site Growth Dashboard</title>
    <style>
      :root {
        color-scheme: light;
        --background: #fafafa;
        --foreground: #18181b;
        --card: #ffffff;
        --card-foreground: #18181b;
        --popover: #ffffff;
        --popover-foreground: #18181b;
        --primary: #18181b;
        --primary-foreground: #fafafa;
        --secondary: #f4f4f5;
        --secondary-foreground: #18181b;
        --muted: #f4f4f5;
        --muted-foreground: #71717a;
        --accent: #f4f4f5;
        --accent-foreground: #18181b;
        --border: #e4e4e7;
        --input: #e4e4e7;
        --ring: #18181b;
        --danger: #dc2626;
        --success: #16a34a;
        --warning: #d97706;
        --chart-1: #0f172a;
        --chart-2: #0ea5e9;
        --chart-3: #eab308;
        --chart-4: #22c55e;
        --chart-5: #8b5cf6;
        --shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 10px 30px rgba(0, 0, 0, 0.04);
        --radius: 1rem;
        --radius-sm: 0.75rem;
        --radius-xs: 0.55rem;
        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        --sans: Inter, "SF Pro Display", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        min-height: 100%;
        background:
          radial-gradient(circle at top left, rgba(244, 244, 245, 0.92), rgba(244, 244, 245, 0) 30%),
          linear-gradient(180deg, #fcfcfd 0%, #fafafa 100%);
        color: var(--foreground);
        font-family: var(--sans);
      }

      body {
        min-height: 100vh;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      button,
      input,
      select {
        font: inherit;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: var(--mono);
        font-size: 0.8rem;
        line-height: 1.6;
      }

      .dashboard-shell {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        min-height: 100vh;
      }

      .sidebar {
        position: sticky;
        top: 0;
        align-self: start;
        height: 100vh;
        overflow: auto;
        border-right: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.86);
        backdrop-filter: blur(18px);
      }

      .sidebar-inner {
        display: grid;
        gap: 1.25rem;
        padding: 1.5rem 1rem;
      }

      .brand-card {
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(250, 250, 250, 0.88));
        box-shadow: var(--shadow);
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--muted-foreground);
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .brand-title {
        margin-top: 0.75rem;
        font-size: 1.18rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .brand-copy {
        margin-top: 0.45rem;
        color: var(--muted-foreground);
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .sidebar-group {
        display: grid;
        gap: 0.35rem;
      }

      .sidebar-label {
        padding: 0 0.65rem;
        color: var(--muted-foreground);
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .sidebar-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.7rem 0.8rem;
        border-radius: 0.8rem;
        color: #3f3f46;
        transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
      }

      .sidebar-link:hover {
        background: var(--accent);
        color: var(--accent-foreground);
      }

      .sidebar-link small {
        color: var(--muted-foreground);
        font-size: 0.76rem;
      }

      .card {
        border: 1px solid var(--border);
        border-radius: calc(var(--radius) + 0.1rem);
        background: var(--card);
        box-shadow: var(--shadow);
      }

      .card-header {
        padding: 1rem 1rem 0;
      }

      .card-title {
        margin: 0;
        font-size: 0.98rem;
        font-weight: 600;
        letter-spacing: -0.01em;
      }

      .card-description {
        margin: 0.35rem 0 0;
        color: var(--muted-foreground);
        font-size: 0.86rem;
        line-height: 1.5;
      }

      .card-content {
        padding: 1rem;
      }

      .auth-card .card-content {
        display: grid;
        gap: 0.9rem;
      }

      .field {
        display: grid;
        gap: 0.45rem;
      }

      .field label {
        color: var(--muted-foreground);
        font-size: 0.8rem;
        font-weight: 500;
      }

      .field input,
      .field select,
      .toolbar-select {
        width: 100%;
        height: 2.65rem;
        border: 1px solid var(--input);
        border-radius: 0.8rem;
        background: #ffffff;
        color: var(--foreground);
        padding: 0 0.9rem;
        outline: none;
      }

      .field input:focus,
      .field select:focus,
      .toolbar-select:focus {
        border-color: rgba(24, 24, 27, 0.28);
        box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.08);
      }

      .button-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        min-height: 2.65rem;
        border: 1px solid var(--border);
        border-radius: 0.8rem;
        background: #ffffff;
        color: var(--foreground);
        padding: 0 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
      }

      .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(24, 24, 27, 0.05);
      }

      .btn-primary {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--primary-foreground);
      }

      .btn-secondary {
        background: var(--secondary);
        color: var(--secondary-foreground);
      }

      .status-line {
        margin: 0;
        padding: 0.8rem 0.9rem;
        border-radius: 0.85rem;
        background: var(--secondary);
        color: var(--muted-foreground);
        font-size: 0.84rem;
        line-height: 1.45;
      }

      .status-line.is-error {
        background: rgba(220, 38, 38, 0.08);
        color: var(--danger);
      }

      .status-line.is-ok {
        background: rgba(22, 163, 74, 0.08);
        color: var(--success);
      }

      .quick-list {
        display: grid;
        gap: 0.6rem;
      }

      .quick-item,
      .mini-row {
        display: grid;
        gap: 0.35rem;
        padding: 0.8rem 0.9rem;
        border: 1px solid var(--border);
        border-radius: 0.9rem;
        background: #fff;
      }

      .quick-item strong,
      .mini-row strong {
        font-size: 0.88rem;
        font-family: var(--mono);
        word-break: break-word;
      }

      .quick-item small,
      .mini-row small {
        color: var(--muted-foreground);
      }

      .main-frame {
        min-width: 0;
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.5rem 2rem 1rem;
        border-bottom: 1px solid rgba(228, 228, 231, 0.8);
        background: rgba(250, 250, 250, 0.82);
        backdrop-filter: blur(18px);
      }

      .topbar-copy h1 {
        margin: 0.4rem 0 0;
        font-size: clamp(1.5rem, 2vw, 2rem);
        line-height: 1.1;
        letter-spacing: -0.04em;
      }

      .topbar-copy p {
        margin: 0.55rem 0 0;
        color: var(--muted-foreground);
        max-width: 58rem;
        line-height: 1.6;
      }

      .breadcrumbs {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        color: var(--muted-foreground);
        font-size: 0.8rem;
      }

      .breadcrumbs span:last-child {
        color: var(--foreground);
        font-weight: 600;
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        min-height: 2.2rem;
        padding: 0 0.8rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        color: var(--muted-foreground);
        font-size: 0.82rem;
        font-weight: 500;
      }

      .badge strong {
        color: var(--foreground);
        font-weight: 600;
      }

      .page-content {
        display: grid;
        gap: 1.5rem;
        padding: 1.5rem 2rem 2rem;
      }

      .section {
        display: grid;
        gap: 1rem;
      }

      .section-head {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
      }

      .section-head h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .section-head p {
        margin: 0.35rem 0 0;
        color: var(--muted-foreground);
        font-size: 0.9rem;
        line-height: 1.55;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 1rem;
      }

      .metric-card {
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(250, 250, 250, 0.92));
        box-shadow: var(--shadow);
      }

      .metric-label {
        color: var(--muted-foreground);
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .metric-value {
        margin-top: 0.6rem;
        font-size: 1.8rem;
        font-weight: 700;
        letter-spacing: -0.05em;
      }

      .metric-hint {
        margin-top: 0.4rem;
        color: var(--muted-foreground);
        font-size: 0.84rem;
      }

      .content-grid {
        display: grid;
        gap: 1rem;
      }

      .content-grid.two-up {
        grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.95fr);
      }

      .content-grid.timeline {
        grid-template-columns: minmax(0, 1.8fr) minmax(340px, 0.95fr);
      }

      .content-grid.tables {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .chart-wrap {
        display: grid;
        gap: 1rem;
      }

      .chart-canvas {
        min-height: 280px;
      }

      .chart-canvas svg {
        width: 100%;
        height: auto;
        display: block;
      }

      .chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }

      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--muted-foreground);
        font-size: 0.82rem;
      }

      .legend-swatch {
        width: 0.8rem;
        height: 0.8rem;
        border-radius: 999px;
      }

      .daily-breakdown {
        display: grid;
        gap: 0.6rem;
      }

      .daily-row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr) auto;
        gap: 0.8rem;
        align-items: center;
      }

      .daily-row time {
        color: var(--muted-foreground);
        font-size: 0.78rem;
        font-family: var(--mono);
      }

      .daily-bars {
        display: flex;
        gap: 0.45rem;
        align-items: center;
      }

      .daily-bar {
        height: 0.52rem;
        min-width: 0.15rem;
        border-radius: 999px;
      }

      .daily-bar.pageviews {
        background: linear-gradient(90deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.45));
      }

      .daily-bar.visitors {
        background: linear-gradient(90deg, rgba(14, 165, 233, 0.9), rgba(14, 165, 233, 0.32));
      }

      .daily-value {
        color: var(--muted-foreground);
        font-size: 0.8rem;
        font-family: var(--mono);
      }

      .mix-stack {
        display: grid;
        gap: 0.9rem;
      }

      .mix-row {
        display: grid;
        gap: 0.45rem;
      }

      .mix-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        font-size: 0.88rem;
      }

      .mix-head span:last-child {
        color: var(--muted-foreground);
        font-family: var(--mono);
      }

      .mix-track {
        height: 0.7rem;
        border-radius: 999px;
        background: var(--muted);
        overflow: hidden;
      }

      .mix-bar {
        height: 100%;
        border-radius: inherit;
      }

      .timeline-list {
        display: grid;
        gap: 0.75rem;
        max-height: 760px;
        overflow: auto;
        padding-right: 0.1rem;
      }

      .timeline-item {
        width: 100%;
        text-align: left;
        display: grid;
        gap: 0.8rem;
        padding: 0.95rem 1rem;
        border: 1px solid var(--border);
        border-radius: 1rem;
        background: #fff;
        color: inherit;
        cursor: pointer;
        transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
      }

      .timeline-item:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow);
      }

      .timeline-item.is-active {
        border-color: rgba(24, 24, 27, 0.26);
        box-shadow: 0 0 0 1px rgba(24, 24, 27, 0.06), 0 12px 30px rgba(24, 24, 27, 0.06);
      }

      .timeline-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }

      .timeline-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.6rem;
        border-radius: 999px;
        background: var(--secondary);
        color: var(--secondary-foreground);
        font-size: 0.74rem;
        font-weight: 600;
      }

      .timeline-date {
        color: var(--muted-foreground);
        font-size: 0.78rem;
        font-family: var(--mono);
      }

      .timeline-main {
        display: grid;
        gap: 0.4rem;
      }

      .timeline-path {
        font-family: var(--mono);
        font-size: 0.84rem;
        word-break: break-word;
      }

      .timeline-note {
        color: var(--muted-foreground);
        font-size: 0.88rem;
        line-height: 1.5;
      }

      .inspector-code {
        min-height: 280px;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 0.95rem;
        background: #09090b;
        color: #fafafa;
      }

      .table-shell {
        border: 1px solid var(--border);
        border-radius: 1rem;
        overflow: hidden;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
      }

      .table thead {
        background: #fafafa;
      }

      .table th,
      .table td {
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
        font-size: 0.88rem;
      }

      .table th {
        color: var(--muted-foreground);
        font-size: 0.74rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .table tr:last-child td {
        border-bottom: 0;
      }

      .path-cell {
        font-family: var(--mono);
        font-size: 0.8rem;
        word-break: break-word;
      }

      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
      }

      .heatmap-grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 0.35rem;
      }

      .heat-cell {
        position: relative;
        aspect-ratio: 1 / 1;
        display: grid;
        place-items: center;
        border: 1px solid rgba(228, 228, 231, 0.9);
        border-radius: 0.6rem;
        background: var(--muted);
        color: var(--muted-foreground);
        font-size: 0.72rem;
        font-family: var(--mono);
      }

      .empty-state {
        padding: 1rem;
        border: 1px dashed var(--border);
        border-radius: 1rem;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(244, 244, 245, 0.55));
        color: var(--muted-foreground);
        font-size: 0.92rem;
        line-height: 1.6;
      }

      .subscribers-hint {
        display: grid;
        gap: 0.55rem;
      }

      @media (max-width: 1360px) {
        .metric-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .content-grid.two-up,
        .content-grid.timeline,
        .content-grid.tables {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 980px) {
        .dashboard-shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: relative;
          height: auto;
          border-right: 0;
          border-bottom: 1px solid var(--border);
        }

        .topbar {
          position: relative;
          padding: 1.2rem 1rem 1rem;
        }

        .page-content {
          padding: 1rem;
        }
      }

      @media (max-width: 720px) {
        .metric-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .button-row {
          grid-template-columns: 1fr;
        }

        .toolbar {
          width: 100%;
        }

        .daily-row {
          grid-template-columns: 1fr;
        }

        .heatmap-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <div class="dashboard-shell">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <section class="brand-card">
            <div class="eyebrow">Growth Workbench</div>
            <div class="brand-title">Site Growth Dashboard</div>
            <p class="brand-copy">Private analytics for pageviews, click paths, subscriber growth, and newsletter operations.</p>
          </section>

          <nav class="sidebar-group" aria-label="Sections">
            <div class="sidebar-label">Sections</div>
            <a class="sidebar-link" href="#overview"><span>Overview</span><small>Metrics + charts</small></a>
            <a class="sidebar-link" href="#timeline"><span>Truth Surface</span><small>Recent events</small></a>
            <a class="sidebar-link" href="#derived"><span>Derived Views</span><small>Pages + clicks</small></a>
            <a class="sidebar-link" href="#subscribers-section"><span>Subscribers</span><small>Newsletter state</small></a>
          </nav>

          <section class="card auth-card">
            <div class="card-header">
              <h2 class="card-title">Command Center</h2>
              <p class="card-description">Paste the admin token, choose a window, then refresh. This shell stays private and speaks directly to the worker.</p>
            </div>
            <div class="card-content">
              <div class="field">
                <label for="token">Admin token</label>
                <input id="token" type="password" autocomplete="off" placeholder="Paste token from Wrangler secret">
              </div>
              <div class="field">
                <label for="days">Time window</label>
                <select id="days">
                  <option value="7">Last 7 days</option>
                  <option value="30" selected>Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
              <div class="button-row">
                <button id="refresh" class="btn btn-primary" type="button">Refresh</button>
                <button id="dispatch" class="btn btn-secondary" type="button">Dispatch</button>
              </div>
              <p id="status-line" class="status-line">Enter your admin token to unlock the dashboard.</p>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Quick Projection</h2>
              <p class="card-description">Fast-glance pages with the most traffic in the active window.</p>
            </div>
            <div class="card-content">
              <div id="top-pages-rail" class="quick-list">
                <div class="empty-state">Top pages will appear here after the first successful fetch.</div>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <div class="main-frame">
        <header class="topbar">
          <div class="topbar-copy">
            <div class="breadcrumbs">
              <span>Growth</span>
              <span>/</span>
              <span>Private Dashboard</span>
            </div>
            <h1>Shadcn-style analytics workbench</h1>
            <p>Timeline-first analytics with a denser dashboard shell: cards for operating metrics, charts for recent movement, and an inspector for raw event truth.</p>
          </div>
          <div class="toolbar">
            <span class="badge"><strong>Worker</strong> Live API</span>
            <span class="badge"><strong>Surface</strong> /dashboard</span>
            <span class="badge" id="last-refresh">No refresh yet</span>
          </div>
        </header>

        <main class="page-content">
          <section id="overview" class="section">
            <div class="section-head">
              <div>
                <h2>Overview</h2>
                <p>Runtime-first metrics and activity trends for the currently selected time window.</p>
              </div>
            </div>

            <div id="summary" class="metric-grid">
              <div class="empty-state">Summary metrics will appear here after the first successful fetch.</div>
            </div>

            <div class="content-grid two-up">
              <section class="card">
                <div class="card-header">
                  <h2 class="card-title">Traffic Trend</h2>
                  <p class="card-description">Pageviews and unique visitors, rendered as the primary time series for the dashboard.</p>
                </div>
                <div class="card-content chart-wrap">
                  <div class="chart-legend">
                    <span class="legend-item"><span class="legend-swatch" style="background: var(--chart-1)"></span>Pageviews</span>
                    <span class="legend-item"><span class="legend-swatch" style="background: var(--chart-2)"></span>Visitors</span>
                  </div>
                  <div id="daily-chart" class="chart-canvas">
                    <div class="empty-state">Daily traffic will render here after the first successful fetch.</div>
                  </div>
                  <div id="daily-breakdown" class="daily-breakdown"></div>
                </div>
              </section>

              <section class="card">
                <div class="card-header">
                  <h2 class="card-title">Signal Mix</h2>
                  <p class="card-description">Relative weight of pageviews, article clicks, tracked UI clicks, and new subscribers.</p>
                </div>
                <div class="card-content">
                  <div id="activity-mix" class="mix-stack">
                    <div class="empty-state">Signal mix will appear here after the first successful fetch.</div>
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section id="timeline" class="section">
            <div class="section-head">
              <div>
                <h2>Truth Surface</h2>
                <p>Recent events are the canonical record. Select an item to inspect its payload and associated metadata.</p>
              </div>
            </div>

            <div class="content-grid timeline">
              <section class="card">
                <div class="card-header">
                  <h2 class="card-title">Recent Events</h2>
                  <p class="card-description">Append-only event stream across page views, clicks, and newsletter actions.</p>
                </div>
                <div class="card-content">
                  <div id="timeline-list" class="timeline-list">
                    <div class="empty-state">No events loaded yet. Refresh after entering a valid token.</div>
                  </div>
                </div>
              </section>

              <div class="section">
                <section class="card">
                  <div class="card-header">
                    <h2 class="card-title">Inspector</h2>
                    <p class="card-description">Selected event payload, ready to inspect without losing chronology.</p>
                  </div>
                  <div class="card-content">
                    <pre id="inspector" class="inspector-code">Select an event in the timeline to inspect it here.</pre>
                  </div>
                </section>

                <section class="card">
                  <div class="card-header">
                    <h2 class="card-title">Click Heatmap</h2>
                    <p class="card-description">Coarse click-density projection for a tracked path. Derived, not canonical.</p>
                  </div>
                  <div class="card-content">
                    <div class="field">
                      <label for="heatmap-path">Tracked path</label>
                      <select id="heatmap-path">
                        <option value="">Choose a page</option>
                      </select>
                    </div>
                    <div id="heatmap-meta" class="badge-row"></div>
                    <div id="heatmap" style="margin-top: 1rem;">
                      <div class="empty-state">Choose a tracked path to see the click heatmap.</div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section id="derived" class="section">
            <div class="section-head">
              <div>
                <h2>Derived Views</h2>
                <p>Rollups and ranking tables derived from the event stream.</p>
              </div>
            </div>

            <div class="content-grid tables">
              <section class="card">
                <div class="card-header">
                  <h2 class="card-title">Top Pages</h2>
                  <p class="card-description">Most-viewed pages in the active window.</p>
                </div>
                <div class="card-content" id="top-pages">
                  <div class="empty-state">Top pages will appear here.</div>
                </div>
              </section>

              <section class="card">
                <div class="card-header">
                  <h2 class="card-title">Top Article Clicks</h2>
                  <p class="card-description">Most-clicked article destinations across tracked listing interactions.</p>
                </div>
                <div class="card-content" id="top-clicks">
                  <div class="empty-state">Top article clicks will appear here.</div>
                </div>
              </section>
            </div>
          </section>

          <section id="subscribers-section" class="section">
            <div class="section-head">
              <div>
                <h2>Subscribers</h2>
                <p>Recent subscribers and their current newsletter state.</p>
              </div>
            </div>

            <section class="card">
              <div class="card-header">
                <h2 class="card-title">Audience</h2>
                <p class="card-description">Saved subscribers, current state, and recent intake from the site.</p>
              </div>
              <div class="card-content" id="subscribers">
                <div class="empty-state">Subscriber state will appear here after the first successful fetch.</div>
              </div>
            </section>
          </section>
        </main>
      </div>
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
        var lastRefreshEl = document.getElementById("last-refresh");
        var summaryEl = document.getElementById("summary");
        var dailyChartEl = document.getElementById("daily-chart");
        var dailyBreakdownEl = document.getElementById("daily-breakdown");
        var activityMixEl = document.getElementById("activity-mix");
        var timelineEl = document.getElementById("timeline-list");
        var inspectorEl = document.getElementById("inspector");
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
          statusLine.className = "status-line" + (kind ? " is-" + kind : "");
        }

        function setLastRefresh(date) {
          if (!date) {
            lastRefreshEl.textContent = "No refresh yet";
            return;
          }
          lastRefreshEl.innerHTML = "<strong>Refreshed</strong> " + escapeHtml(new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }).format(date));
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

        function formatDateLabel(value) {
          if (!value) return "—";
          return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric"
          }).format(new Date(value + "T00:00:00"));
        }

        function formatTimestamp(value) {
          if (!value) return "—";
          return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }).format(new Date(value.replace(" ", "T") + "Z"));
        }

        function buildMetricCard(label, value, hint) {
          return '<div class="metric-card">'
            + '<div class="metric-label">' + escapeHtml(label) + '</div>'
            + '<div class="metric-value">' + formatNumber(value) + '</div>'
            + '<div class="metric-hint">' + escapeHtml(hint) + '</div>'
            + '</div>';
        }

        function renderSummary(summary) {
          if (!summary) {
            summaryEl.innerHTML = '<div class="empty-state">Summary metrics will appear here after the first successful fetch.</div>';
            return;
          }

          summaryEl.innerHTML = [
            buildMetricCard("Pageviews", summary.pageviews, "Primary traffic volume"),
            buildMetricCard("Visitors", summary.uniqueVisitors, "Unique visitors in window"),
            buildMetricCard("Article Clicks", summary.articleClicks, "Tracked article destinations"),
            buildMetricCard("Tracked UI Clicks", summary.uiClicks, "Heatmap-qualified UI clicks"),
            buildMetricCard("Active Subscribers", summary.activeSubscribers, "Current newsletter audience"),
            buildMetricCard("New Subscribers", summary.newSubscribers, "New addresses in selected window")
          ].join("");
        }

        function buildLinePath(points) {
          return points.map(function (point, index) {
            return (index === 0 ? "M " : "L ") + point.x.toFixed(2) + " " + point.y.toFixed(2);
          }).join(" ");
        }

        function buildAreaPath(points, baseline) {
          if (!points.length) return "";
          return "M " + points[0].x.toFixed(2) + " " + baseline.toFixed(2)
            + " L " + points.map(function (point) {
              return point.x.toFixed(2) + " " + point.y.toFixed(2);
            }).join(" L ")
            + " L " + points[points.length - 1].x.toFixed(2) + " " + baseline.toFixed(2)
            + " Z";
        }

        function renderTrendChart(pageviewsRows, visitorsRows) {
          var rows = pageviewsRows || [];
          if (!rows.length) {
            dailyChartEl.innerHTML = '<div class="empty-state">Daily traffic will render here after the first successful fetch.</div>';
            dailyBreakdownEl.innerHTML = "";
            return;
          }

          var visitorMap = Object.create(null);
          (visitorsRows || []).forEach(function (row) {
            visitorMap[row.day] = Number(row.count || 0);
          });

          var width = 760;
          var height = 280;
          var left = 28;
          var top = 18;
          var right = 18;
          var bottom = 42;
          var innerWidth = width - left - right;
          var innerHeight = height - top - bottom;
          var maxValue = 1;

          rows.forEach(function (row) {
            maxValue = Math.max(maxValue, Number(row.count || 0), visitorMap[row.day] || 0);
          });

          var pagePoints = rows.map(function (row, index) {
            var x = left + (rows.length === 1 ? innerWidth / 2 : (index / (rows.length - 1)) * innerWidth);
            var y = top + innerHeight - (Number(row.count || 0) / maxValue) * innerHeight;
            return { x: x, y: y, value: Number(row.count || 0), day: row.day };
          });

          var visitorPoints = rows.map(function (row, index) {
            var x = left + (rows.length === 1 ? innerWidth / 2 : (index / (rows.length - 1)) * innerWidth);
            var value = visitorMap[row.day] || 0;
            var y = top + innerHeight - (value / maxValue) * innerHeight;
            return { x: x, y: y, value: value, day: row.day };
          });

          var gridLines = [0, 0.25, 0.5, 0.75, 1].map(function (ratio) {
            var y = top + innerHeight - ratio * innerHeight;
            var label = Math.round(ratio * maxValue);
            return '<g>'
              + '<line x1="' + left + '" y1="' + y.toFixed(2) + '" x2="' + (width - right) + '" y2="' + y.toFixed(2) + '" stroke="rgba(113,113,122,0.18)" stroke-dasharray="4 6"></line>'
              + '<text x="' + (left - 8) + '" y="' + (y + 4).toFixed(2) + '" text-anchor="end" fill="#71717a" font-size="11">' + escapeHtml(String(label)) + '</text>'
              + '</g>';
          }).join("");

          var labels = rows.map(function (row, index) {
            if (rows.length > 10 && index % 2 === 1 && index !== rows.length - 1) return "";
            var x = left + (rows.length === 1 ? innerWidth / 2 : (index / (rows.length - 1)) * innerWidth);
            return '<text x="' + x.toFixed(2) + '" y="' + (height - 12) + '" text-anchor="middle" fill="#71717a" font-size="11">' + escapeHtml(formatDateLabel(row.day)) + '</text>';
          }).join("");

          dailyChartEl.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Traffic trend">'
            + '<defs>'
            + '<linearGradient id="pv-fill" x1="0" y1="0" x2="0" y2="1">'
            + '<stop offset="0%" stop-color="rgba(15,23,42,0.18)"></stop>'
            + '<stop offset="100%" stop-color="rgba(15,23,42,0.02)"></stop>'
            + '</linearGradient>'
            + '<linearGradient id="uv-fill" x1="0" y1="0" x2="0" y2="1">'
            + '<stop offset="0%" stop-color="rgba(14,165,233,0.22)"></stop>'
            + '<stop offset="100%" stop-color="rgba(14,165,233,0.02)"></stop>'
            + '</linearGradient>'
            + '</defs>'
            + gridLines
            + '<path d="' + buildAreaPath(pagePoints, top + innerHeight) + '" fill="url(#pv-fill)"></path>'
            + '<path d="' + buildAreaPath(visitorPoints, top + innerHeight) + '" fill="url(#uv-fill)"></path>'
            + '<path d="' + buildLinePath(pagePoints) + '" fill="none" stroke="var(--chart-1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>'
            + '<path d="' + buildLinePath(visitorPoints) + '" fill="none" stroke="var(--chart-2)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>'
            + pagePoints.map(function (point) {
              return '<circle cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="4" fill="var(--chart-1)" stroke="#fff" stroke-width="2"></circle>';
            }).join("")
            + visitorPoints.map(function (point) {
              return '<circle cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="4" fill="var(--chart-2)" stroke="#fff" stroke-width="2"></circle>';
            }).join("")
            + labels
            + '</svg>';

          dailyBreakdownEl.innerHTML = rows.map(function (row) {
            var pageviews = Number(row.count || 0);
            var visitors = visitorMap[row.day] || 0;
            return '<div class="daily-row">'
              + '<time datetime="' + escapeHtml(row.day) + '">' + escapeHtml(formatDateLabel(row.day)) + '</time>'
              + '<div class="daily-bars">'
              + '<div class="daily-bar pageviews" style="width:' + Math.max(4, Math.round((pageviews / maxValue) * 220)) + 'px"></div>'
              + '<div class="daily-bar visitors" style="width:' + Math.max(4, Math.round((visitors / maxValue) * 180)) + 'px"></div>'
              + '</div>'
              + '<div class="daily-value">' + formatNumber(pageviews) + ' pv / ' + formatNumber(visitors) + ' uv</div>'
              + '</div>';
          }).join("");
        }

        function renderActivityMix(summary) {
          if (!summary) {
            activityMixEl.innerHTML = '<div class="empty-state">Signal mix will appear here after the first successful fetch.</div>';
            return;
          }

          var rows = [
            { label: "Pageviews", value: Number(summary.pageviews || 0), color: "var(--chart-1)" },
            { label: "Article Clicks", value: Number(summary.articleClicks || 0), color: "var(--chart-3)" },
            { label: "Tracked UI Clicks", value: Number(summary.uiClicks || 0), color: "var(--chart-2)" },
            { label: "New Subscribers", value: Number(summary.newSubscribers || 0), color: "var(--chart-4)" }
          ];
          var max = Math.max.apply(Math, rows.map(function (row) { return row.value; }).concat([1]));

          activityMixEl.innerHTML = rows.map(function (row) {
            return '<div class="mix-row">'
              + '<div class="mix-head"><span>' + escapeHtml(row.label) + '</span><span>' + formatNumber(row.value) + '</span></div>'
              + '<div class="mix-track"><div class="mix-bar" style="width:' + Math.max(row.value ? 8 : 0, Math.round((row.value / max) * 100)) + '%; background:' + row.color + ';"></div></div>'
              + '</div>';
          }).join("");
        }

        function renderTable(title, rows, columns, emptyCopy) {
          if (!rows || !rows.length) {
            return '<div class="empty-state">' + escapeHtml(emptyCopy || (title + " will appear here after data is collected.")) + '</div>';
          }

          var head = columns.map(function (column) {
            return '<th>' + escapeHtml(column.label) + '</th>';
          }).join("");

          var body = rows.map(function (row) {
            return '<tr>' + columns.map(function (column) {
              var value = row[column.key];
              var text = column.format ? column.format(value, row) : formatNumber(value);
              var className = column.kind === "path" ? "path-cell" : "";
              return '<td class="' + className + '">' + escapeHtml(text || "—") + '</td>';
            }).join("") + '</tr>';
          }).join("");

          return '<div class="table-shell"><table class="table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
        }

        function renderTopPages(rows) {
          state.topPages = rows || [];
          topPagesEl.innerHTML = renderTable(
            "Top pages",
            rows,
            [
              { key: "pathname", label: "Path", kind: "path", format: function (value) { return value || "—"; } },
              { key: "pageviews", label: "Pageviews" },
              { key: "uniqueVisitors", label: "Visitors" }
            ],
            "Top pages will appear here after data is collected."
          );

          if (!rows || !rows.length) {
            topPagesRailEl.innerHTML = '<div class="empty-state">Top pages will appear here after the first successful fetch.</div>';
            heatmapPathEl.innerHTML = '<option value="">Choose a page</option>';
            return;
          }

          topPagesRailEl.innerHTML = rows.slice(0, 5).map(function (row) {
            return '<div class="quick-item">'
              + '<strong>' + escapeHtml(row.pathname) + '</strong>'
              + '<small>' + formatNumber(row.pageviews) + ' pageviews · ' + formatNumber(row.uniqueVisitors) + ' visitors</small>'
              + '</div>';
          }).join("");

          var options = ['<option value="">Choose a page</option>'];
          rows.forEach(function (row) {
            options.push('<option value="' + escapeHtml(row.pathname) + '">' + escapeHtml(row.pathname) + '</option>');
          });
          var currentValue = heatmapPathEl.value;
          heatmapPathEl.innerHTML = options.join("");
          if (currentValue && rows.some(function (row) { return row.pathname === currentValue; })) {
            heatmapPathEl.value = currentValue;
          }
        }

        function renderTopClicks(rows) {
          topClicksEl.innerHTML = renderTable(
            "Top article clicks",
            rows,
            [
              { key: "targetPath", label: "Target", kind: "path", format: function (value) { return value || "—"; } },
              { key: "clicks", label: "Clicks" },
              { key: "uniqueVisitors", label: "Visitors" }
            ],
            "Top article clicks will appear here after tracked article clicks are collected."
          );
        }

        function renderSubscribers(rows) {
          if (!rows || !rows.length) {
            subscribersEl.innerHTML = '<div class="empty-state">No subscribers yet. Once the site collects email signups, they will appear here.</div>';
            return;
          }

          subscribersEl.innerHTML = renderTable(
            "Subscribers",
            rows,
            [
              { key: "email", label: "Email", format: function (value) { return value || "—"; } },
              { key: "status", label: "Status", format: function (value) { return value || "—"; } },
              { key: "sourcePage", label: "Source", kind: "path", format: function (value) { return value || "—"; } },
              { key: "createdAt", label: "Created", format: function (value) { return value || "—"; } }
            ],
            "No subscribers yet."
          );
        }

        function renderInspector(item) {
          if (!item) {
            inspectorEl.textContent = "Select an event in the timeline to inspect it here.";
            return;
          }
          inspectorEl.textContent = JSON.stringify(item, null, 2);
        }

        function eventSummary(row) {
          if (!row) return "";
          if (row.context && row.targetText) return row.context + " · " + row.targetText;
          if (row.context) return "Context: " + row.context;
          if (row.targetText) return row.targetText;
          if (row.pageTitle) return row.pageTitle;
          return "No extra context";
        }

        function renderTimeline(rows) {
          state.recentEvents = rows || [];
          if (!rows || !rows.length) {
            timelineEl.innerHTML = '<div class="empty-state">No tracked events yet. Once the site posts pageviews or clicks, the truth surface will populate.</div>';
            renderInspector(null);
            return;
          }

          if (state.selectedEventId == null && rows.length) {
            state.selectedEventId = rows[0].id;
          }

          var selected = rows.find(function (row) { return row.id === state.selectedEventId; }) || rows[0];
          state.selectedEventId = selected.id;

          timelineEl.innerHTML = rows.map(function (row) {
            var active = row.id === state.selectedEventId ? " is-active" : "";
            var path = row.targetPath || row.pathname || "—";
            return '<button type="button" class="timeline-item' + active + '" data-event-id="' + row.id + '">'
              + '<div class="timeline-meta">'
              + '<span class="timeline-badge">' + escapeHtml(row.eventType) + '</span>'
              + '<span class="timeline-date">' + escapeHtml(formatTimestamp(row.createdAt)) + '</span>'
              + '</div>'
              + '<div class="timeline-main">'
              + '<div class="timeline-path">' + escapeHtml(path) + '</div>'
              + '<div class="timeline-note">' + escapeHtml(eventSummary(row)) + '</div>'
              + '</div>'
              + '</button>';
          }).join("");

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
            heatmapMetaEl.innerHTML = "";
            heatmapEl.innerHTML = '<div class="empty-state">Choose a tracked path to see the click heatmap.</div>';
            return;
          }

          heatmapMetaEl.innerHTML = '<span class="badge"><strong>Path</strong> ' + escapeHtml(data.path) + '</span>'
            + '<span class="badge"><strong>Clicks</strong> ' + formatNumber(data.totalClicks || 0) + '</span>'
            + '<span class="badge"><strong>Grid</strong> ' + escapeHtml(data.xBins + "×" + data.yBins) + '</span>';

          if (!data.totalClicks) {
            heatmapEl.innerHTML = '<div class="empty-state">No tracked clicks for this path in the selected window.</div>';
            return;
          }

          var max = Math.max.apply(Math, (data.cells || []).map(function (row) { return row.count; }).concat([1]));

          heatmapEl.innerHTML = '<div class="heatmap-grid">' + (data.cells || []).map(function (cell) {
            var alpha = cell.count ? Math.max(0.14, cell.count / max) : 0.06;
            return '<div class="heat-cell" style="background: rgba(15, 23, 42, ' + alpha.toFixed(3) + '); color:' + (cell.count ? "#fafafa" : "#71717a") + ';">'
              + (cell.count ? formatNumber(cell.count) : "")
              + '</div>';
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

          setStatus("Refreshing dashboard…");

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
            renderTrendChart(results[0].dailyPageviews || [], results[0].dailyVisitors || []);
            renderActivityMix(results[0]);
            renderTopPages(results[1].rows || []);
            renderTopClicks(results[2].rows || []);
            renderTimeline(results[3].rows || []);
            renderSubscribers(results[4].rows || []);

            if (!heatmapPathEl.value && state.topPages.length) {
              heatmapPathEl.value = state.topPages[0].pathname;
            }
            await loadHeatmap(heatmapPathEl.value);
            setLastRefresh(new Date());
            setStatus("Dashboard refreshed.", "ok");
          } catch (error) {
            console.error(error);
            setStatus(error.message || "Dashboard refresh failed.", "error");
          }
        }

        async function runDispatch() {
          state.token = tokenInput.value.trim();
          if (!state.token) {
            setStatus("Enter the admin token before dispatching newsletter deliveries.", "error");
            return;
          }

          setStatus("Running newsletter dispatch…");
          try {
            var result = await api("/api/admin/dispatch-now", { method: "POST" });
            setStatus(
              "Dispatch finished. Created " + formatNumber(result.createdDispatches)
                + " dispatches and sent " + formatNumber(result.sentDeliveries) + " emails.",
              "ok"
            );
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
            setStatus(error.message || "Failed to load click heatmap.", "error");
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
