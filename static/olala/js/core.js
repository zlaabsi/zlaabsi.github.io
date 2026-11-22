// Shared toolkit for the Olala architecture figures.
// Every figure module imports from here so that controls, colours,
// projections and numerics stay identical across the article and the atlas.

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
export { d3 };

/* ---------- DOM helpers ---------- */

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

let uid = 0;
export const nextId = (p = "ol") => `${p}-${++uid}`;

/* ---------- figure scaffold ---------- */

// Splits a stage into a drawing area and a side panel (controls, readouts,
// running commentary). The CSS stacks them when the figure is narrow.
export function scaffold(root, { wide = false } = {}) {
  root.innerHTML = "";
  const canvas = h("div", { class: "ol-canvas" });
  const panel = h("div", { class: "ol-panel" });
  const grid = h("div", { class: "ol-grid" + (wide ? " ol-grid--wide" : "") }, canvas, panel);
  root.append(grid);
  return { canvas, panel, grid };
}

export function svg(container, W, H, label) {
  const node = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", W)
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-label", label || "");
  return node;
}

// Straight arrow with a solid head. `cls` colours both shaft and head.
export function arrow(g, x1, y1, x2, y2, cls = "", { head = 8, width = 1.6, dash } = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - head * Math.cos(a);
  const by = y2 - head * Math.sin(a);
  const w = head * 0.45;
  const grp = g.append("g").attr("class", `ol-arrow ${cls}`);
  grp
    .append("line")
    .attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", bx)
    .attr("y2", by)
    .attr("stroke-width", width)
    .attr("stroke-dasharray", dash || null);
  grp
    .append("path")
    .attr("d", `M${x2},${y2}L${bx - w * Math.sin(a)},${by + w * Math.cos(a)}L${bx + w * Math.sin(a)},${by - w * Math.cos(a)}Z`);
  return grp;
}

// SVG text with math-style runs: plain strings are upright, {i} italic,
// {sub}/{sup} shifted. Keeps figure labels consistent with the equations.
export function mtext(sel, parts) {
  sel.text(null);
  for (const p of [].concat(parts)) {
    if (typeof p === "string") sel.append("tspan").text(p);
    else if (p.i) sel.append("tspan").attr("class", "ol-mi").text(p.i);
    else if (p.sub) sel.append("tspan").attr("class", "ol-msub").attr("dy", "0.32em").text(p.sub).each(function () {
      d3.select(this.parentNode).append("tspan").attr("dy", "-0.32em").text("​");
    });
    else if (p.sup) sel.append("tspan").attr("class", "ol-msub").attr("dy", "-0.5em").text(p.sup).each(function () {
      d3.select(this.parentNode).append("tspan").attr("dy", "0.5em").text("​");
    });
  }
  return sel;
}

/* ---------- controls ---------- */

export function group(panel, title) {
  const box = h("div", { class: "ol-group" });
  if (title) box.append(h("div", { class: "ol-group-title" }, title));
  panel.append(box);
  return box;
}

export function slider(parent, { label, min, max, step = 0.01, value, format = (v) => v.toFixed(2), marks = [], onInput, scale }) {
  // `scale` maps the raw [0,1] slider position to a value (for log sliders).
  const id = nextId("sl");
  const toPos = scale ? scale.invert : (v) => v;
  const toVal = scale ? scale : (v) => v;
  const input = h("input", {
    type: "range",
    id,
    min: scale ? 0 : min,
    max: scale ? 1 : max,
    step: scale ? 0.001 : step,
    value: toPos(value),
  });
  const out = h("output", { for: id }, format(value));
  const row = h(
    "div",
    { class: "ol-slider" },
    h("label", { for: id, html: label }),
    out,
    input
  );
  if (marks.length) {
    const lo = scale ? 0 : min;
    const hi = scale ? 1 : max;
    const strip = h("div", { class: "ol-marks" });
    for (const m of marks) {
      const p = ((toPos(m.value) - lo) / (hi - lo)) * 100;
      const b = h("button", { type: "button", class: "ol-mark" + (m.align ? ` is-${m.align}` : ""), style: `left:${p}%`, title: m.title || m.label }, m.label);
      b.addEventListener("click", () => api.set(m.value, true));
      strip.append(b);
    }
    row.append(strip);
    row.classList.add("ol-slider--marked");
  }
  const api = {
    get value() {
      return toVal(+input.value);
    },
    set(v, fire) {
      input.value = toPos(v);
      out.textContent = format(toVal(+input.value));
      if (fire && onInput) onInput(api.value);
    },
    el: row,
  };
  input.addEventListener("input", () => {
    out.textContent = format(api.value);
    onInput && onInput(api.value);
  });
  parent.append(row);
  return api;
}

export function logScale(min, max) {
  const a = Math.log(min);
  const b = Math.log(max);
  const f = (p) => Math.exp(a + p * (b - a));
  f.invert = (v) => (Math.log(v) - a) / (b - a);
  return f;
}

export function segmented(parent, { label, options, value, onChange }) {
  const name = nextId("seg");
  const box = h("div", { class: "ol-seg", role: "radiogroup", "aria-label": label });
  const api = {
    value,
    set(v, fire) {
      api.value = v;
      for (const b of box.querySelectorAll("button")) {
        const on = b.dataset.value === String(v);
        b.setAttribute("aria-checked", on);
        b.classList.toggle("is-on", on);
      }
      if (fire && onChange) onChange(v);
    },
    el: box,
  };
  for (const o of options) {
    box.append(
      h("button", { type: "button", role: "radio", "data-value": o.value, name, html: o.label, onclick: () => api.set(o.value, true) })
    );
  }
  const wrap = h("div", { class: "ol-field" });
  if (label) wrap.append(h("div", { class: "ol-field-label" }, label));
  wrap.append(box);
  parent.append(wrap);
  api.set(value, false);
  return api;
}

export function button(parent, label, onClick) {
  const b = h("button", { type: "button", class: "ol-btn", onclick: onClick }, label);
  parent.append(b);
  return b;
}

export function checkbox(parent, { label, value = false, onChange }) {
  const id = nextId("cb");
  const input = h("input", { type: "checkbox", id });
  input.checked = value;
  input.addEventListener("change", () => onChange && onChange(input.checked));
  parent.append(h("div", { class: "ol-check" }, input, h("label", { for: id, html: label })));
  return {
    get value() {
      return input.checked;
    },
  };
}

// A definition list of live values. `rows` is [{key, label}], update({key: text}).
export function readout(parent, rows) {
  const dl = h("dl", { class: "ol-readout" });
  const cells = {};
  for (const r of rows) {
    const dd = h("dd", {}, "");
    cells[r.key] = dd;
    dl.append(h("dt", { html: r.label }), dd);
  }
  parent.append(dl);
  return (vals) => {
    for (const [k, v] of Object.entries(vals)) if (cells[k]) cells[k].innerHTML = v;
  };
}

// Running commentary: one paragraph that the figure rewrites as its state changes.
export function note(parent) {
  const p = h("div", { class: "ol-note", "aria-live": "polite" });
  parent.append(p);
  return (html) => {
    if (p._last === html) return;
    p._last = html;
    p.innerHTML = html;
    if (window.MathJax && MathJax.typesetPromise && /\\\(|\$/.test(html)) MathJax.typesetPromise([p]).catch(() => {});
  };
}

/* ---------- tooltip ---------- */

let tipEl;
export const tip = {
  show(evt, html) {
    if (!tipEl) {
      tipEl = h("div", { class: "ol-tip", role: "tooltip" });
      document.body.append(tipEl);
    }
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    const pad = 14;
    const r = tipEl.getBoundingClientRect();
    let x = evt.clientX + pad;
    let y = evt.clientY + pad;
    if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - pad;
    tipEl.style.left = `${Math.max(8, x)}px`;
    tipEl.style.top = `${Math.max(8, y)}px`;
  },
  hide() {
    if (tipEl) tipEl.hidden = true;
  },
};

/* ---------- theme ---------- */

export function css(el, name) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function onTheme(cb) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", cb);
  return () => mo.disconnect();
}

/* ---------- geometry ---------- */

// Isometric projection: x runs down-right, y runs down-left, z runs up.
export function isoProjector({ ox = 0, oy = 0, s = 1, angle = Math.PI / 6 } = {}) {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const p = (x, y, z = 0) => [ox + (x - y) * c * s, oy + (x + y) * sn * s - z * s];
  p.path = (pts) => "M" + pts.map((q) => p(...q).map((v) => v.toFixed(1)).join(",")).join("L") + "Z";
  // Axis-aligned box with its near corner at (x, y, z).
  p.box = (x, y, z, w, d, hgt) => ({
    top: p.path([[x, y, z + hgt], [x + w, y, z + hgt], [x + w, y + d, z + hgt], [x, y + d, z + hgt]]),
    right: p.path([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + hgt], [x + w, y, z + hgt]]),
    left: p.path([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + hgt], [x, y + d, z + hgt]]),
  });
  return p;
}

/* ---------- numerics ---------- */

export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.normal = () => {
    const u = Math.max(f(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * f());
  };
  return f;
}

export const sigmoid = (z) => 1 / (1 + Math.exp(-z));
export const silu = (z) => z * sigmoid(z);

export function softmax(z) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

// Expectation of f(z) for z ~ N(0, sd^2), composite Simpson on ±8 sd.
export function gaussExpect(f, sd = 1, n = 800) {
  const lo = -8 * sd;
  const hh = (16 * sd) / n;
  let acc = 0;
  for (let i = 0; i <= n; i++) {
    const z = lo + i * hh;
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    acc += w * f(z) * Math.exp(-(z * z) / (2 * sd * sd));
  }
  return (acc * hh) / 3 / (sd * Math.sqrt(2 * Math.PI));
}

// Round a float to bfloat16 (1 sign, 8 exponent, 7 fraction bits), nearest-even.
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
export function bf16(x) {
  f32[0] = x;
  const bits = u32[0];
  const rounded = (bits + 0x7fff + ((bits >>> 16) & 1)) & 0xffff0000;
  u32[0] = rounded;
  return f32[0];
}

/* ---------- formatting ---------- */

export const fmt = {
  int: d3.format(","),
  f1: d3.format(".1f"),
  f2: d3.format(".2f"),
  f3: d3.format(".3f"),
  pct: d3.format(".0%"),
  pct1: d3.format(".1%"),
  deg: (rad) => `${((rad * 180) / Math.PI).toFixed(1)}°`,
  sci(v) {
    if (v === 0) return "0";
    const e = Math.floor(Math.log10(Math.abs(v)));
    const m = v / 10 ** e;
    return Math.abs(e) < 3 ? d3.format(".3~g")(v) : `${m.toFixed(1)} × 10<sup>${e}</sup>`;
  },
  bytes(b) {
    const u = ["B", "kB", "MB", "GB", "TB"];
    let i = 0;
    while (b >= 1000 && i < u.length - 1) {
      b /= 1000;
      i++;
    }
    return `${b >= 100 ? b.toFixed(0) : b >= 10 ? b.toFixed(1) : b.toFixed(2)} ${u[i]}`;
  },
  tokens(n) {
    return n >= 1024 ? `${Math.round(n / 1024)}k` : String(Math.round(n));
  },
};

/* ---------- small chart helpers ---------- */

export function axes(g, { x, y, W, H, m, xLabel, yLabel, xTicks, yTicks, xFormat, yFormat }) {
  const gx = g.append("g").attr("class", "ol-axis").attr("transform", `translate(0,${H - m.b})`);
  const ax = d3.axisBottom(x).tickSizeOuter(0).tickPadding(6);
  if (xTicks) Array.isArray(xTicks) ? ax.tickValues(xTicks) : ax.ticks(xTicks);
  if (xFormat) ax.tickFormat(xFormat);
  gx.call(ax);
  const gy = g.append("g").attr("class", "ol-axis ol-axis--y").attr("transform", `translate(${m.l},0)`);
  const ay = d3.axisLeft(y).tickSize(-(W - m.l - m.r)).tickPadding(8);
  if (yTicks) Array.isArray(yTicks) ? ay.tickValues(yTicks) : ay.ticks(yTicks);
  if (yFormat) ay.tickFormat(yFormat);
  gy.call(ay);
  gy.select(".domain").remove();
  if (xLabel) g.append("text").attr("class", "ol-t2").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").html(xLabel);
  if (yLabel) g.append("text").attr("class", "ol-t2").attr("x", m.l).attr("y", m.t - 12).attr("text-anchor", "start").html(yLabel);
  return { gx, gy };
}
