const SVG_ATTR =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const ICONS: Record<string, string> = {
  layers:
    '<svg ' + SVG_ATTR + '><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>',
  dashboard:
    '<svg ' + SVG_ATTR + '><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  chart:
    '<svg ' + SVG_ATTR + '><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
  activity:
    '<svg ' + SVG_ATTR + '><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.68 3.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4.44 13H2"/></svg>',
  table:
    '<svg ' + SVG_ATTR + '><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
  users:
    '<svg ' + SVG_ATTR + '><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  refresh:
    '<svg ' + SVG_ATTR + '><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
  send:
    '<svg ' + SVG_ATTR + '><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  x:
    '<svg ' + SVG_ATTR + '><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  menu:
    '<svg ' + SVG_ATTR + '><path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/></svg>',
  key:
    '<svg ' + SVG_ATTR + '><path d="M21 2 19 4"/><path d="m16.5 4.5 3 3"/><path d="m14 7 7-7"/><path d="M15.5 15.5a5 5 0 1 1-7.07-7.07 5 5 0 0 1 7.07 7.07Z"/><path d="m11 11-7 7"/><path d="m9 13 2 2"/></svg>',
  info:
    '<svg ' + SVG_ATTR + '><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  copy:
    '<svg ' + SVG_ATTR + '><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  eye:
    '<svg ' + SVG_ATTR + '><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
};

const HEAD_META = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://rsms.me/">
<link rel="stylesheet" href="https://rsms.me/inter/inter.css">
<title>Growth Workbench · Dashboard</title>`;

const CSS = `
:root {
  color-scheme: light;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --success: oklch(0.62 0.15 152);
  --warning: oklch(0.73 0.18 75);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  --mono: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.08);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04);
}

@supports (font-variation-settings: normal) {
  :root { --sans: "InterVariable", ui-sans-serif, system-ui, sans-serif; }
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
html, body { margin: 0; padding: 0; }
body {
  min-height: 100vh;
  font-family: var(--sans);
  font-feature-settings: "cv02", "cv03", "cv04", "cv11", "ss01";
  color: var(--foreground);
  background: var(--background);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
a { color: inherit; text-decoration: none; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: var(--mono); font-size: 0.78125rem; line-height: 1.55; }
kbd {
  display: inline-flex; align-items: center; height: 1.1rem; padding: 0 0.3rem;
  font-family: var(--sans); font-size: 0.6875rem; font-weight: 500;
  border: 1px solid var(--border); border-radius: calc(var(--radius) - 0.375rem);
  background: var(--background); color: var(--muted-foreground);
}
section[id] { scroll-margin-top: 4.5rem; }
::selection { background: color-mix(in oklch, var(--primary), transparent 80%); }

.app {
  display: grid;
  grid-template-columns: 16rem minmax(0, 1fr);
  min-height: 100vh;
}

/* ============ Sidebar ============ */
.sidebar {
  position: sticky; top: 0; align-self: start;
  display: flex; flex-direction: column;
  height: 100vh;
  background: var(--sidebar);
  color: var(--sidebar-foreground);
  border-right: 1px solid var(--sidebar-border);
}
.sidebar-top {
  padding: 0.625rem;
  border-bottom: 1px solid var(--sidebar-border);
}
.sidebar-brand {
  display: flex; align-items: center; gap: 0.625rem;
  width: 100%; padding: 0.5rem 0.625rem;
  background: transparent; border: 0; text-align: left;
  border-radius: calc(var(--radius) - 0.125rem);
  cursor: default;
}
.sidebar-brand-icon {
  width: 2rem; height: 2rem;
  display: grid; place-items: center;
  background: var(--sidebar-primary); color: var(--sidebar-primary-foreground);
  border-radius: calc(var(--radius) - 0.25rem);
}
.sidebar-brand-icon svg { width: 1rem; height: 1rem; }
.sidebar-brand-text { display: grid; gap: 0.125rem; min-width: 0; }
.sidebar-brand-text strong { font-size: 0.8125rem; font-weight: 600; letter-spacing: -0.01em; }
.sidebar-brand-text small { color: var(--muted-foreground); font-size: 0.75rem; }

.sidebar-content {
  flex: 1; overflow-y: auto;
  padding: 0.5rem;
  display: grid; gap: 1rem; align-content: start;
}
.sidebar-group { display: grid; gap: 0.125rem; }
.sidebar-group-label {
  padding: 0.5rem 0.625rem 0.25rem;
  color: var(--muted-foreground);
  font-size: 0.75rem; font-weight: 500;
}
.sidebar-item {
  display: flex; align-items: center; gap: 0.625rem;
  width: 100%; padding: 0.4375rem 0.625rem;
  background: transparent; border: 0; text-align: left;
  color: var(--sidebar-foreground); font-size: 0.875rem;
  border-radius: calc(var(--radius) - 0.125rem);
  transition: background 0.15s ease, color 0.15s ease;
}
.sidebar-item:hover { background: var(--sidebar-accent); color: var(--sidebar-accent-foreground); }
.sidebar-item.is-active {
  background: var(--sidebar-accent);
  color: var(--sidebar-accent-foreground);
  font-weight: 500;
}
.sidebar-item svg { width: 1rem; height: 1rem; flex-shrink: 0; color: var(--muted-foreground); }
.sidebar-item.is-active svg { color: var(--sidebar-accent-foreground); }
.sidebar-item-text { flex: 1; min-width: 0; }
.sidebar-item kbd { margin-left: auto; }

.sidebar-footer {
  padding: 0.625rem;
  border-top: 1px solid var(--sidebar-border);
}
.sidebar-status {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  background: var(--sidebar-accent);
  border-radius: calc(var(--radius) - 0.125rem);
}
.sidebar-status > div { flex: 1; min-width: 0; display: grid; gap: 0.0625rem; }
.sidebar-status strong { font-size: 0.8125rem; font-weight: 500; }
.sidebar-status small {
  font-size: 0.75rem; color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.status-dot {
  width: 0.5rem; height: 0.5rem; border-radius: 999px;
  background: var(--success); flex-shrink: 0;
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--success), transparent 82%);
}
.sidebar-clear {
  width: 1.75rem; height: 1.75rem;
  display: grid; place-items: center;
  background: transparent; border: 0;
  color: var(--muted-foreground);
  border-radius: calc(var(--radius) - 0.25rem);
  flex-shrink: 0;
}
.sidebar-clear:hover { background: var(--sidebar); color: var(--foreground); }
.sidebar-clear svg { width: 0.875rem; height: 0.875rem; }

.sidebar-overlay {
  display: none;
  position: fixed; inset: 0;
  background: rgb(0 0 0 / 0.4);
  z-index: 40;
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s ease;
}
.sidebar-overlay[data-state="open"] { opacity: 1; pointer-events: auto; }

/* ============ Main frame ============ */
.main-frame { min-width: 0; display: flex; flex-direction: column; }

.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 0.75rem;
  min-height: 3.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in oklch, var(--background), transparent 12%);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  backdrop-filter: saturate(160%) blur(14px);
}
.topbar-toggle {
  display: none;
  width: 2rem; height: 2rem;
  place-items: center;
  background: transparent; border: 0;
  color: var(--foreground);
  border-radius: calc(var(--radius) - 0.25rem);
}
.topbar-toggle:hover { background: var(--accent); }
.topbar-toggle svg { width: 1.1rem; height: 1.1rem; }

.breadcrumb {
  display: flex; align-items: center; gap: 0.5rem;
  flex: 1; min-width: 0;
  color: var(--muted-foreground); font-size: 0.8125rem;
}
.breadcrumb-sep { opacity: 0.5; }
.breadcrumb-current { color: var(--foreground); font-weight: 500; }

.topbar-actions {
  position: relative;
  display: flex; align-items: center; gap: 0.5rem;
}

/* ============ Tabs (shadcn inspired) ============ */
.tabs {
  display: inline-flex;
  padding: 0.1875rem;
  background: var(--muted);
  border-radius: calc(var(--radius) - 0.125rem);
  gap: 0.0625rem;
}
.tab {
  padding: 0.3125rem 0.75rem;
  background: transparent; border: 0;
  color: var(--muted-foreground);
  font-size: 0.8125rem; font-weight: 500;
  font-variant-numeric: tabular-nums;
  border-radius: calc(var(--radius) - 0.25rem);
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.tab:hover { color: var(--foreground); }
.tab.is-active {
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--shadow-xs);
}

/* ============ Button ============ */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 0.4375rem;
  height: 2.25rem; padding: 0 0.875rem;
  background: var(--background); color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 0.125rem);
  font-size: 0.8125rem; font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.btn:hover { background: var(--accent); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn svg { width: 0.9375rem; height: 0.9375rem; }
.btn-primary {
  background: var(--primary); color: var(--primary-foreground);
  border-color: var(--primary);
}
.btn-primary:hover { background: color-mix(in oklch, var(--primary), white 8%); }
.btn-ghost { background: transparent; border-color: transparent; }
.btn-ghost:hover { background: var(--accent); }
.btn-sm { height: 2rem; padding: 0 0.75rem; }
.btn-xs { height: 1.75rem; padding: 0 0.5rem; font-size: 0.75rem; gap: 0.3125rem; }
.btn-xs svg { width: 0.8125rem; height: 0.8125rem; }

/* ============ Popover ============ */
.popover {
  position: absolute; top: calc(100% + 0.5rem); right: 0;
  min-width: 20rem;
  padding: 0.75rem;
  background: var(--popover); color: var(--popover-foreground);
  border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 30;
  display: grid; gap: 0.625rem;
}
.popover[hidden] { display: none; }
.popover-title { font-size: 0.8125rem; font-weight: 600; letter-spacing: -0.01em; }
.popover-description { margin: 0.125rem 0 0; color: var(--muted-foreground); font-size: 0.75rem; line-height: 1.5; }

/* ============ Field / Input / Select ============ */
.field { display: grid; gap: 0.375rem; }
.field-label { color: var(--foreground); font-size: 0.8125rem; font-weight: 500; }
.input, .select {
  width: 100%; height: 2.25rem;
  padding: 0 0.75rem;
  background: var(--background); color: var(--foreground);
  border: 1px solid var(--input); border-radius: calc(var(--radius) - 0.125rem);
  font-size: 0.8125rem;
  outline: 0;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input:focus, .select:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring), transparent 75%);
}
.select {
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 0.875rem;
  padding-right: 1.875rem;
}

/* ============ Page content ============ */
.page-content {
  padding: 1.25rem 1.5rem 2.5rem;
  display: grid; gap: 1.25rem;
}
.page-header {
  display: flex; flex-wrap: wrap;
  align-items: flex-end; justify-content: space-between;
  gap: 1rem;
}
.page-header h1 {
  margin: 0 0 0.375rem;
  font-size: clamp(1.375rem, 1.1rem + 0.9vw, 1.75rem);
  font-weight: 600; letter-spacing: -0.03em;
}
.page-header p {
  margin: 0; max-width: 56rem;
  color: var(--muted-foreground); font-size: 0.875rem; line-height: 1.55;
}

/* ============ Alert ============ */
.alert {
  display: flex; align-items: center; gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 0.875rem;
  background: var(--secondary); color: var(--secondary-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 0.125rem);
  font-size: 0.8125rem;
}
.alert svg { width: 0.9375rem; height: 0.9375rem; flex-shrink: 0; color: var(--muted-foreground); }
.alert.is-error {
  background: color-mix(in oklch, var(--destructive), transparent 92%);
  color: color-mix(in oklch, var(--destructive), black 15%);
  border-color: color-mix(in oklch, var(--destructive), transparent 78%);
}
.alert.is-error svg { color: var(--destructive); }
.alert.is-ok {
  background: color-mix(in oklch, var(--success), transparent 92%);
  color: color-mix(in oklch, var(--success), black 22%);
  border-color: color-mix(in oklch, var(--success), transparent 78%);
}
.alert.is-ok svg { color: var(--success); }

/* ============ Card ============ */
.card {
  display: flex; flex-direction: column;
  background: var(--card); color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}
.card-header {
  padding: 1rem 1.25rem 0.875rem;
  display: grid; gap: 0.375rem;
}
.card-header-between {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 1rem; flex-wrap: wrap;
}
.card-header-between > :first-child { display: grid; gap: 0.375rem; min-width: 0; }
.card-title { margin: 0; font-size: 0.9375rem; font-weight: 600; letter-spacing: -0.01em; }
.card-description { margin: 0; color: var(--muted-foreground); font-size: 0.8125rem; line-height: 1.5; }
.card-content { padding: 0.75rem 1.25rem 1.25rem; }
.card-content-flush { padding: 0; }

/* ============ KPI grid ============ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}
.kpi-card {
  padding: 1.125rem 1.25rem 1rem;
  background:
    radial-gradient(120% 120% at 100% 0%, color-mix(in oklch, var(--accent), transparent 70%) 0%, transparent 55%),
    var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-xs);
  display: grid; gap: 0.4375rem;
}
.kpi-label {
  color: var(--muted-foreground);
  font-size: 0.8125rem; font-weight: 500;
}
.kpi-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem;
}
.kpi-value {
  font-size: 1.75rem; font-weight: 600;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.kpi-delta {
  display: inline-flex; align-items: center; gap: 0.1875rem;
  padding: 0.1875rem 0.4375rem;
  background: var(--muted); color: var(--muted-foreground);
  border-radius: calc(var(--radius) - 0.25rem);
  font-size: 0.75rem; font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.kpi-delta svg { width: 0.75rem; height: 0.75rem; stroke-width: 2.5; }
.kpi-delta.is-up {
  background: color-mix(in oklch, var(--success), transparent 88%);
  color: color-mix(in oklch, var(--success), black 18%);
}
.kpi-delta.is-down {
  background: color-mix(in oklch, var(--destructive), transparent 88%);
  color: color-mix(in oklch, var(--destructive), black 12%);
}
.kpi-spark {
  display: block;
  width: 100%;
  height: 2.25rem;
  margin-top: 0.125rem;
  opacity: 0.9;
}
.kpi-hint {
  color: var(--muted-foreground); font-size: 0.75rem; line-height: 1.4;
}

/* ============ Chart ============ */
.chart-header {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 0.75rem; margin-bottom: 0.75rem;
}
.chart-legend {
  display: flex; flex-wrap: wrap; gap: 0.75rem;
}
.legend-item {
  display: inline-flex; align-items: center; gap: 0.375rem;
  color: var(--muted-foreground); font-size: 0.75rem;
}
.legend-swatch { width: 0.5rem; height: 0.5rem; border-radius: 999px; }
.chart-canvas { min-height: 18.75rem; }
.chart-canvas svg { width: 100%; height: auto; display: block; }

.daily-breakdown {
  margin-top: 0.875rem;
  display: grid; gap: 0.375rem;
  max-height: 12rem;
  overflow-y: auto;
  padding-top: 0.875rem;
  border-top: 1px dashed var(--border);
}
.daily-row {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) auto;
  gap: 0.75rem; align-items: center;
}
.daily-row time {
  color: var(--muted-foreground); font-size: 0.75rem;
  font-family: var(--mono); font-variant-numeric: tabular-nums;
}
.daily-bars { display: flex; gap: 0.375rem; align-items: center; }
.daily-bar { height: 0.375rem; min-width: 0.125rem; border-radius: 999px; }
.daily-bar.pageviews { background: var(--chart-1); opacity: 0.9; }
.daily-bar.visitors { background: var(--chart-2); opacity: 0.9; }
.daily-value {
  color: var(--muted-foreground); font-size: 0.75rem;
  font-family: var(--mono); font-variant-numeric: tabular-nums;
}

/* ============ Splits ============ */
.split { display: grid; gap: 1rem; }
.split-events { grid-template-columns: minmax(0, 1.65fr) minmax(20rem, 1fr); }
.split-tables { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.stack { display: grid; gap: 1rem; align-content: start; }

/* ============ Timeline ============ */
.timeline-list {
  display: grid; gap: 0.4375rem;
  max-height: 40rem;
  overflow-y: auto;
  padding: 0.125rem;
}
.timeline-item {
  width: 100%; text-align: left;
  display: grid; gap: 0.4375rem;
  padding: 0.75rem 0.875rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 0.125rem);
  color: inherit;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.timeline-item:hover {
  background: color-mix(in oklch, var(--accent), transparent 30%);
  border-color: color-mix(in oklch, var(--ring), transparent 60%);
}
.timeline-item.is-active {
  background: color-mix(in oklch, var(--accent), transparent 20%);
  border-color: var(--primary);
  box-shadow: 0 0 0 1px color-mix(in oklch, var(--primary), transparent 82%);
}
.timeline-meta { display: flex; align-items: center; gap: 0.4375rem; flex-wrap: wrap; }
.timeline-date {
  margin-left: auto;
  color: var(--muted-foreground); font-size: 0.6875rem;
  font-family: var(--mono); font-variant-numeric: tabular-nums;
}
.timeline-path {
  font-family: var(--mono); font-size: 0.78125rem;
  word-break: break-word; line-height: 1.45;
}
.timeline-note {
  color: var(--muted-foreground); font-size: 0.8125rem; line-height: 1.45;
}

/* ============ Badge ============ */
.badge {
  display: inline-flex; align-items: center; gap: 0.3125rem;
  padding: 0.1875rem 0.5rem;
  background: var(--secondary); color: var(--secondary-foreground);
  border: 1px solid transparent;
  border-radius: calc(var(--radius) - 0.25rem);
  font-size: 0.6875rem; font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.badge strong { font-weight: 600; }
.badge-outline {
  background: transparent; border-color: var(--border);
  color: var(--muted-foreground);
}
.badge-page_view {
  background: color-mix(in oklch, var(--chart-1), transparent 86%);
  color: color-mix(in oklch, var(--chart-1), black 15%);
}
.badge-article_click {
  background: color-mix(in oklch, var(--chart-2), transparent 86%);
  color: color-mix(in oklch, var(--chart-2), black 20%);
}
.badge-ui_click {
  background: color-mix(in oklch, var(--chart-4), transparent 84%);
  color: color-mix(in oklch, var(--chart-4), black 32%);
}
.badge-newsletter_signup {
  background: color-mix(in oklch, var(--success), transparent 86%);
  color: color-mix(in oklch, var(--success), black 22%);
}
.badge-sent {
  background: color-mix(in oklch, var(--success), transparent 86%);
  color: color-mix(in oklch, var(--success), black 22%);
}
.badge-failed {
  background: color-mix(in oklch, var(--destructive), transparent 86%);
  color: color-mix(in oklch, var(--destructive), black 18%);
}
.badge-welcome {
  background: color-mix(in oklch, var(--chart-5), transparent 84%);
  color: color-mix(in oklch, var(--chart-5), black 32%);
}
.badge-new {
  background: color-mix(in oklch, var(--chart-1), transparent 86%);
  color: color-mix(in oklch, var(--chart-1), black 15%);
}
.badge-updated {
  background: color-mix(in oklch, var(--chart-2), transparent 86%);
  color: color-mix(in oklch, var(--chart-2), black 20%);
}
.badge-row { display: flex; flex-wrap: wrap; gap: 0.375rem; margin: 0.625rem 0 0; }

/* ============ Inspector ============ */
.inspector {
  margin: 0;
  padding: 0.875rem 1rem;
  min-height: 16rem;
  max-height: 30rem;
  overflow: auto;
  background: oklch(0.16 0 0);
  color: oklch(0.92 0 0);
  border-radius: calc(var(--radius) - 0.125rem);
  font-size: 0.78125rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--mono);
}
.inspector.is-empty { color: oklch(0.58 0 0); font-style: italic; }

/* ============ Table ============ */
.table-wrap { overflow-x: auto; }
.table {
  width: 100%; border-collapse: collapse;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
.table th, .table td {
  padding: 0.5625rem 1rem;
  text-align: left; vertical-align: middle;
  border-bottom: 1px solid var(--border);
}
.table th {
  background: var(--muted); color: var(--muted-foreground);
  font-size: 0.75rem; font-weight: 500;
  position: sticky; top: 0; z-index: 1;
}
.table tbody tr:last-child td { border-bottom: 0; }
.table tbody tr:hover td {
  background: color-mix(in oklch, var(--accent), transparent 55%);
}
.table .path-cell {
  font-family: var(--mono); font-size: 0.75rem;
  max-width: 22rem; word-break: break-word;
}
.table .stack-cell {
  display: grid;
  gap: 0.1875rem;
  min-width: 12rem;
}
.table .stack-cell strong {
  font-size: 0.78125rem;
  font-weight: 600;
  line-height: 1.4;
}
.table .stack-cell span {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  line-height: 1.45;
  word-break: break-word;
}
.table .num-cell { text-align: right; white-space: nowrap; }
.table .bar-cell { width: 6.5rem; }
.inline-bar {
  position: relative;
  height: 0.3125rem;
  background: var(--muted);
  border-radius: 999px;
  overflow: hidden;
}
.inline-bar > span {
  position: absolute; left: 0; top: 0; bottom: 0;
  background: var(--chart-1);
  border-radius: 999px;
}
.inline-bar.is-blue > span { background: var(--chart-2); }

/* ============ Heatmap ============ */
.heatmap-wrap { margin-top: 0.75rem; }
.heatmap-preview {
  position: relative;
  height: 16rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 0.125rem);
  overflow: hidden;
  margin-bottom: 0.75rem;
  background: var(--muted);
}
.heatmap-iframe {
  width: 100%; height: 100%;
  border: 0; background: var(--background);
}
.heatmap-preview-label {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 0.3125rem 0.625rem;
  background: color-mix(in oklch, var(--background), transparent 12%);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  border-top: 1px solid var(--border);
  font-size: 0.6875rem; color: var(--muted-foreground);
  text-align: center;
}
.heatmap-axis {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.25rem 0 0.25rem 1.5rem;
  font-size: 0.6875rem; color: var(--muted-foreground);
  font-family: var(--mono);
}
.heatmap-labeled-grid {
  display: grid;
  grid-template-columns: 1.375rem repeat(12, minmax(0, 1fr));
  gap: 2px;
}
.heatmap-col-num, .heatmap-row-num, .heatmap-corner {
  display: grid; place-items: center;
  font-size: 0.5625rem; color: var(--muted-foreground);
  font-family: var(--mono); font-variant-numeric: tabular-nums;
  user-select: none;
}
.heatmap-row-num { justify-items: end; padding-right: 0.25rem; }
.heat-cell {
  aspect-ratio: 1 / 1;
  display: grid; place-items: center;
  border: 1px solid var(--border);
  background: var(--muted); color: var(--muted-foreground);
  border-radius: calc(var(--radius) - 0.375rem);
  font-size: 0.6875rem;
  font-family: var(--mono); font-variant-numeric: tabular-nums;
  transition: transform 0.12s ease;
}
.heat-cell:hover { transform: scale(1.15); z-index: 1; }

/* ============ Empty state ============ */
.empty-state {
  padding: 1rem 1.25rem;
  color: var(--muted-foreground); font-size: 0.875rem; line-height: 1.55;
  border: 1px dashed var(--border);
  border-radius: calc(var(--radius) - 0.125rem);
  background: color-mix(in oklch, var(--muted), transparent 72%);
}
.empty-state-flush { margin: 1rem; }

/* ============ Section ============ */
.section { display: grid; gap: 0.75rem; }
.section-head { display: grid; gap: 0.25rem; }
.section-head h2 { margin: 0; font-size: 0.9375rem; font-weight: 600; letter-spacing: -0.01em; }
.section-head p { margin: 0; color: var(--muted-foreground); font-size: 0.8125rem; line-height: 1.5; }

/* ============ Responsive ============ */
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .split-events, .split-tables { grid-template-columns: 1fr; }
}
@media (max-width: 980px) {
  .app { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed; top: 0; bottom: 0; left: 0;
    width: 17rem;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    z-index: 50;
    box-shadow: var(--shadow-lg);
  }
  .sidebar[data-state="open"] { transform: translateX(0); }
  .sidebar-overlay { display: block; }
  .topbar-toggle { display: grid; }
  .page-content { padding: 1rem; gap: 1rem; }
}
@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .page-content { padding: 0.75rem; gap: 0.875rem; }
  .card-header, .card-content { padding-left: 1rem; padding-right: 1rem; }
  .topbar { padding: 0.5rem 0.875rem; }
  .topbar-actions .btn-ghost span { display: none; }
  .breadcrumb span:nth-child(1), .breadcrumb span:nth-child(2) { display: none; }
}
`;

const BODY_HTML = `
<div class="sidebar-overlay" id="sidebar-overlay"></div>
<div class="app">
  <aside class="sidebar" id="sidebar" aria-label="Primary navigation">
    <div class="sidebar-top">
      <button class="sidebar-brand" type="button" aria-label="Growth Workbench">
        <span class="sidebar-brand-icon">${ICONS.layers}</span>
        <span class="sidebar-brand-text">
          <strong>Growth Workbench</strong>
          <small>Site analytics · private</small>
        </span>
      </button>
    </div>
    <div class="sidebar-content">
      <nav class="sidebar-group" aria-label="Sections">
        <div class="sidebar-group-label">Platform</div>
        <a class="sidebar-item is-active" href="#overview" data-section="overview">
          ${ICONS.dashboard}<span class="sidebar-item-text">Overview</span>
        </a>
        <a class="sidebar-item" href="#analytics" data-section="analytics">
          ${ICONS.chart}<span class="sidebar-item-text">Analytics</span>
        </a>
        <a class="sidebar-item" href="#events" data-section="events">
          ${ICONS.activity}<span class="sidebar-item-text">Events</span>
        </a>
        <a class="sidebar-item" href="#tables" data-section="tables">
          ${ICONS.table}<span class="sidebar-item-text">Top lists</span>
        </a>
        <a class="sidebar-item" href="#subscribers-section" data-section="subscribers-section">
          ${ICONS.users}<span class="sidebar-item-text">Subscribers</span>
        </a>
      </nav>
      <nav class="sidebar-group" aria-label="Actions">
        <div class="sidebar-group-label">Actions</div>
        <button class="sidebar-item" type="button" data-action="refresh">
          ${ICONS.refresh}<span class="sidebar-item-text">Refresh</span><kbd>R</kbd>
        </button>
        <button class="sidebar-item" type="button" data-action="dispatch">
          ${ICONS.send}<span class="sidebar-item-text">Dispatch newsletter</span>
        </button>
      </nav>
    </div>
    <div class="sidebar-footer">
      <div class="sidebar-status">
        <span class="status-dot" aria-hidden="true"></span>
        <div>
          <strong>Worker live</strong>
          <small id="last-refresh">No refresh yet</small>
        </div>
        <button class="sidebar-clear" type="button" data-action="logout" aria-label="End Access session">
          ${ICONS.x}
        </button>
      </div>
    </div>
  </aside>

  <div class="main-frame">
    <header class="topbar">
      <button class="topbar-toggle" type="button" data-action="toggle-sidebar" aria-label="Toggle navigation">
        ${ICONS.menu}
      </button>
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Growth</span>
        <span class="breadcrumb-sep">/</span>
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">Overview</span>
      </nav>
      <div class="topbar-actions">
        <div class="tabs" data-tabs="days" role="tablist" aria-label="Time window">
          <button class="tab" type="button" data-value="7" role="tab" aria-selected="false">7d</button>
          <button class="tab is-active" type="button" data-value="30" role="tab" aria-selected="true">30d</button>
          <button class="tab" type="button" data-value="90" role="tab" aria-selected="false">90d</button>
        </div>
        <button class="btn btn-ghost" type="button" data-action="toggle-settings" aria-expanded="false" aria-haspopup="dialog">
          ${ICONS.key}<span>Session</span>
        </button>
        <button id="refresh" class="btn btn-primary" type="button">
          ${ICONS.refresh}<span>Refresh</span>
        </button>
        <div class="popover" id="settings-popover" role="dialog" aria-label="Admin settings" hidden>
          <div>
            <p class="popover-title">Cloudflare Access</p>
            <p class="popover-description">This dashboard is protected by Cloudflare Access. Your browser session is sent as an HttpOnly Access cookie.</p>
          </div>
          <button id="dispatch" class="btn btn-sm" type="button" style="justify-content: flex-start;">
            ${ICONS.send}<span>Dispatch newsletter now</span>
          </button>
        </div>
      </div>
    </header>

    <main class="page-content">
      <section class="page-header">
        <div>
          <h1>Site Growth Dashboard</h1>
          <p>Private analytics for pageviews, click paths, subscriber growth, and newsletter operations.</p>
        </div>
        <p id="status-line" class="alert">${ICONS.info}<span>Loading protected analytics…</span></p>
      </section>

      <section id="overview" class="section">
        <div id="summary" class="kpi-grid">
          <div class="empty-state">Summary metrics will appear here after the first successful fetch.</div>
        </div>
      </section>

      <section id="analytics" class="section">
        <div class="card">
          <div class="card-header card-header-between">
            <div>
              <h2 class="card-title">Traffic trend</h2>
              <p class="card-description">Pageviews and unique visitors across the selected window.</p>
            </div>
            <div class="tabs" data-tabs="series" role="tablist" aria-label="Series">
              <button class="tab is-active" type="button" data-value="both" role="tab" aria-selected="true">Both</button>
              <button class="tab" type="button" data-value="pageviews" role="tab" aria-selected="false">Pageviews</button>
              <button class="tab" type="button" data-value="visitors" role="tab" aria-selected="false">Visitors</button>
            </div>
          </div>
          <div class="card-content">
            <div class="chart-legend" aria-hidden="true">
              <span class="legend-item"><span class="legend-swatch" style="background: var(--chart-1)"></span>Pageviews</span>
              <span class="legend-item"><span class="legend-swatch" style="background: var(--chart-2)"></span>Visitors</span>
            </div>
            <div id="daily-chart" class="chart-canvas">
              <div class="empty-state">Daily traffic will render here after the first successful fetch.</div>
            </div>
            <div id="daily-breakdown" class="daily-breakdown"></div>
          </div>
        </div>
      </section>

      <section id="events" class="section">
        <div class="split split-events">
          <div class="card">
            <div class="card-header card-header-between">
              <div>
                <h2 class="card-title">Recent events</h2>
                <p class="card-description">Append-only event stream. Click an item to inspect its payload.</p>
              </div>
              <span class="badge badge-outline" id="events-count">0 events</span>
            </div>
            <div class="card-content">
              <div id="timeline-list" class="timeline-list">
                <div class="empty-state">No events loaded yet. Refresh after your Access session is active.</div>
              </div>
            </div>
          </div>
          <div class="stack">
            <div class="card">
              <div class="card-header card-header-between">
                <div>
                  <h2 class="card-title">Inspector</h2>
                  <p class="card-description">Selected event payload.</p>
                </div>
                <button class="btn btn-xs" type="button" data-action="copy-inspector">
                  ${ICONS.copy}<span>Copy</span>
                </button>
              </div>
              <div class="card-content">
                <pre id="inspector" class="inspector is-empty">Select an event in the timeline to inspect it here.</pre>
              </div>
            </div>
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Click heatmap</h2>
                <p class="card-description">Coarse click density for a tracked path. Derived, not canonical.</p>
              </div>
              <div class="card-content">
                <div class="field">
                  <label class="field-label" for="heatmap-path">Tracked path</label>
                  <select id="heatmap-path" class="select">
                    <option value="">Choose a page</option>
                  </select>
                </div>
                <div id="heatmap-meta" class="badge-row"></div>
                <div id="heatmap" class="heatmap-wrap">
                  <div class="empty-state">Choose a tracked path to see the click heatmap.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tables" class="section">
        <div class="split split-tables">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Top pages</h2>
              <p class="card-description">Most-viewed pages in the active window.</p>
            </div>
            <div class="card-content card-content-flush" id="top-pages">
              <div class="empty-state empty-state-flush">Top pages will appear here.</div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Top article clicks</h2>
              <p class="card-description">Most-clicked destinations from tracked lists.</p>
            </div>
            <div class="card-content card-content-flush" id="top-clicks">
              <div class="empty-state empty-state-flush">Top article clicks will appear here.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="subscribers-section" class="section">
        <div class="split split-tables">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Audience</h2>
              <p class="card-description">Saved subscribers, current state, and recent intake from the site.</p>
            </div>
            <div class="card-content card-content-flush" id="subscribers">
              <div class="empty-state empty-state-flush">Subscriber state will appear here after the first successful fetch.</div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Email deliveries</h2>
              <p class="card-description">Recent welcome emails and newsletter sends, with provider-level outcomes.</p>
            </div>
            <div class="card-content card-content-flush" id="email-deliveries">
              <div class="empty-state empty-state-flush">Email delivery logs will appear here after the first successful fetch.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</div>
`;

const CLIENT_JS = `
(function () {
  var ICONS_RT = {
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="19"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="5" x2="12" y2="18"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };

  var state = {
    days: Number(sessionStorage.getItem("growth-dashboard-days") || 30),
    series: sessionStorage.getItem("growth-dashboard-series") || "both",
    selectedEventId: null,
    recentEvents: [],
    topPages: [],
    lastSummary: null
  };

  var refreshButton = document.getElementById("refresh");
  var dispatchButton = document.getElementById("dispatch");
  var statusLine = document.getElementById("status-line");
  var lastRefreshEl = document.getElementById("last-refresh");
  var summaryEl = document.getElementById("summary");
  var dailyChartEl = document.getElementById("daily-chart");
  var dailyBreakdownEl = document.getElementById("daily-breakdown");
  var timelineEl = document.getElementById("timeline-list");
  var eventsCountEl = document.getElementById("events-count");
  var inspectorEl = document.getElementById("inspector");
  var topPagesEl = document.getElementById("top-pages");
  var topClicksEl = document.getElementById("top-clicks");
  var heatmapPathEl = document.getElementById("heatmap-path");
  var heatmapMetaEl = document.getElementById("heatmap-meta");
  var heatmapEl = document.getElementById("heatmap");
  var subscribersEl = document.getElementById("subscribers");
  var emailDeliveriesEl = document.getElementById("email-deliveries");
  var sidebarEl = document.getElementById("sidebar");
  var sidebarOverlayEl = document.getElementById("sidebar-overlay");
  var settingsPopoverEl = document.getElementById("settings-popover");
  var settingsTrigger = document.querySelector('[data-action="toggle-settings"]');

  // ------- Utilities -------
  function escapeHtml(value) {
    return String(value == null ? "" : value)
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
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value + "T00:00:00"));
  }

  function formatTimestamp(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      .format(new Date(value.replace(" ", "T") + "Z"));
  }

  async function api(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    var response = await fetch(path, Object.assign({}, options, { headers: headers, credentials: "same-origin" }));
    var contentType = response.headers.get("content-type") || "";
    var body = contentType.indexOf("application/json") >= 0 ? await response.json() : await response.text();
    if (!response.ok) {
      var message = typeof body === "string" ? body : (body && body.error) || "Request failed";
      throw new Error(message);
    }
    return body;
  }

  function setStatus(message, kind) {
    var icon = ICONS_RT.info;
    if (kind === "error") icon = ICONS_RT.alert;
    else if (kind === "ok") icon = ICONS_RT.check;
    statusLine.innerHTML = icon + '<span>' + escapeHtml(message) + '</span>';
    statusLine.className = "alert" + (kind ? " is-" + kind : "");
  }

  function setLastRefresh(date) {
    if (!date) {
      lastRefreshEl.textContent = "No refresh yet";
      return;
    }
    lastRefreshEl.textContent = new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function setTabState(scope, value) {
    var tabs = document.querySelectorAll('[data-tabs="' + scope + '"] .tab');
    Array.prototype.forEach.call(tabs, function (tab) {
      var active = tab.getAttribute("data-value") === String(value);
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  // ------- Deltas & sparklines -------
  function computeDelta(rows) {
    if (!rows || rows.length < 2) return null;
    var mid = Math.floor(rows.length / 2);
    var previous = rows.slice(0, mid).reduce(function (acc, r) { return acc + Number(r.count || 0); }, 0);
    var current = rows.slice(mid).reduce(function (acc, r) { return acc + Number(r.count || 0); }, 0);
    if (!previous) {
      return { pct: null, direction: current > 0 ? "up" : "flat", previous: 0, current: current };
    }
    var pct = ((current - previous) / previous) * 100;
    return {
      pct: pct,
      direction: Math.abs(pct) < 0.5 ? "flat" : (pct > 0 ? "up" : "down"),
      previous: previous,
      current: current
    };
  }

  function buildSparkline(rows, color) {
    if (!rows || rows.length < 2) return "";
    var width = 140, height = 36;
    var padY = 3;
    var max = Math.max.apply(Math, rows.map(function (r) { return Number(r.count || 0); }).concat([1]));
    var points = rows.map(function (r, i) {
      var x = (i / (rows.length - 1)) * (width - 2) + 1;
      var y = height - padY - (Number(r.count || 0) / max) * (height - padY * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var last = rows[rows.length - 1];
    var lastX = (width - 2) + 1;
    var lastY = height - padY - (Number(last.count || 0) / max) * (height - padY * 2);
    return '<svg class="kpi-spark" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">'
      + '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="2" fill="' + color + '"/>'
      + '</svg>';
  }

  function deltaBadge(delta) {
    if (!delta) return "";
    if (delta.pct == null) {
      return '<span class="kpi-delta">' + ICONS_RT.minus + 'n/a</span>';
    }
    var icon = delta.direction === "up" ? ICONS_RT.arrowUp : (delta.direction === "down" ? ICONS_RT.arrowDown : ICONS_RT.minus);
    var label = (delta.pct >= 0 ? "+" : "") + delta.pct.toFixed(1) + "%";
    return '<span class="kpi-delta is-' + delta.direction + '">' + icon + label + '</span>';
  }

  function buildKpiCard(opts) {
    return '<div class="kpi-card">'
      +   '<div class="kpi-label">' + escapeHtml(opts.label) + '</div>'
      +   '<div class="kpi-row">'
      +     '<div class="kpi-value">' + formatNumber(opts.value) + '</div>'
      +     deltaBadge(opts.delta)
      +   '</div>'
      +   (opts.spark ? opts.spark : '')
      +   '<div class="kpi-hint">' + escapeHtml(opts.hint) + '</div>'
      + '</div>';
  }

  function renderSummary(summary) {
    state.lastSummary = summary;
    if (!summary) {
      summaryEl.innerHTML = '<div class="empty-state">Summary metrics will appear here after the first successful fetch.</div>';
      return;
    }
    var pvDelta = computeDelta(summary.dailyPageviews || []);
    var uvDelta = computeDelta(summary.dailyVisitors || []);
    var pvSpark = buildSparkline(summary.dailyPageviews || [], "var(--chart-1)");
    var uvSpark = buildSparkline(summary.dailyVisitors || [], "var(--chart-2)");

    summaryEl.innerHTML = [
      buildKpiCard({ label: "Pageviews", value: summary.pageviews, hint: "Total views in window", delta: pvDelta, spark: pvSpark }),
      buildKpiCard({ label: "Visitors", value: summary.uniqueVisitors, hint: "Unique visitors in window", delta: uvDelta, spark: uvSpark }),
      buildKpiCard({ label: "Article clicks", value: summary.articleClicks, hint: formatNumber(summary.uiClicks) + " tracked UI clicks alongside", delta: null, spark: "" }),
      buildKpiCard({ label: "New subscribers", value: summary.newSubscribers, hint: formatNumber(summary.activeSubscribers || 0) + " active audience total", delta: null, spark: "" })
    ].join("");
  }

  // ------- Chart -------
  function buildLinePath(points) {
    return points.map(function (p, i) {
      return (i === 0 ? "M " : "L ") + p.x.toFixed(2) + " " + p.y.toFixed(2);
    }).join(" ");
  }

  function buildAreaPath(points, baseline) {
    if (!points.length) return "";
    return "M " + points[0].x.toFixed(2) + " " + baseline.toFixed(2)
      + " L " + points.map(function (p) { return p.x.toFixed(2) + " " + p.y.toFixed(2); }).join(" L ")
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

    var showPv = state.series === "both" || state.series === "pageviews";
    var showUv = state.series === "both" || state.series === "visitors";

    var visitorMap = Object.create(null);
    (visitorsRows || []).forEach(function (row) { visitorMap[row.day] = Number(row.count || 0); });

    var width = 860, height = 300;
    var left = 36, top = 20, right = 20, bottom = 48;
    var innerWidth = width - left - right;
    var innerHeight = height - top - bottom;
    var maxValue = 1;

    rows.forEach(function (row) {
      if (showPv) maxValue = Math.max(maxValue, Number(row.count || 0));
      if (showUv) maxValue = Math.max(maxValue, visitorMap[row.day] || 0);
    });

    function xFor(i) {
      if (rows.length === 1) return left + innerWidth / 2;
      return left + (i / (rows.length - 1)) * innerWidth;
    }

    var pagePoints = rows.map(function (row, i) {
      return { x: xFor(i), y: top + innerHeight - (Number(row.count || 0) / maxValue) * innerHeight, value: Number(row.count || 0), day: row.day };
    });
    var visitorPoints = rows.map(function (row, i) {
      var v = visitorMap[row.day] || 0;
      return { x: xFor(i), y: top + innerHeight - (v / maxValue) * innerHeight, value: v, day: row.day };
    });

    var gridLines = [0, 0.25, 0.5, 0.75, 1].map(function (ratio) {
      var y = top + innerHeight - ratio * innerHeight;
      var label = Math.round(ratio * maxValue);
      return '<g>'
        + '<line x1="' + left + '" y1="' + y.toFixed(2) + '" x2="' + (width - right) + '" y2="' + y.toFixed(2) + '" stroke="oklch(0.922 0 0)" stroke-dasharray="3 6"/>'
        + '<text x="' + (left - 8) + '" y="' + (y + 4).toFixed(2) + '" text-anchor="end" fill="oklch(0.556 0 0)" font-size="11" font-family="ui-monospace, monospace">' + escapeHtml(String(label)) + '</text>'
        + '</g>';
    }).join("");

    var labels = rows.map(function (row, i) {
      if (rows.length > 10 && i % 2 === 1 && i !== rows.length - 1) return "";
      return '<text x="' + xFor(i).toFixed(2) + '" y="' + (height - 14) + '" text-anchor="middle" fill="oklch(0.556 0 0)" font-size="11">' + escapeHtml(formatDateLabel(row.day)) + '</text>';
    }).join("");

    var pvArea = showPv ? '<path d="' + buildAreaPath(pagePoints, top + innerHeight) + '" fill="url(#pv-fill)"/>' : "";
    var uvArea = showUv ? '<path d="' + buildAreaPath(visitorPoints, top + innerHeight) + '" fill="url(#uv-fill)"/>' : "";
    var pvLine = showPv ? '<path d="' + buildLinePath(pagePoints) + '" fill="none" stroke="var(--chart-1)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>' : "";
    var uvLine = showUv ? '<path d="' + buildLinePath(visitorPoints) + '" fill="none" stroke="var(--chart-2)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>' : "";
    var pvDots = showPv ? pagePoints.map(function (p) {
      return '<circle cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="3.25" fill="var(--chart-1)" stroke="var(--background)" stroke-width="2"/>';
    }).join("") : "";
    var uvDots = showUv ? visitorPoints.map(function (p) {
      return '<circle cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="3.25" fill="var(--chart-2)" stroke="var(--background)" stroke-width="2"/>';
    }).join("") : "";

    dailyChartEl.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Traffic trend">'
      + '<defs>'
      +   '<linearGradient id="pv-fill" x1="0" y1="0" x2="0" y2="1">'
      +     '<stop offset="0%" stop-color="var(--chart-1)" stop-opacity="0.25"/>'
      +     '<stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0.02"/>'
      +   '</linearGradient>'
      +   '<linearGradient id="uv-fill" x1="0" y1="0" x2="0" y2="1">'
      +     '<stop offset="0%" stop-color="var(--chart-2)" stop-opacity="0.25"/>'
      +     '<stop offset="100%" stop-color="var(--chart-2)" stop-opacity="0.02"/>'
      +   '</linearGradient>'
      + '</defs>'
      + gridLines
      + pvArea + uvArea + pvLine + uvLine + pvDots + uvDots
      + labels
      + '</svg>';

    dailyBreakdownEl.innerHTML = rows.map(function (row) {
      var pageviews = Number(row.count || 0);
      var visitors = visitorMap[row.day] || 0;
      return '<div class="daily-row">'
        +   '<time datetime="' + escapeHtml(row.day) + '">' + escapeHtml(formatDateLabel(row.day)) + '</time>'
        +   '<div class="daily-bars">'
        +     '<div class="daily-bar pageviews" style="width:' + Math.max(4, Math.round((pageviews / maxValue) * 220)) + 'px"></div>'
        +     '<div class="daily-bar visitors" style="width:' + Math.max(4, Math.round((visitors / maxValue) * 180)) + 'px"></div>'
        +   '</div>'
        +   '<div class="daily-value">' + formatNumber(pageviews) + ' pv · ' + formatNumber(visitors) + ' uv</div>'
        + '</div>';
    }).join("");
  }

  // ------- Tables -------
  function renderTopPagesTable(rows) {
    state.topPages = rows || [];
    if (!rows || !rows.length) {
      topPagesEl.innerHTML = '<div class="empty-state empty-state-flush">Top pages will appear here after data is collected.</div>';
      heatmapPathEl.innerHTML = '<option value="">Choose a page</option>';
      return;
    }
    var max = Math.max.apply(Math, rows.map(function (r) { return Number(r.pageviews || 0); }).concat([1]));

    var head = '<thead><tr>'
      + '<th>Path</th>'
      + '<th class="bar-cell">Share</th>'
      + '<th class="num-cell">Views</th>'
      + '<th class="num-cell">Visitors</th>'
      + '</tr></thead>';

    var body = '<tbody>' + rows.map(function (row) {
      var pct = Math.max(2, Math.round((Number(row.pageviews || 0) / max) * 100));
      return '<tr>'
        +   '<td class="path-cell">' + escapeHtml(row.pathname || "—") + '</td>'
        +   '<td class="bar-cell"><div class="inline-bar"><span style="width:' + pct + '%"></span></div></td>'
        +   '<td class="num-cell">' + formatNumber(row.pageviews) + '</td>'
        +   '<td class="num-cell">' + formatNumber(row.uniqueVisitors) + '</td>'
        + '</tr>';
    }).join("") + '</tbody>';

    topPagesEl.innerHTML = '<div class="table-wrap"><table class="table">' + head + body + '</table></div>';

    var options = ['<option value="">Choose a page</option>'];
    rows.forEach(function (row) {
      options.push('<option value="' + escapeHtml(row.pathname) + '">' + escapeHtml(row.pathname) + '</option>');
    });
    var currentValue = heatmapPathEl.value;
    heatmapPathEl.innerHTML = options.join("");
    if (currentValue && rows.some(function (r) { return r.pathname === currentValue; })) {
      heatmapPathEl.value = currentValue;
    }
  }

  function renderTopClicksTable(rows) {
    if (!rows || !rows.length) {
      topClicksEl.innerHTML = '<div class="empty-state empty-state-flush">Top article clicks will appear here once tracked.</div>';
      return;
    }
    var max = Math.max.apply(Math, rows.map(function (r) { return Number(r.clicks || 0); }).concat([1]));

    var head = '<thead><tr>'
      + '<th>Target</th>'
      + '<th class="bar-cell">Share</th>'
      + '<th class="num-cell">Clicks</th>'
      + '<th class="num-cell">Visitors</th>'
      + '</tr></thead>';

    var body = '<tbody>' + rows.map(function (row) {
      var pct = Math.max(2, Math.round((Number(row.clicks || 0) / max) * 100));
      return '<tr>'
        +   '<td class="path-cell">' + escapeHtml(row.targetPath || "—") + '</td>'
        +   '<td class="bar-cell"><div class="inline-bar is-blue"><span style="width:' + pct + '%"></span></div></td>'
        +   '<td class="num-cell">' + formatNumber(row.clicks) + '</td>'
        +   '<td class="num-cell">' + formatNumber(row.uniqueVisitors) + '</td>'
        + '</tr>';
    }).join("") + '</tbody>';

    topClicksEl.innerHTML = '<div class="table-wrap"><table class="table">' + head + body + '</table></div>';
  }

  function renderSubscribersTable(rows) {
    if (!rows || !rows.length) {
      subscribersEl.innerHTML = '<div class="empty-state empty-state-flush">No subscribers yet. Once the site collects email signups, they will appear here.</div>';
      return;
    }

    var head = '<thead><tr>'
      + '<th>Email</th>'
      + '<th>Status</th>'
      + '<th>Source</th>'
      + '<th>Joined</th>'
      + '</tr></thead>';

    var body = '<tbody>' + rows.map(function (row) {
      var badgeClass = row.status === "active"
        ? "badge badge-newsletter_signup"
        : "badge badge-outline";
      return '<tr>'
        +   '<td>' + escapeHtml(row.email || "—") + '</td>'
        +   '<td><span class="' + badgeClass + '">' + escapeHtml(row.status || "—") + '</span></td>'
        +   '<td class="path-cell">' + escapeHtml(row.sourcePage || "—") + '</td>'
        +   '<td>' + escapeHtml(row.createdAt || "—") + '</td>'
        + '</tr>';
    }).join("") + '</tbody>';

    subscribersEl.innerHTML = '<div class="table-wrap"><table class="table">' + head + body + '</table></div>';
  }

  function deliveryKindBadge(kind) {
    if (kind === "welcome") return '<span class="badge badge-welcome">WELCOME</span>';
    if (kind === "updated") return '<span class="badge badge-updated">UPDATED</span>';
    return '<span class="badge badge-new">NEW</span>';
  }

  function renderEmailDeliveriesTable(rows) {
    if (!rows || !rows.length) {
      emailDeliveriesEl.innerHTML = '<div class="empty-state empty-state-flush">No delivery logs yet. Welcome emails and newsletter sends will appear here after the first attempt.</div>';
      return;
    }

    var head = '<thead><tr>'
      + '<th>Message</th>'
      + '<th>Recipient</th>'
      + '<th>Status</th>'
      + '<th>Sent</th>'
      + '</tr></thead>';

    var body = '<tbody>' + rows.map(function (row) {
      var statusClass = row.status === "sent" ? "badge badge-sent" : "badge badge-failed";
      var contextLabel = row.entryTitle
        ? '<strong>' + escapeHtml(row.entryTitle) + '</strong><span>' + escapeHtml(row.entryUrl || row.subject || "Article dispatch") + '</span>'
        : '<strong>' + escapeHtml(row.subject || "Subscription confirmed") + '</strong><span>' + escapeHtml(row.sourcePage || "Direct signup") + '</span>';
      var providerLabel = row.providerMessageId
        ? '<span>provider id: ' + escapeHtml(row.providerMessageId) + '</span>'
        : (row.error ? '<span>error: ' + escapeHtml(row.error) + '</span>' : '<span>provider id unavailable</span>');
      return '<tr>'
        +   '<td class="stack-cell">' + deliveryKindBadge(row.kind) + contextLabel + '</td>'
        +   '<td class="stack-cell"><strong>' + escapeHtml(row.subscriberEmail || "—") + '</strong>' + providerLabel + '</td>'
        +   '<td><span class="' + statusClass + '">' + escapeHtml(row.status || "—") + '</span></td>'
        +   '<td>' + escapeHtml(formatTimestamp(row.createdAt)) + '</td>'
        + '</tr>';
    }).join("") + '</tbody>';

    emailDeliveriesEl.innerHTML = '<div class="table-wrap"><table class="table">' + head + body + '</table></div>';
  }

  // ------- Timeline -------
  function eventSummary(row) {
    if (!row) return "";
    if (row.context && row.targetText) return row.context + " · " + row.targetText;
    if (row.context) return "Context: " + row.context;
    if (row.targetText) return row.targetText;
    if (row.pageTitle) return row.pageTitle;
    return "No extra context";
  }

  function renderInspector(item) {
    if (!item) {
      inspectorEl.textContent = "Select an event in the timeline to inspect it here.";
      inspectorEl.classList.add("is-empty");
      return;
    }
    inspectorEl.textContent = JSON.stringify(item, null, 2);
    inspectorEl.classList.remove("is-empty");
  }

  function renderTimeline(rows) {
    state.recentEvents = rows || [];
    eventsCountEl.textContent = formatNumber((rows || []).length) + " events";

    if (!rows || !rows.length) {
      timelineEl.innerHTML = '<div class="empty-state">No tracked events yet. Once the site posts pageviews or clicks, the truth surface will populate.</div>';
      renderInspector(null);
      return;
    }

    if (state.selectedEventId == null) {
      state.selectedEventId = rows[0].id;
    }

    var selected = rows.find(function (r) { return r.id === state.selectedEventId; }) || rows[0];
    state.selectedEventId = selected.id;

    timelineEl.innerHTML = rows.map(function (row) {
      var active = row.id === state.selectedEventId ? " is-active" : "";
      var path = row.targetPath || row.pathname || "—";
      return '<button type="button" class="timeline-item' + active + '" data-event-id="' + row.id + '">'
        +   '<div class="timeline-meta">'
        +     '<span class="badge badge-' + escapeHtml(row.eventType) + '">' + escapeHtml(row.eventType) + '</span>'
        +     '<span class="timeline-date">' + escapeHtml(formatTimestamp(row.createdAt)) + '</span>'
        +   '</div>'
        +   '<div class="timeline-path">' + escapeHtml(path) + '</div>'
        +   '<div class="timeline-note">' + escapeHtml(eventSummary(row)) + '</div>'
        + '</button>';
    }).join("");

    renderInspector(selected);

    Array.prototype.forEach.call(timelineEl.querySelectorAll(".timeline-item"), function (btn) {
      btn.addEventListener("click", function () {
        state.selectedEventId = Number(btn.getAttribute("data-event-id"));
        renderTimeline(state.recentEvents);
      });
    });
  }

  // ------- Heatmap -------
  function renderHeatmap(data) {
    if (!data || !data.path) {
      heatmapMetaEl.innerHTML = "";
      heatmapEl.innerHTML = '<div class="empty-state">Choose a tracked path to see the click heatmap.</div>';
      return;
    }
    heatmapMetaEl.innerHTML =
        '<span class="badge badge-outline"><strong>Path</strong>&nbsp;' + escapeHtml(data.path) + '</span>'
      + '<span class="badge badge-outline"><strong>Clicks</strong>&nbsp;' + formatNumber(data.totalClicks || 0) + '</span>'
      + '<span class="badge badge-outline"><strong>Grid</strong>&nbsp;' + escapeHtml(data.xBins + "×" + data.yBins) + '</span>';

    if (!data.totalClicks) {
      heatmapEl.innerHTML = '<div class="empty-state">No tracked clicks for this path in the selected window.</div>';
      return;
    }

    var siteBase = "https://zlaabsi.github.io";
    var pageUrl = siteBase + data.path;
    var xBins = data.xBins || 12;
    var yBins = data.yBins || 12;
    var max = Math.max.apply(Math, (data.cells || []).map(function (c) { return c.count; }).concat([1]));

    var preview = '<div class="heatmap-preview">'
      + '<iframe class="heatmap-iframe" src="' + escapeHtml(pageUrl) + '" loading="lazy" sandbox="allow-scripts allow-same-origin" title="Page preview"></iframe>'
      + '<div class="heatmap-preview-label">Live page preview · scroll to explore</div>'
      + '</div>';

    var axisTop = '<div class="heatmap-axis">'
      + '<span>← Left edge</span>'
      + '<span>Right edge →</span>'
      + '</div>';

    var colNums = '<div class="heatmap-corner"></div>'
      + Array.from({ length: xBins }, function (_, i) {
          return '<div class="heatmap-col-num">' + (i + 1) + '</div>';
        }).join("");

    var cellsHtml = (data.cells || []).map(function (cell, idx) {
      var isFirstInRow = idx % xBins === 0;
      var rowNum = Math.floor(idx / xBins) + 1;
      var rowLabel = isFirstInRow
        ? '<div class="heatmap-row-num">' + rowNum + '</div>'
        : '';
      var alpha = cell.count ? Math.max(0.14, cell.count / max) : 0.05;
      var bg = 'color-mix(in oklch, var(--foreground) ' + (alpha * 100).toFixed(1) + '%, transparent)';
      var color = cell.count ? 'var(--background)' : 'var(--muted-foreground)';
      return rowLabel + '<div class="heat-cell" style="background:' + bg + ';color:' + color + ';" title="Row ' + rowNum + ', Col ' + ((idx % xBins) + 1) + ' — ' + cell.count + ' clicks">'
        + (cell.count ? formatNumber(cell.count) : "")
        + '</div>';
    }).join("");

    var axisBottom = '<div class="heatmap-axis">'
      + '<span>↑ Page top (row 1)</span>'
      + '<span>Page bottom (row ' + yBins + ') ↓</span>'
      + '</div>';

    heatmapEl.innerHTML = preview + axisTop
      + '<div class="heatmap-labeled-grid">' + colNums + cellsHtml + '</div>'
      + axisBottom;
  }

  async function loadHeatmap(path) {
    if (!path) { renderHeatmap(null); return; }
    var query = new URLSearchParams({ path: path, days: String(state.days), xBins: "12", yBins: "12" });
    var data = await api("/api/admin/heatmap?" + query.toString());
    renderHeatmap(data);
  }

  // ------- Refresh / Dispatch -------
  async function refreshDashboard() {
    sessionStorage.setItem("growth-dashboard-days", String(state.days));
    sessionStorage.setItem("growth-dashboard-series", state.series);

    setStatus("Refreshing dashboard…");

    try {
      var summaryQuery = new URLSearchParams({ days: String(state.days) });
      var results = await Promise.all([
        api("/api/admin/summary?" + summaryQuery.toString()),
        api("/api/admin/top-pages?" + summaryQuery.toString()),
        api("/api/admin/top-clicks?" + summaryQuery.toString()),
        api("/api/admin/recent-events?" + new URLSearchParams({ days: String(state.days), limit: "80" }).toString()),
        api("/api/admin/subscribers?limit=40"),
        api("/api/admin/email-deliveries?" + new URLSearchParams({ days: String(state.days), limit: "40" }).toString())
      ]);

      renderSummary(results[0]);
      renderTrendChart(results[0].dailyPageviews || [], results[0].dailyVisitors || []);
      renderTopPagesTable(results[1].rows || []);
      renderTopClicksTable(results[2].rows || []);
      renderTimeline(results[3].rows || []);
      renderSubscribersTable(results[4].rows || []);
      renderEmailDeliveriesTable(results[5].rows || []);

      if (!heatmapPathEl.value && state.topPages.length) {
        heatmapPathEl.value = state.topPages[0].pathname;
      }
      await loadHeatmap(heatmapPathEl.value);

      setLastRefresh(new Date());
      setStatus("Dashboard refreshed.", "ok");
    } catch (error) {
      console.error(error);
      var message = error.message || "Dashboard refresh failed.";
      if (message === "Unauthorized") message = "Cloudflare Access session required. Reload this page to sign in.";
      setStatus(message, "error");
    }
  }

  async function runDispatch() {
    setStatus("Running newsletter dispatch…");
    try {
      var result = await api("/api/admin/dispatch-now", { method: "POST" });
      setStatus(
        "Dispatch finished. Created " + formatNumber(result.createdDispatches)
          + " dispatches, sent " + formatNumber(result.sentDeliveries) + " emails.",
        "ok"
      );
    } catch (error) {
      console.error(error);
      var message = error.message || "Newsletter dispatch failed.";
      if (message === "Unauthorized") message = "Cloudflare Access session required. Reload this page to sign in.";
      setStatus(message, "error");
    }
  }

  // ------- Sidebar / popover / session -------
  function toggleSidebar(force) {
    var nextOpen = force != null ? force : sidebarEl.getAttribute("data-state") !== "open";
    sidebarEl.setAttribute("data-state", nextOpen ? "open" : "closed");
    sidebarOverlayEl.setAttribute("data-state", nextOpen ? "open" : "closed");
  }

  function openSettings(force) {
    var nextOpen = force != null ? force : settingsPopoverEl.hasAttribute("hidden");
    if (nextOpen) {
      settingsPopoverEl.removeAttribute("hidden");
      settingsTrigger.setAttribute("aria-expanded", "true");
    } else {
      settingsPopoverEl.setAttribute("hidden", "");
      settingsTrigger.setAttribute("aria-expanded", "false");
    }
  }

  function logoutAccessSession() {
    if (!window.confirm("End the Cloudflare Access session for this dashboard?")) return;
    var redirect = window.location.origin + "/dashboard";
    window.location.href = "/cdn-cgi/access/logout?redirect_url=" + encodeURIComponent(redirect);
  }

  // ------- Event wiring -------
  setTabState("days", state.days);
  setTabState("series", state.series);

  refreshButton.addEventListener("click", function () { refreshDashboard(); });
  dispatchButton.addEventListener("click", function () { runDispatch(); });

  heatmapPathEl.addEventListener("change", function () {
    loadHeatmap(heatmapPathEl.value).catch(function (error) {
      setStatus(error.message || "Failed to load click heatmap.", "error");
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-tabs="days"] .tab'), function (tab) {
    tab.addEventListener("click", function () {
      var v = Number(tab.getAttribute("data-value"));
      if (v === state.days) return;
      state.days = v;
      setTabState("days", v);
      sessionStorage.setItem("growth-dashboard-days", String(v));
      refreshDashboard();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-tabs="series"] .tab'), function (tab) {
    tab.addEventListener("click", function () {
      var v = tab.getAttribute("data-value");
      if (v === state.series) return;
      state.series = v;
      setTabState("series", v);
      sessionStorage.setItem("growth-dashboard-series", v);
      if (state.lastSummary) {
        renderTrendChart(state.lastSummary.dailyPageviews || [], state.lastSummary.dailyVisitors || []);
      }
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.sidebar-item[data-section]'), function (link) {
    link.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll('.sidebar-item[data-section]'), function (i) {
        i.classList.remove("is-active");
      });
      link.classList.add("is-active");
      if (window.matchMedia("(max-width: 980px)").matches) toggleSidebar(false);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.sidebar-item[data-action]'), function (btn) {
    btn.addEventListener("click", function () {
      var action = btn.getAttribute("data-action");
      if (action === "refresh") refreshDashboard();
      else if (action === "dispatch") runDispatch();
    });
  });

  var sidebarToggle = document.querySelector('[data-action="toggle-sidebar"]');
  if (sidebarToggle) sidebarToggle.addEventListener("click", function () { toggleSidebar(); });
  sidebarOverlayEl.addEventListener("click", function () { toggleSidebar(false); });

  settingsTrigger.addEventListener("click", function (e) {
    e.stopPropagation();
    openSettings();
  });
  settingsPopoverEl.addEventListener("click", function (e) { e.stopPropagation(); });
  document.addEventListener("click", function (e) {
    if (settingsPopoverEl.hasAttribute("hidden")) return;
    if (settingsPopoverEl.contains(e.target)) return;
    if (settingsTrigger.contains(e.target)) return;
    openSettings(false);
  });

  var logoutBtn = document.querySelector('[data-action="logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      logoutAccessSession();
    });
  }

  var copyBtn = document.querySelector('[data-action="copy-inspector"]');
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (!inspectorEl.textContent || inspectorEl.classList.contains("is-empty")) return;
      navigator.clipboard.writeText(inspectorEl.textContent).then(function () {
        setStatus("Inspector payload copied to clipboard.", "ok");
      }).catch(function () {
        setStatus("Copy failed.", "error");
      });
    });
  }

  window.addEventListener("keydown", function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      refreshDashboard();
    }
    if (e.key === "Escape" && !settingsPopoverEl.hasAttribute("hidden")) {
      openSettings(false);
    }
  });

  refreshDashboard();
})();
`;

export function renderDashboardHTML(): string {
  return '<!doctype html>\n<html lang="en">\n<head>\n'
    + HEAD_META + '\n'
    + '<style>' + CSS + '</style>\n'
    + '</head>\n<body>\n'
    + BODY_HTML
    + '<script>' + CLIENT_JS + '</script>\n'
    + '</body>\n</html>';
}
