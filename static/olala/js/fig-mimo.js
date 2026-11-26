// The rank-R write of Mamba-3 MIMO (article §3).
// 2D: the update is drawn as the matrices it is made of. What survives of the
// old state, what is written, and the new state share one colour scale, so the
// picture adds up cell by cell. Below, the two measurements quoted for the
// choice of rank: arithmetic per byte of state moved, and validation loss.
//
//   S_t = α_t S_{t−1} + Δt_t Σ_{r≤R} k_r ⊗ v_r,    α_t = exp(A Δt_t),  A < 0
//
// Keys and values are random, and the 16 × 16 block is a drawn size, not the
// model's. The 2.5 operations per byte and the three losses come from the report.

import { d3, scaffold, svg, slider, button, readout, note, group, mtext, rng, css, onTheme, fmt } from "./core.js";

const N = 16; // rows and columns of the state block drawn
const CS = 10; // cell size
const M = N * CS;
const RMAX = 4;
const OLALA_R = 4;
const OPS1 = 2.5; // arithmetic operations per byte moved, single-output form
const ACCEL = [125, 500]; // "two orders of magnitude" above OPS1, drawn as a band around 250
const LOSS = [
  { v: 2.775, label: "Mamba-3, rank four", rank: 4 },
  { v: 2.781, label: "Mamba-3, rank one", rank: 1 },
  { v: 2.789, label: "Gated DeltaNet", rank: null },
];

// Canvas and the three matrices of the top band. The 8 px gaps put the key
// strip against the left edge of the write and the value strip above it, the
// usual layout of a matrix product.
const W = 720;
const H = 556;
const XA = 56; // what survives
const XKR = 294; // right edge of the key strip
const XP = 302; // what is written
const XS = 502; // the new state
const MY = 112; // top of the matrices
const GAP = 8;
const XL = XA + 4; // both axes of the bottom band run from XL to XR
const XR = XS + M - 4;
const Y1 = 400; // axis of the operations strip
const Y2 = 522; // axis of the loss strip

const g3 = d3.format("~g");
const minus = (v) => v.toFixed(1).replace("-", "−");

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const s = svg(
    canvas,
    W,
    H,
    "The Mamba-3 state update drawn as matrices: the surviving part of the old state, plus a write built from R keys and R values, equals a new state of the same size. Below, arithmetic per byte moved against the rank, and validation loss for three linear mixers."
  );
  const top = s.append("g");
  const base = s.append("g");
  const live = s.append("g");

  /* ---------- state ---------- */

  const r = rng(29);
  const vec = () => Float64Array.from({ length: N }, () => r.normal());
  let Sprev;
  let K;
  let V;
  let cur;
  let t;
  const fresh = () => {
    K = d3.range(RMAX).map(vec);
    V = d3.range(RMAX).map(vec);
  };
  // Start from a state that already holds a few tokens, written at the defaults.
  (function warm() {
    Sprev = d3.range(N).map(() => new Float64Array(N));
    const a = Math.exp(-0.5);
    for (t = 0; t < 8; t++) {
      fresh();
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          let w = 0;
          for (let c = 0; c < OLALA_R; c++) w += K[c][i] * V[c][j];
          Sprev[i][j] = a * Sprev[i][j] + 0.5 * w;
        }
    }
    fresh();
  })();

  /* ---------- controls ---------- */

  const g1 = group(panel);
  const rS = slider(g1, {
    label: "rank R, outer products per step",
    min: 1,
    max: RMAX,
    step: 1,
    value: OLALA_R,
    format: (v) => String(v),
    marks: [
      { value: 1, label: "single output", align: "right" },
      { value: OLALA_R, label: "Olala", align: "left" },
    ],
    onInput: draw,
  });
  const pick = slider(g1, { label: "term of the write shown, r", min: 0, max: RMAX, step: 1, value: 0, format: (v) => (v === 0 ? "all" : String(v)), onInput: draw });
  const dtS = slider(g1, { label: "step size Δt<sub>t</sub>, set by the input", min: 0.05, max: 3, step: 0.05, value: 0.5, onInput: draw });
  const aS = slider(g1, { label: "A, learned per head", min: -3, max: -0.1, step: 0.1, value: -1, format: minus, onInput: draw });
  button(g1, "Write the next token", () => {
    Sprev = cur;
    fresh();
    t++;
    draw();
  });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "alpha", label: "kept, α<sub>t</sub> = exp(A·Δt<sub>t</sub>)" },
    { key: "state", label: "state moved per step" },
    { key: "ops", label: "arithmetic per byte moved" },
    { key: "t", label: "tokens written so far" },
  ]);
  const say = note(g2);

  /* ---------- bottom band, drawn once ---------- */

  const xo = d3.scaleLog([1, 1000], [XL, XR]);
  const xl = d3.scaleLinear([2.772, 2.792], [XL, XR]);
  base.append("line").attr("x1", XA).attr("x2", XS + M).attr("y1", 330).attr("y2", 330).attr("stroke", "var(--ol-rule)");

  base.append("text").attr("class", "ol-th").attr("x", XA).attr("y", 354).text("Arithmetic per byte of state moved");
  base
    .append("rect")
    .attr("class", "ol-soft c-muted")
    .attr("x", xo(ACCEL[0]))
    .attr("y", Y1 - 9)
    .attr("width", xo(ACCEL[1]) - xo(ACCEL[0]))
    .attr("height", 18)
    .attr("rx", 3)
    .attr("stroke-dasharray", "4 3");
  const xAcc = xo(Math.sqrt(ACCEL[0] * ACCEL[1]));
  base.append("text").attr("class", "ol-t2").attr("x", xAcc).attr("y", Y1 - 32).attr("text-anchor", "middle").text("matrix products on accelerators,");
  base.append("text").attr("class", "ol-t2").attr("x", xAcc).attr("y", Y1 - 16).attr("text-anchor", "middle").text("about two orders of magnitude higher");
  base
    .append("g")
    .attr("class", "ol-axis")
    .attr("transform", `translate(0,${Y1})`)
    .call(d3.axisBottom(xo).tickValues([1, 10, 100, 1000]).tickFormat(g3).tickSizeOuter(0).tickPadding(6));
  base.append("text").attr("class", "ol-t2").attr("x", XR).attr("y", Y1 + 38).attr("text-anchor", "end").text("arithmetic operations per byte moved, log scale");

  base.append("text").attr("class", "ol-th").attr("x", XA).attr("y", 474).text("Validation loss in the report's benchmark");
  base.append("text").attr("class", "ol-t2").attr("x", XR).attr("y", 474).attr("text-anchor", "end").text("lower is better");
  base
    .append("g")
    .attr("class", "ol-axis")
    .attr("transform", `translate(0,${Y2})`)
    .call(d3.axisBottom(xl).tickValues([2.775, 2.78, 2.785, 2.79]).tickFormat(d3.format(".3f")).tickSizeOuter(0).tickPadding(6));

  /* ---------- drawing ---------- */

  function colour() {
    const up = d3.interpolateRgb(css(root, "--ol-grid"), css(root, "--ol-attn"));
    const dn = d3.interpolateRgb(css(root, "--ol-grid"), css(root, "--ol-mamba"));
    return (v, max) => {
      const u = Math.max(-1, Math.min(1, v / max));
      return u >= 0 ? up(Math.sqrt(u)) : dn(Math.sqrt(-u));
    };
  }

  function heat(g, x, y, rows, cols, val, max, col) {
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        g.append("rect").attr("x", x + j * CS).attr("y", y + i * CS).attr("width", CS - 1).attr("height", CS - 1).attr("fill", col(val(i, j), max));
  }

  function frame(g, x, y, w, hgt, strong) {
    g.append("rect")
      .attr("x", x - 1)
      .attr("y", y - 1)
      .attr("width", w + 1)
      .attr("height", hgt + 1)
      .attr("fill", "none")
      .attr("stroke", strong ? "var(--ol-ink)" : "var(--ol-ink2)")
      .attr("stroke-width", strong ? 1.8 : 1);
  }

  function head(x, title, parts) {
    top.append("text").attr("class", "ol-th").attr("x", x).attr("y", 24).text(title);
    mtext(top.append("text").attr("class", "ol-t2").attr("x", x).attr("y", 46), parts);
  }

  function foot(x, lines) {
    lines.forEach((ln, i) => top.append("text").attr("class", "ol-t2").attr("x", x).attr("y", MY + M + 20 + i * 17).text(ln));
  }

  function draw() {
    const R = rS.value;
    if (pick.value > R) pick.set(R);
    const sel = pick.value; // 0 shows the whole write
    const dt = dtS.value;
    const A = aS.value;
    const alpha = Math.exp(A * dt);
    const col = colour();

    const kept = (i, j) => alpha * Sprev[i][j];
    const term = (c) => (i, j) => dt * K[c][i] * V[c][j];
    const write = (i, j) => {
      let w = 0;
      for (let c = 0; c < R; c++) w += K[c][i] * V[c][j];
      return dt * w;
    };
    cur = d3.range(N).map((i) => Float64Array.from({ length: N }, (_, j) => kept(i, j) + write(i, j)));
    let max = 0.05;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) max = Math.max(max, Math.abs(kept(i, j)), Math.abs(write(i, j)), Math.abs(cur[i][j]));

    top.selectAll("*").remove();

    // The three matrices of the sum, on one colour scale.
    head(XA, "What survives", [{ i: "α" }, { sub: "t" }, " ", { i: "S" }, { sub: "t−1" }]);
    heat(top, XA, MY, N, N, kept, max, col);
    frame(top, XA, MY, M, M);
    head(XP, "What is written", [{ i: "Δt" }, { sub: "t" }, " Σ ", { i: "k" }, { sub: "r" }, " ⊗ ", { i: "v" }, { sub: "r" }]);
    heat(top, XP, MY, N, N, sel ? term(sel - 1) : write, max, col);
    frame(top, XP, MY, M, M);
    head(XS, "The new state", [{ i: "S" }, { sub: "t" }]);
    heat(top, XS, MY, N, N, (i, j) => cur[i][j], max, col);
    frame(top, XS, MY, M, M);
    const yOp = MY + M / 2 + 8;
    top.append("text").attr("class", "ol-t2").attr("x", (XA + M + XKR - RMAX * CS) / 2).attr("y", yOp).attr("text-anchor", "middle").style("font-size", "22px").text("+");
    top.append("text").attr("class", "ol-t2").attr("x", (XP + M + XS) / 2).attr("y", yOp).attr("text-anchor", "middle").style("font-size", "22px").text("=");

    // The factors of the write: R keys as columns on its left, R values as rows above it.
    const kx = XKR - R * CS;
    const vy = MY - GAP - R * CS;
    for (let c = 0; c < R; c++) {
      const g = top.append("g").attr("opacity", sel && sel !== c + 1 ? 0.28 : null);
      heat(g, kx + c * CS, MY, N, 1, (i) => K[c][i], 2.4, col);
      heat(g, XP, vy + c * CS, 1, N, (_, j) => V[c][j], 2.4, col);
    }
    frame(top, kx, MY, R * CS, M);
    frame(top, XP, vy, M, R * CS);
    if (sel) {
      frame(top, kx + (sel - 1) * CS, MY, CS, M, true);
      frame(top, XP, vy + (sel - 1) * CS, M, CS, true);
    }
    for (let c = 0; c < R; c++) {
      const toggle = () => pick.set(sel === c + 1 ? 0 : c + 1, true);
      top.append("rect").attr("class", "ol-hit").attr("x", kx + c * CS).attr("y", MY).attr("width", CS).attr("height", M).on("click", toggle);
      top.append("rect").attr("class", "ol-hit").attr("x", XP).attr("y", vy + c * CS).attr("width", M).attr("height", CS).on("click", toggle);
    }
    const names = (sym) => (R === 1 ? [{ i: sym }, { sub: "1" }] : [{ i: sym }, { sub: "1" }, "–", { i: sym }, { sub: String(R) }]);
    mtext(top.append("text").attr("class", "ol-t2").attr("x", XKR - (R * CS) / 2).attr("y", MY - GAP).attr("text-anchor", "middle"), names("k"));
    mtext(top.append("text").attr("class", "ol-t2").attr("x", XP + M + GAP).attr("y", vy + (R * CS) / 2 + 4), names("v"));

    foot(XA, [`${fmt.pct(alpha)} of the old state`]);
    foot(XP, [sel ? `term ${sel} of ${R}, alone` : R === 1 ? "one outer product" : `${R} outer products, summed`, `K (16 × ${R}) times Vᵀ (${R} × 16)`]);
    foot(XS, ["16 × 16 numbers,", "at any rank"]);

    // Operations strip: rank one as a hollow reference, the current rank filled.
    live.selectAll("*").remove();
    const x1 = xo(OPS1);
    const xr = xo(OPS1 * R);
    if (R > 1) {
      live.append("line").attr("class", "ol-line c-mamba").attr("x1", x1).attr("x2", xr).attr("y1", Y1).attr("y2", Y1).attr("stroke-width", 4);
      live.append("circle").attr("cx", x1).attr("cy", Y1).attr("r", 5).attr("fill", "var(--ol-surface)").attr("stroke", "var(--ol-mamba)").attr("stroke-width", 2);
      live.append("text").attr("class", "ol-t2").attr("x", x1).attr("y", Y1 + 38).attr("text-anchor", "middle").text(`rank one: ${g3(OPS1)}`);
    }
    live.append("circle").attr("class", "ol-dot c-mamba").attr("cx", xr).attr("cy", Y1).attr("r", 6.5);
    live
      .append("text")
      .attr("x", xr)
      .attr("y", Y1 - 16)
      .attr("text-anchor", "middle")
      .attr("font-weight", 600)
      .text(R === 1 ? `rank one: ${g3(OPS1)}` : `rank ${R}: up to ${g3(OPS1 * R)}`);

    // Loss strip: the two ranks the report measures, and the mixer they replace.
    for (const d of LOSS) {
      const on = d.rank === R;
      live.append("circle").attr("class", `ol-dot ${on ? "c-mamba" : "c-muted"}`).attr("cx", xl(d.v)).attr("cy", Y2).attr("r", on ? 6.5 : 5);
      live
        .append("text")
        .attr("class", on ? null : "ol-t2")
        .attr("x", xl(d.v))
        .attr("y", Y2 - 16)
        .attr("text-anchor", "middle")
        .attr("font-weight", on ? 600 : null)
        .text(`${d.label}: ${d.v.toFixed(3)}`);
    }

    out({
      alpha: alpha.toFixed(2),
      state: `${N * N} numbers`,
      ops: R === 1 ? g3(OPS1) : `up to ${g3(OPS1)} × ${R} = ${g3(OPS1 * R)}`,
      t: String(t),
    });
    const hold =
      alpha > 0.85
        ? `<p>With a small \\(\\Delta t_t\\) the head holds its memory: almost all of the old state survives, and this token leaves a faint trace.</p>`
        : alpha < 0.3
          ? `<p>With a large \\(\\Delta t_t\\) the head clears its memory: little of the old state survives, and the new state is mostly this token's write.</p>`
          : "";
    say(
      `<p>Each step keeps a fraction \\(\\alpha_t\\) of the state and adds a write. ${
        R === 1
          ? `At rank one the write is a single outer product: one key column times one value row.`
          : `At rank \\(R\\) the head emits \\(R\\) keys and \\(R\\) values and writes the sum of their outer products, which is one small matrix product \\(K V^\\top\\). Select a key column or a value row to see its term alone.`
      }</p>${hold}<p>The state is the same block at any rank, so the bytes read and written per step do not change. Only the arithmetic done on them grows, by up to \\(R\\)${
        R > 1 ? `, and rank ${R} still sits far below what a matrix product sustains` : ""
      }.</p><p class="ol-src">Random keys and values on a 16 × 16 block. The 2.5 operations per byte and the three losses are the report's${
        R === 2 || R === 3 ? `; it measures ranks one and four` : ""
      }.</p>`
    );
  }
  onTheme(draw);
  draw();
}
