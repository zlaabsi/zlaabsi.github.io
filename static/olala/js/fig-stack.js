// The 36-layer backbone (report §7.1, Table 23, Appendices C and D).
// 2.5D: a tower of plates. Depth is a real axis of the model, and several of
// the report's measurements are per layer, so the lanes on the right are
// read at the height of the layer they describe.

import { d3, scaffold, svg, slider, segmented, readout, note, group, isoProjector, fmt } from "./core.js";

const L = 36;
const isAttn = (l) => l % 5 === 4;

const SINK = {
  4: { signal: 0.065, noise: 0.056, net: 0.026, lam: 0.65 },
  9: { signal: 0.041, noise: 0.052, net: 0.007, lam: 0.59 },
  14: { signal: 0.108, noise: 0.078, net: 0.053, lam: 0.62 },
  19: { signal: 0.046, noise: 0.083, net: -0.003, lam: 0.65 },
  24: { signal: 0.078, noise: 0.128, net: 0.004, lam: 0.61 },
  29: { signal: 0.332, noise: 0.379, net: 0.138, lam: 0.52 },
  34: { signal: 0.154, noise: 0.232, net: 0.003, lam: 0.66 },
};
const GATE = { 4: { head: 0.08, elem: 0.137 }, 34: { head: 0.52, elem: 0.49 } };
const SINK_HEADS = { 4: "A dedicated sink head survives the subtraction here: head 29 (net 0.67).", 14: "Two dedicated sink heads survive the subtraction here: heads 32 and 42 (net 0.83 and 0.69).", 29: "A dedicated sink head survives the subtraction here: head 16 (net 0.56)." };
const RUNAWAY = {
  1: { head: 23, max: 5e15, exp: "t^1.9, still growing at t = 512", angle: 0.267 },
  7: { head: 26, max: 5e15, exp: "t^1.0", angle: 0.079 },
  23: { head: 40, max: 1.5e11, exp: "t^0.36, plateau near 1.4 × 10¹¹ by t ≈ 100", angle: 0.172 },
};
const MOE_SPIKE = { 0: "", 1: "fires on rare and named-entity tokens", 5: "", 19: "fires on 4 to 7% of tokens, mostly function words" };

export default function mount(root) {
  const { canvas, panel } = scaffold(root, { wide: true });
  const W = 760;
  const H = 716;
  const s = svg(canvas, W, H, "Tower of the 36 layers of Olala, 29 Mamba-3 layers and 7 attention layers, each followed by a mixture-of-experts block");
  const iso = isoProjector({ ox: 240, oy: 556 });
  const FW = 150;
  const FD = 90;
  const PITCH = 14;
  const rowY = (l) => iso(FW, 0, l * PITCH + 3.5)[1];
  const X0 = 412;
  const X1 = 742;

  const gTower = s.append("g");
  const gLane = s.append("g");
  let sel = 4;

  // Residual stream rail with one tick per geodesic write.
  const railX = iso(0, FD, 0)[0] - 16;
  const railY0 = iso(0, FD, 0)[1];
  const railY1 = iso(0, FD, L * PITCH)[1] - 14;
  const rail = s.append("g").attr("class", "c-geo");
  rail.append("line").attr("class", "ol-line").attr("x1", railX).attr("x2", railX).attr("y1", railY0 + 18).attr("y2", railY1);
  rail.append("path").attr("class", "ol-fill").attr("d", `M${railX},${railY1 - 9}l-5,10h10z`);
  for (let l = 0; l < L; l++)
    for (const dz of [5, 10]) {
      const yy = iso(0, FD, l * PITCH + dz)[1];
      rail.append("line").attr("stroke", "var(--ol-geo)").attr("stroke-width", 1.4).attr("x1", railX - 4).attr("x2", railX + 4).attr("y1", yy).attr("y2", yy);
    }
  const lbl = (x, y, lines, anchor = "start") => {
    const t = s.append("text").attr("text-anchor", anchor).attr("x", x).attr("y", y);
    lines.forEach((ln, i) => t.append("tspan").attr("x", x).attr("dy", i ? 16 : 0).attr("class", i ? "ol-t2" : null).text(ln));
  };
  lbl(railX - 12, railY0 - 250, ["residual stream", "on the hypersphere,", "72 geodesic writes"], "end");
  lbl(iso(FW / 2, FD / 2, 0)[0], H - 12, ["token embedding, 151,936 entries, L2-normalised"], "middle");
  lbl(iso(FW / 2, FD / 2, 0)[0], 22, ["linear output layer, no final norm"], "middle");

  const slabs = [];
  for (let l = 0; l < L; l++) {
    const g = gTower.append("g").attr("class", "ol-layer").attr("data-l", l);
    const mixCls = isAttn(l) ? "c-attn" : "c-mamba";
    const a = iso.box(0, 0, l * PITCH, FW, FD, 7);
    const b = iso.box(0, 0, l * PITCH + 7, FW, FD, 4);
    const gm = g.append("g").attr("class", `${mixCls} ol-mix`);
    gm.append("path").attr("d", a.left).attr("class", "ol-fill").attr("opacity", 0.55);
    gm.append("path").attr("d", a.right).attr("class", "ol-fill").attr("opacity", 0.75);
    const ge = g.append("g").attr("class", "c-moe ol-moe");
    ge.append("path").attr("d", b.left).attr("class", "ol-fill").attr("opacity", 0.55);
    ge.append("path").attr("d", b.right).attr("class", "ol-fill").attr("opacity", 0.75);
    ge.append("path").attr("d", b.top).attr("class", "ol-fill").attr("stroke", "var(--ol-surface)").attr("stroke-width", 0.6);
    const outline = g
      .append("path")
      .attr("d", iso.path([[0, FD, l * PITCH], [FW, FD, l * PITCH], [FW, 0, l * PITCH], [FW, 0, l * PITCH + 11], [FW, FD, l * PITCH + 11], [0, FD, l * PITCH + 11]]))
      .attr("fill", "transparent")
      .attr("stroke", "var(--ol-ink)")
      .attr("stroke-width", 0)
      .style("cursor", "pointer")
      .on("pointerenter", () => select(l))
      .on("click", () => select(l));
    slabs.push({ g, outline, gm, ge });
  }

  const g1 = group(panel);
  const view = segmented(g1, {
    label: "Lane on the right",
    options: [
      { value: "layout", label: "Layout" },
      { value: "sink", label: "Sink" },
      { value: "gate", label: "Gate" },
      { value: "massive", label: "Outliers" },
    ],
    value: "layout",
    onChange: draw,
  });
  const nS = slider(g1, { label: "context length n", min: 10, max: 18, step: 1, value: 15, format: (v) => fmt.tokens(2 ** v), onInput: draw });
  const out = readout(g1, [
    { key: "kv", label: "KV cache, 7 attention layers, bf16" },
    { key: "state", label: "state of the 29 Mamba-3 layers" },
  ]);
  const g2 = group(panel);
  const say = note(g2);

  function select(l) {
    sel = l;
    describe();
    slabs.forEach((sl, i) => sl.outline.attr("stroke-width", i === sel ? 2 : 0));
  }

  function describe() {
    const l = sel;
    const parts = [];
    if (isAttn(l)) {
      const k = SINK[l];
      parts.push(`<p><b>Layer ${l}: DiffTPA attention, then Latent-MoE.</b> 48 query heads of dimension 128, 36 signal and 12 noise; keys and values cached as rank-4 tensor-product factors, 1,120 numbers per token.</p>`);
      parts.push(`<p>Mean mass on position 0: signal heads ${k.signal.toFixed(3)}, noise heads ${k.noise.toFixed(3)}, net ${k.net.toFixed(3)} after subtraction (mean σ(λ) = ${k.lam.toFixed(2)}).${SINK_HEADS[l] ? ` ${SINK_HEADS[l]}` : ""}</p>`);
      if (GATE[l]) parts.push(`<p>Gate: ${fmt.pct(GATE[l].head)} of (token, head) slots are fully closed, ${fmt.pct1(GATE[l].elem)} of gate elements below 0.1.</p>`);
      if (l === 4) parts.push(`<p>This is the one layer whose sink is bound to the &lt;bos&gt; token itself: removing the token drops the mass 18.4×.</p>`);
    } else {
      parts.push(`<p><b>Layer ${l}: Mamba-3 MIMO, then Latent-MoE.</b> 48 heads, rank-4 state update, state of constant size whatever the context length.</p>`);
      if (RUNAWAY[l]) {
        const r = RUNAWAY[l];
        parts.push(`<p>One of the three degenerate mixers. Head ${r.head} sits on the decay clamp and integrates the whole prefix: its branch output reaches about ${fmt.sci(r.max)}, growing as ${r.exp}. The other 47 heads are erased by bf16 rounding. The geodesic write is pinned at a constant ${r.angle.toFixed(3)} rad.</p>`);
      }
    }
    if (l in MOE_SPIKE) parts.push(`<p>The MoE block of this layer spikes to between 2 × 10⁷ and 3 × 10⁸ through the squared ReLU${MOE_SPIKE[l] ? `; it ${MOE_SPIKE[l]}` : ""}.${l < 2 ? " The first two MoE layers were also the hardest to load-balance." : ""}</p>`);
    parts.push(`<p class="ol-src">Layers are counted from 0 at the bottom. Hover or tap a plate.</p>`);
    say(parts.join(""));
  }

  function lane() {
    gLane.selectAll("*").remove();
    const v = view.value;
    const title = (t, sub) => {
      gLane.append("text").attr("class", "ol-th").attr("x", X0).attr("y", 58).text(t);
      if (sub) gLane.append("text").attr("class", "ol-t2").attr("x", X0).attr("y", 76).text(sub);
    };
    const flagged = new Set();
    if (v === "layout") {
      title("29 Mamba-3 layers, 7 attention layers", "pattern M M M M A, repeated; one more M on top");
      for (let l = 0; l < L; l++)
        if (isAttn(l)) {
          flagged.add(l);
          gLane.append("line").attr("stroke", "var(--ol-attn)").attr("x1", X0 - 36).attr("x2", X0 - 6).attr("y1", rowY(l)).attr("y2", rowY(l));
          gLane.append("text").attr("x", X0).attr("y", rowY(l) + 4).text(`L${l}`);
          gLane.append("text").attr("class", "ol-t2").attr("x", X0 + 34).attr("y", rowY(l) + 4).text("DiffTPA attention, cache grows with n");
        }
      const ym = rowY(11.5);
      gLane.append("line").attr("stroke", "var(--ol-mamba)").attr("x1", X0 - 36).attr("x2", X0 - 6).attr("y1", ym).attr("y2", ym);
      gLane.append("text").attr("class", "ol-t2").attr("x", X0).attr("y", ym + 4).text("Mamba-3 MIMO, constant-size state");
      const ye = rowY(21.5) - 5;
      gLane.append("line").attr("stroke", "var(--ol-moe)").attr("x1", X0 - 36).attr("x2", X0 - 6).attr("y1", ye).attr("y2", ye);
      gLane.append("text").attr("class", "ol-t2").attr("x", X0).attr("y", ye + 4).text("thin plate above every mixer: Latent-MoE");
      for (let l = 0; l < L; l++) flagged.add(l);
    } else if (v === "sink") {
      title("Attention mass on position 0", "signal heads, noise heads, and the net after subtraction");
      const x = d3.scaleLinear([-0.02, 0.4], [X0 + 34, X1]);
      const ax = gLane.append("g").attr("class", "ol-axis").attr("transform", `translate(0,${rowY(34) - 30})`);
      ax.call(d3.axisTop(x).tickValues([0, 0.1, 0.2, 0.3, 0.4]).tickSize(4).tickFormat(d3.format(".1f")));
      for (const [ls, k] of Object.entries(SINK)) {
        const l = +ls;
        flagged.add(l);
        const yy = rowY(l);
        gLane.append("text").attr("x", X0).attr("y", yy + 4).text(`L${l}`);
        gLane.append("line").attr("stroke", "var(--ol-rule)").attr("stroke-width", 2).attr("x1", x(Math.min(k.signal, k.noise, k.net))).attr("x2", x(Math.max(k.signal, k.noise, k.net))).attr("y1", yy).attr("y2", yy);
        gLane.append("circle").attr("class", "ol-dot c-attn").attr("r", 5).attr("cx", x(k.signal)).attr("cy", yy);
        gLane.append("circle").attr("class", "ol-dot c-noise").attr("r", 5).attr("cx", x(k.noise)).attr("cy", yy);
        gLane.append("circle").attr("class", "ol-dot c-ink").attr("r", 6).attr("cx", x(k.net)).attr("cy", yy);
      }
      const k = SINK[29];
      const yy = rowY(29);
      gLane.append("text").attr("class", "ol-t2 ol-halo").attr("text-anchor", "middle").attr("x", x(k.net)).attr("y", yy + 22).text("net");
      gLane.append("text").attr("class", "ol-t2 ol-halo").attr("text-anchor", "end").attr("x", x(k.signal) - 2).attr("y", yy + 22).text("signal");
      gLane.append("text").attr("class", "ol-t2 ol-halo").attr("text-anchor", "start").attr("x", x(k.noise) - 14).attr("y", yy + 22).text("noise");
    } else if (v === "gate") {
      title("Share of (token, head) slots the gate closes", "reported for the first and last attention layers");
      const x = d3.scaleLinear([0, 0.6], [X0 + 34, X1 - 40]);
      for (let l = 0; l < L; l++)
        if (isAttn(l)) {
          flagged.add(l);
          const yy = rowY(l);
          gLane.append("text").attr("x", X0).attr("y", yy + 4).text(`L${l}`);
          gLane.append("line").attr("stroke", "var(--ol-grid)").attr("x1", x(0)).attr("x2", x(0.6)).attr("y1", yy).attr("y2", yy);
          if (GATE[l]) {
            gLane.append("rect").attr("class", "ol-fill c-attn").attr("x", x(0)).attr("y", yy - 5).attr("width", x(GATE[l].head) - x(0)).attr("height", 10).attr("rx", 3);
            gLane.append("text").attr("class", "ol-halo").attr("x", x(GATE[l].head) + 8).attr("y", yy + 4).text(fmt.pct(GATE[l].head));
          }
        }
      const ya = (rowY(9) + rowY(29)) / 2;
      gLane.append("text").attr("class", "ol-t2").attr("x", x(0.1)).attr("y", ya - 4).text("rises monotonically with depth;");
      gLane.append("text").attr("class", "ol-t2").attr("x", x(0.1)).attr("y", ya + 13).text("intermediate values are not reported");
    } else {
      title("Largest branch output, log scale", "the residual stream itself never exceeds 0.69");
      const x = d3.scaleLog([1, 1e17], [X0 + 34, X1]);
      const ax = gLane.append("g").attr("class", "ol-axis").attr("transform", `translate(0,${rowY(34) - 30})`);
      ax.call(d3.axisTop(x).tickValues([1, 1e4, 1e8, 1e12, 1e16]).tickSize(4).tickFormat((d) => `10${sup(Math.round(Math.log10(d)))}`));
      const xf = x(65504);
      gLane.append("line").attr("class", "ol-ref").attr("x1", xf).attr("x2", xf).attr("y1", rowY(34) - 26).attr("y2", rowY(0) + 12);
      gLane.append("text").attr("class", "ol-t2 ol-halo").attr("x", xf + 6).attr("y", rowY(30)).text("largest fp16 value");
      for (const [ls, r] of Object.entries(RUNAWAY)) {
        const l = +ls;
        flagged.add(l);
        const yy = rowY(l);
        gLane.append("rect").attr("class", "ol-fill c-mamba").attr("x", x(1)).attr("y", yy - 3).attr("width", x(r.max) - x(1)).attr("height", 7).attr("rx", 3);
        gLane.append("text").attr("x", X0).attr("y", yy + 4).text(`L${l}`);
        gLane.append("text").attr("class", "ol-halo").attr("text-anchor", "end").attr("x", x(r.max) - 6).attr("y", yy + 19).text(`mixer, head ${r.head}`);
      }
      for (const ls of Object.keys(MOE_SPIKE)) {
        const l = +ls;
        flagged.add(l);
        const yy = rowY(l) - 7;
        gLane.append("rect").attr("class", "ol-fill c-moe").attr("x", x(1)).attr("y", yy - 3).attr("width", x(3e8) - x(1)).attr("height", 6).attr("rx", 3);
        if (!(l in RUNAWAY)) gLane.append("text").attr("x", X0).attr("y", rowY(l) + 4).text(`L${l}`);
      }
      gLane.append("text").attr("class", "ol-halo").attr("x", x(3e8) + 8).attr("y", rowY(19) - 3).text("MoE, squared ReLU");
    }
    slabs.forEach((sl, i) => sl.g.attr("opacity", flagged.has(i) ? 1 : 0.28));
  }

  function sup(n) {
    return String(n).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
  }

  function draw() {
    lane();
    const n = 2 ** nS.value;
    out({ kv: fmt.bytes(7 * 1120 * 2 * n), state: "constant in n" });
    select(sel);
  }
  draw();
}
