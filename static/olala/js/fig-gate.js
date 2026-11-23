// Zero-centered attention gate (report §3.3.3).
// 2D: the whole argument is about one scalar function of one scalar
// pre-activation, read against the distribution of that pre-activation.

import { d3, scaffold, svg, slider, segmented, readout, note, group, axes, sigmoid, silu, gaussExpect, fmt } from "./core.js";

const VARIANTS = {
  sigmoid: {
    label: "Sigmoid",
    cls: "c-violet",
    f: (z) => sigmoid(z),
    tag: "σ(z)",
    text: `<p>The Qwen3-Next gate, \\(y \\odot \\sigma(W_g x)\\). With a zero-mean Gaussian \\(W_g\\) the gate sits around one half at initialisation, so the layer starts by halving its own output. Reaching values near one needs large weights, which weight decay keeps pulling back.</p>`,
  },
  zcg1: {
    label: "ZCG-1",
    cls: "c-muted",
    f: (z) => silu(z),
    tag: "SiLU(z)",
    text: `<p>\\(y \\odot \\mathrm{SiLU}(W_g x) + 1\\): the offset is added after the product. The curve drawn is the multiplicative factor alone. With \\(W_g = 0\\) the factor is zero and the output is the constant 1, not \\(y\\). This variant falls below the ungated baseline (2.805 against 2.789).</p>`,
  },
  zcg2: {
    label: "ZCG-2",
    cls: "c-noise",
    f: (z) => silu(z) + 1,
    tag: "SiLU(z) + 1",
    text: `<p>\\(y \\odot (\\mathrm{SiLU}(W_g x) + 1)\\): identity at a zero pre-activation, but the minimum of \\(\\mathrm{SiLU}\\) is about −0.28, so the gate never goes below 0.72. It cannot close, and it only matches the baseline (2.789).</p>`,
  },
  zcg3: {
    label: "ZCG-3",
    cls: "c-attn",
    f: (z, c) => silu(z + c),
    tag: "SiLU(z + c)",
    text: `<p>\\(y \\odot \\mathrm{SiLU}(W_g x + c)\\), the adopted form. The offset is chosen so that the gate is the identity <em>in expectation</em> over the initial pre-activation, \\(\\mathbb{E}_{z \\sim \\mathcal{N}(0,1)}[\\mathrm{SiLU}(z + c)] = 1\\), which gives \\(c \\approx 1.15\\). It can still reach zero, and it is the only variant that beats the sigmoid gate (2.778, FDA 76.3%).</p>`,
  },
};

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 720;
  const H = 430;
  const m = { l: 54, r: 24, t: 34, b: 46 };
  const s = svg(canvas, W, H, "Gate value as a function of the pre-activation for the sigmoid gate and the three zero-centered variants");

  const x = d3.scaleLinear([-6, 6], [m.l, W - m.r]);
  const y = d3.scaleLinear([-0.5, 3.5], [H - m.b, m.t]);
  axes(s, { x, y, W, H, m, xTicks: 7, yTicks: [0, 1, 2, 3], xLabel: "pre-activation z = W<tspan baseline-shift='sub' font-size='9'>g</tspan>x", yLabel: "gate value" });

  const zs = d3.range(-6, 6.001, 0.04);
  const density = s.append("path").attr("class", "ol-density").attr("fill", "var(--ol-ink)").attr("opacity", 0.09);
  s.append("line").attr("class", "ol-ref").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(1)).attr("y2", y(1));
  s.append("text").attr("class", "ol-t2").attr("x", W - m.r - 4).attr("y", y(1) - 7).attr("text-anchor", "end").text("identity");
  s.append("line").attr("stroke", "var(--ol-ink2)").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
  s.append("text").attr("class", "ol-t2").attr("x", m.l + 6).attr("y", y(0) + 16).text("closed");
  const densLabel = s.append("text").attr("class", "ol-t2 ol-halo").attr("text-anchor", "middle");

  const line = d3.line().x((d) => x(d[0])).y((d) => y(Math.max(-0.5, Math.min(3.5, d[1])))).defined((d) => d[1] <= 3.55);
  const paths = {};
  const labels = {};
  for (const [k, v] of Object.entries(VARIANTS)) {
    paths[k] = s.append("path").attr("class", `ol-line ${v.cls}`);
    labels[k] = s.append("text").attr("class", "ol-halo").attr("text-anchor", "end");
  }
  const mean = s.append("g");
  mean.append("line").attr("class", "ol-ref").attr("stroke", "var(--ol-ink)");
  mean.append("circle").attr("r", 5).attr("class", "ol-dot c-ink");
  mean.append("text").attr("class", "ol-halo").attr("font-weight", 600);

  const g1 = group(panel);
  const which = segmented(g1, {
    label: "Gate",
    options: Object.entries(VARIANTS).map(([value, v]) => ({ value, label: v.label })),
    value: "zcg3",
    onChange: draw,
  });
  const cS = slider(g1, {
    label: "offset c (ZCG-3)",
    min: 0,
    max: 2,
    step: 0.01,
    value: 1.15,
    marks: [
      { value: 1.15, label: "1.15", align: "left", title: "Identity in expectation" },
      { value: 1.28, label: "1.28", align: "right", title: "SiLU(1.28) = 1, identity at z = 0" },
    ],
    onInput: draw,
  });
  const sdS = slider(g1, { label: "std of z at initialisation", min: 0.25, max: 2, step: 0.01, value: 1, onInput: draw });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "e", label: "expected gate, E[g(z)]" },
    { key: "g0", label: "gate at z = 0" },
    { key: "min", label: "lowest reachable value" },
    { key: "closed", label: "share of z with g &lt; 0.1" },
  ]);
  const say = note(g2);

  function draw() {
    const c = cS.value;
    const sd = sdS.value;
    const sel = which.value;
    // Density drawn on its own scale: the tallest case (sd = 0.25) reaches gate value 1.25.
    const pxPerDensity = (y(0) - y(1.25)) / (1 / (0.25 * Math.sqrt(2 * Math.PI)));
    const pdf = (z) => Math.exp(-(z * z) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
    density.attr("d", d3.area().x((z) => x(z)).y0(y(0)).y1((z) => y(0) - pxPerDensity * pdf(z))(zs));
    densLabel.attr("x", W - m.r - 4).attr("y", y(0) + 18).attr("text-anchor", "end").text("density of z at init (own scale)");

    // Direct labels. Above the identity line the three SiLU curves run parallel,
    // ordered ZCG-3, ZCG-2, ZCG-1 from left to right, so each label sits on its own side.
    const spots = {
      sigmoid: { z: 5.7, dy: 20, anchor: "end", yv: 1 },
      zcg1: { z: 2.2, dx: 12, dy: 6, anchor: "start" },
      zcg2: { z: -5.7, dy: -9, anchor: "start", yv: 1 },
      zcg3: { z: 3.25 - c, dx: -10, dy: 0, anchor: "end" },
    };
    for (const [k, v] of Object.entries(VARIANTS)) {
      const on = k === sel;
      const sp = spots[k];
      paths[k].attr("d", line(zs.map((z) => [z, v.f(z, c)]))).attr("opacity", on ? 1 : 0.32).attr("stroke-width", on ? 2.6 : 1.6);
      labels[k]
        .attr("text-anchor", sp.anchor)
        .attr("x", x(sp.z) + (sp.dx || 0))
        .attr("y", y(sp.yv ?? Math.min(3.35, v.f(sp.z, c))) + sp.dy)
        .attr("opacity", on ? 1 : 0.62)
        .attr("font-weight", on ? 600 : 400)
        .text(k === "zcg3" ? `ZCG-3: SiLU(z + ${c.toFixed(2)})` : `${v.label}: ${v.tag}`);
    }

    const f = (z) => VARIANTS[sel].f(z, c);
    const e = gaussExpect(f, sd);
    const closed = gaussExpect((z) => (f(z) < 0.1 ? 1 : 0), sd, 4000);
    const lo = d3.min(d3.range(-12, 12, 0.01), f);
    mean.select("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", y(0)).attr("y2", y(e));
    mean.select("circle").attr("cx", x(0)).attr("cy", y(e));
    mean.select("text").attr("x", x(0) + 10).attr("y", y(e) + (e > 1.02 ? -8 : 18)).text(`E[g] = ${e.toFixed(3)}`);

    out({
      e: e.toFixed(3),
      g0: f(0).toFixed(3),
      min: lo.toFixed(2),
      closed: fmt.pct1(closed),
    });
    say(VARIANTS[sel].text + (sel === "zcg3" ? `<p class="ol-src">Try c = 1.28: the gate is exactly one at z = 0, but its mean over a unit Gaussian overshoots. The report picks the constant in expectation, not pointwise.</p>` : ""));
  }
  draw();
}
