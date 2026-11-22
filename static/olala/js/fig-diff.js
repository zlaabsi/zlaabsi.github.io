// Differential attention (report §3.3.2 and Appendix D).
// 2D: three aligned bar rows over the same keys make the subtraction legible.
// A second view shows what was measured on the trained model (Table 50).

import { d3, scaffold, svg, slider, segmented, readout, note, group, softmax, rng, tip, fmt } from "./core.js";

// Table 50: mean attention mass on the <bos> position, queries 5–512.
const TABLE50 = [
  { layer: "L4", signal: 0.065, noise: 0.056, net: 0.026, lam: 0.65 },
  { layer: "L9", signal: 0.041, noise: 0.052, net: 0.007, lam: 0.59 },
  { layer: "L14", signal: 0.108, noise: 0.078, net: 0.053, lam: 0.62 },
  { layer: "L19", signal: 0.046, noise: 0.083, net: -0.003, lam: 0.65 },
  { layer: "L24", signal: 0.078, noise: 0.128, net: 0.004, lam: 0.61 },
  { layer: "L29", signal: 0.332, noise: 0.379, net: 0.138, lam: 0.52 },
  { layer: "L34", signal: 0.154, noise: 0.232, net: 0.003, lam: 0.66 },
];

const N = 28;
const NEEDLE = 19;
const SINK_LOGIT = 3;

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 720;
  const H = 410;
  const s = svg(canvas, W, H, "Signal attention map, noise attention map and their weighted difference over the same keys");
  const gToy = s.append("g");
  const gData = s.append("g");

  /* ----- toy mechanism ----- */
  const r = rng(11);
  const e1 = d3.range(N).map(() => r.normal());
  const e2 = d3.range(N).map(() => r.normal());
  const m = { l: 150, r: 20 };
  const x = d3.scaleBand(d3.range(N), [m.l, W - m.r]).paddingInner(0.22);
  const rows = [
    { key: "a1", label: "signal map", sub: "softmax(Q₁K₁ᵀ/√d)", cls: "c-attn", y0: 128, hgt: 84, max: 0.3 },
    { key: "a2", label: "noise map", sub: "softmax(Q₂K₂ᵀ/√d)", cls: "c-noise", y0: 240, hgt: 84, max: 0.3 },
    { key: "net", label: "difference", sub: "signal − λ · noise", cls: "c-ink", y0: 352, hgt: 84, max: 0.3 },
  ];
  for (const row of rows) {
    row.g = gToy.append("g");
    row.g.append("line").attr("stroke", "var(--ol-rule)").attr("x1", m.l).attr("x2", W - m.r).attr("y1", row.y0).attr("y2", row.y0);
    row.g.append("text").attr("class", "ol-th").attr("x", 14).attr("y", row.y0 - 34).text(row.label);
    row.g.append("text").attr("class", "ol-t2").attr("x", 14).attr("y", row.y0 - 15).text(row.sub);
    row.bars = row.g
      .selectAll("rect")
      .data(d3.range(N))
      .join("rect")
      .attr("class", `ol-fill ${row.cls}`)
      .attr("x", (i) => x(i))
      .attr("width", x.bandwidth())
      .attr("rx", 2);
    row.vals = row.g.append("g");
  }
  const mark = (i, text) => {
    const g = gToy.append("g");
    g.append("text").attr("class", "ol-t2").attr("x", x(i) + x.bandwidth() / 2).attr("y", 20).attr("text-anchor", i === 0 ? "start" : "middle").attr("dx", i === 0 ? -x.bandwidth() / 2 : 0).text(text);
    g.append("line").attr("class", "ol-ref").attr("x1", x(i) + x.bandwidth() / 2).attr("x2", x(i) + x.bandwidth() / 2).attr("y1", 26).attr("y2", 372);
  };
  mark(0, "position 0, the sink");
  mark(NEEDLE, "the relevant key");
  gToy.append("text").attr("class", "ol-t2").attr("x", W - m.r).attr("y", H - 8).attr("text-anchor", "end").text("key position");

  /* ----- measured (Table 50) ----- */
  const dm = { l: 60, r: 120, t: 46, b: 50 };
  const dx = d3.scalePoint(TABLE50.map((d) => d.layer), [dm.l + 40, W - dm.r - 20]);
  const dy = d3.scaleLinear([-0.02, 0.4], [H - dm.b, dm.t]);
  const gy = gData.append("g").attr("class", "ol-axis ol-axis--y").attr("transform", `translate(${dm.l},0)`);
  gy.call(d3.axisLeft(dy).tickValues([0, 0.1, 0.2, 0.3, 0.4]).tickSize(-(W - dm.l - dm.r)).tickPadding(8).tickFormat(d3.format(".1f")));
  gy.select(".domain").remove();
  gData.append("text").attr("class", "ol-t2").attr("x", dm.l).attr("y", dm.t - 16).text("mean attention mass on the <bos> position");
  gData.append("text").attr("class", "ol-t2").attr("x", W - dm.r).attr("y", H - 10).attr("text-anchor", "end").text("attention layer (of 36, counted from 0)");
  const series = [
    { key: "signal", label: "signal heads", cls: "c-attn" },
    { key: "noise", label: "noise heads", cls: "c-noise" },
    { key: "net", label: "net after subtraction", cls: "c-ink" },
  ];
  const col = gData.selectAll("g.col").data(TABLE50).join("g").attr("class", "col");
  col.append("line").attr("stroke", "var(--ol-rule)").attr("stroke-width", 2).attr("x1", (d) => dx(d.layer)).attr("x2", (d) => dx(d.layer)).attr("y1", (d) => dy(Math.min(d.signal, d.noise, d.net))).attr("y2", (d) => dy(Math.max(d.signal, d.noise, d.net)));
  col.append("text").attr("class", "ol-t2").attr("x", (d) => dx(d.layer)).attr("y", H - dm.b + 22).attr("text-anchor", "middle").text((d) => d.layer);
  for (const sr of series) {
    col.append("circle").attr("class", `ol-dot ${sr.cls}`).attr("r", sr.key === "net" ? 6 : 5).attr("cx", (d) => dx(d.layer)).attr("cy", (d) => dy(d[sr.key]));
  }
  col
    .append("rect")
    .attr("class", "ol-hit")
    .attr("x", (d) => dx(d.layer) - 30)
    .attr("width", 60)
    .attr("y", dm.t)
    .attr("height", H - dm.t - dm.b)
    .on("pointermove", (ev, d) =>
      tip.show(
        ev,
        `<b>${d.layer}</b><br>signal heads ${d.signal.toFixed(3)}<br>noise heads ${d.noise.toFixed(3)}<br>net ${d.net.toFixed(3)}<br><span class="ol-tip-sub">mean σ(λ) = ${d.lam.toFixed(2)}</span>`
      )
    )
    .on("pointerleave", tip.hide);
  // Direct labels on L29, the layer where the three values are furthest apart.
  const l29 = TABLE50[5];
  const lx = dx("L29") + 12;
  gData.append("text").attr("class", "ol-halo").attr("x", lx).attr("y", dy(l29.noise) - 4).text("noise heads");
  gData.append("text").attr("class", "ol-halo").attr("x", lx).attr("y", dy(l29.signal) + 16).text("signal heads");
  gData.append("text").attr("class", "ol-halo").attr("font-weight", 600).attr("x", lx).attr("y", dy(l29.net) + 5).text("net after subtraction");

  /* ----- panel ----- */
  const g1 = group(panel);
  const view = segmented(g1, {
    label: "View",
    options: [
      { value: "toy", label: "Mechanism" },
      { value: "data", label: "Measured on 7A1B" },
    ],
    value: "toy",
    onChange: draw,
  });
  const ctl = group(g1);
  const lamS = slider(ctl, { label: "subtraction weight λ", min: 0, max: 0.95, step: 0.01, value: 0.61, onInput: draw });
  const rhoS = slider(ctl, { label: "how much the noise head tracks the sink", min: 0, max: 1.2, step: 0.01, value: 1, onInput: draw });
  const kapS = slider(ctl, { label: "correlation of the two noise floors", min: 0, max: 1, step: 0.01, value: 0.9, onInput: draw });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "sum", label: "total net weight, 1 − λ" },
    { key: "needle", label: "relevant key, share before → after" },
    { key: "sink", label: "sink" },
    { key: "floor", label: "everything else" },
  ]);
  const say = note(g2);

  function draw() {
    const toy = view.value === "toy";
    gToy.attr("display", toy ? null : "none");
    gData.attr("display", toy ? "none" : null);
    ctl.style.display = toy ? "" : "none";
    g2.querySelector("dl").style.display = toy ? "" : "none";
    s.attr("aria-label", toy ? "Signal attention map, noise attention map and their weighted difference over the same keys" : "Measured attention mass on the first position for signal heads, noise heads and the net, per attention layer");
    if (!toy) {
      say(
        `<p>Mean softmax mass on position 0 for the seven attention layers. Where the noise heads carry as much sink mass as the signal heads, the net falls to almost nothing (L19, L24, L34). Where they do not, it survives (L14, L29).</p><p>The subtraction shrinks first-four-position sink mass 3.61× overall. Of that, 2.59× is the uniform rescaling by \\(1/(1-\\sigma(\\lambda))\\) that every key receives, so the sink-selective part is \\(3.61 / 2.59 = 1.40\\times\\).</p><p class="ol-src">Report, Table 50 and Appendix D.2. Hover a layer for the values.</p>`
      );
      return;
    }
    const lam = lamS.value;
    const rho = rhoS.value;
    const kap = kapS.value;
    const z1 = e1.map((v, i) => v + (i === NEEDLE ? 3.2 : 0) + (i === 0 ? SINK_LOGIT : 0));
    const z2 = e1.map((v, i) => kap * v + Math.sqrt(1 - kap * kap) * e2[i] + (i === 0 ? rho * SINK_LOGIT : 0));
    const a1 = softmax(z1);
    const a2 = softmax(z2);
    const net = a1.map((v, i) => v - lam * a2[i]);
    const data = { a1, a2, net };
    for (const row of rows) {
      const sc = d3.scaleLinear([0, row.max], [0, row.hgt]);
      row.bars
        .attr("y", (i) => (data[row.key][i] >= 0 ? row.y0 - Math.min(row.hgt + 8, sc(data[row.key][i])) : row.y0))
        .attr("height", (i) => Math.max(0.5, Math.min(row.hgt + 8, Math.abs(sc(data[row.key][i])))))
        .attr("opacity", (i) => (i === 0 || i === NEEDLE ? 1 : 0.55));
      row.vals
        .selectAll("text")
        .data([0, NEEDLE])
        .join("text")
        .attr("class", "ol-halo")
        .attr("text-anchor", (i) => (i === 0 ? "start" : "middle"))
        .attr("x", (i) => (i === 0 ? x(0) + x.bandwidth() + 5 : x(i) + x.bandwidth() / 2))
        .attr("y", (i) => (i === 0 ? row.y0 - Math.max(8, Math.min(row.hgt, sc(Math.max(0, data[row.key][i]))) - 12) : row.y0 - Math.min(row.hgt + 8, sc(Math.max(0, data[row.key][i]))) - 6))
        .text((i) => data[row.key][i].toFixed(2));
    }
    const abs = d3.sum(net, Math.abs);
    const rest = abs - Math.abs(net[0]) - Math.abs(net[NEEDLE]);
    const before = (v) => `${fmt.pct(v)} → `;
    out({
      sum: d3.sum(net).toFixed(2),
      needle: before(a1[NEEDLE]) + fmt.pct(Math.abs(net[NEEDLE]) / abs),
      sink: before(a1[0]) + fmt.pct(Math.abs(net[0]) / abs),
      floor: before(1 - a1[0] - a1[NEEDLE]) + fmt.pct(rest / abs),
    });
    const tracked = rho > 0.75;
    say(
      `<p>Each softmax must spend a total mass of one, so both maps carry a floor of small weights and a lump on position 0. Subtracting cancels what the two maps <em>share</em>.</p><p>${
        tracked
          ? "The noise head tracks the sink here, so the lump cancels and the relevant key dominates what is left."
          : "The noise head now ignores the sink, so the lump passes through the subtraction untouched. This is the case of the four dedicated sink heads the report finds (for example L14 head 32, net 0.83)."
      }</p><p class="ol-src">Toy logits, not model data. The net sums to 1 − λ, so a head can also output almost nothing, which a single softmax cannot.</p>`
    );
  }
  draw();
}
