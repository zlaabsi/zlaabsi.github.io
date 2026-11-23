// Block diagram of Olala-v1.0-mini-7A1B, after Figure 1 of the technical report.
// 2D: it is a wiring diagram. The left column is the model, bottom to top;
// the frame on the right opens whichever component is selected. Moving the
// layer slider swaps the mixer between Mamba-3 and differential attention,
// following the model's M M M M A pattern.

import { d3, h, scaffold, svg, slider, note, group, arrow } from "./core.js";

const ART = "/posts/olala-architecture/";
const isAttn = (l) => l % 5 === 4;
const see = (id, label) => `<a href="${ART}#${id}">${label}</a>`;

const NOTES = {
  embed: `<p><b>Token embedding.</b> 151,936 entries of dimension 1,536, not tied to the output layer.</p>`,
  l2: `<p><b>L2 normalisation.</b> Each embedding is normalised on entry, so that every token starts on the same sphere of radius \\(\\sqrt{D}\\). Without this, each token would carry the radius of its own embedding through the whole network.</p><p class="ol-src">From here to the output layer the stream never leaves that sphere.</p>`,
  head: `<p><b>Linear output layer.</b> 151,936 logits. There is no final normalisation in front of it: the last geodesic write already leaves the stream on the sphere.</p>`,
  geo: `<p><b>Geodesic write.</b> The block output is projected onto the tangent space of the residual sphere, and the stream moves along the geodesic by an angle \\(\\theta = \\alpha\\lVert v\\rVert/\\lVert x\\rVert\\), with one learned \\(\\alpha\\) per block. The side input is the residual itself: nothing is normalised before the block reads it.</p><p class="ol-src">There are two per layer, 72 in all. See ${see("fig-norms", "the three write schemes")} and ${see("fig-geonorm", "the write on the sphere")}.</p>`,
  mamba: `<p><b>Mamba-3 MIMO mixer.</b> 29 of the 36 layers. A fixed-size state per head, updated by a rank-4 write at every token and read by one matrix product. Select a block in the frame for its role.</p><p class="ol-src">See ${see("fig-memory", "the two memories")} for why its recall degrades where attention's does not.</p>`,
  attn: `<p><b>Differential tensor-product attention.</b> 7 of the 36 layers, every fifth one. Four fixes to softmax attention are stacked in this one layer. Select a block in the frame for its role.</p>`,
  moe: `<p><b>Latent-MoE feed-forward block.</b> One after every mixer. Each token is routed to 6 of 256 experts that work in a 384-dimensional copy of the stream.</p><p class="ol-src">See ${see("fig-moe", "the routing figure")}.</p>`,

  "a-proj": `<p><b>Query projection.</b> Queries stay dense: only keys and values are factorised, which leaves the score computation unchanged.</p>`,
  "a-tpa": `<p><b>Tensor Product Attention.</b> Keys and values are each built as an average of four outer products of a head factor and a feature factor. Only the factors are cached: 1,120 numbers per token per layer.</p><p class="ol-src">The report's figure labels this a 6× compressed cache. See ${see("fig-tpa", "the cache figure")}.</p>`,
  "a-shift": `<p><b>Token shift.</b> A convolution of kernel 2: each token is blended with its predecessor, \\(k_t \\leftarrow \\alpha_t k_{t-1} + (1-\\alpha_t)k_t\\), so that global attention need not spend heads on adjacent-token patterns.</p>`,
  "a-rms": `<p><b>RMSNorm on queries and keys.</b> Both are normalised before the dot product, so the scores depend on direction and the learned temperature, not on vector length.</p>`,
  "a-ssmax": `<p><b>Scalable Softmax.</b> The logits are multiplied by \\(s\\log n\\), one learned \\(s\\) per head, so that attention does not flatten as the window grows.</p><p class="ol-src">See ${see("fig-ssmax", "the fading figure")}.</p>`,
  "a-sdpa": `<p><b>Scaled dot-product attention.</b> Unchanged, which is why the layer runs on stock attention kernels. It carries no positional encoding: position is left to the Mamba-3 layers around it.</p>`,
  "a-diff": `<p><b>Differential subtraction.</b> 48 query heads, 36 for signal and 12 for noise, each noise head shared by three signal heads. The noise map is subtracted from the signal map with a learned weight.</p><p class="ol-src">See ${see("fig-diff", "the subtraction figure")}.</p>`,
  "a-gate": `<p><b>Zero-centered gate.</b> The attention output is multiplied by \\(\\mathrm{SiLU}(W_g x + 1.15)\\): the identity in expectation at initialisation, and able to close completely. On the trained model it closes for up to half of the (token, head) slots.</p><p class="ol-src">See ${see("fig-gate", "the gate figure")}.</p>`,
  "a-out": `<p><b>Output projection.</b> The gated result is projected back to 1,536 dimensions and handed to the geodesic write.</p>`,

  "m-in": `<p><b>Input projections.</b> The layer input is projected to the quantities the state-space recurrence needs: what to write, where, and how fast to forget.</p>`,
  "m-norm": `<p><b>Norm and RoPE.</b> The report's figure draws a normalisation and a rotary encoding on one group of the projected inputs. Its text says rotary encodings on the mixer's queries and keys were tested and not kept. The figure is reproduced as drawn; the two statements are in tension.</p>`,
  "m-ssm": `<p><b>Mamba-3 state-space model.</b> For each head, \\(S_t = \\alpha_t S_{t-1} + \\Delta t_t \\sum_{r=1}^{4} k_r(t)\\otimes v_r(t)\\). State dimension 128, head dimension 64, rank 4. The rank-4 write turns an idle memory-bound step into a small matrix product.</p><p class="ol-src">Three of these layers ran away during training. See ${see("fig-ratchet", "the mechanism")}.</p>`,
  "m-gate": `<p><b>SiLU gate.</b> The state-space output is multiplied by \\(z\\,\\sigma(z)\\) of a projection of the input. Unlike a sigmoid it is unbounded above, which the report counts among the reasons the runaway heads were not contained.</p>`,
  "m-out": `<p><b>Output projection.</b> Heads are summed here. In the final model there is one normalisation after the gate and none inside the kernel, a choice the report now advises against.</p>`,

  "e-proj": `<p><b>Latent projection.</b> One projection shared by all experts takes the stream from 1,536 to 384 dimensions. Experts exchange this smaller representation, a quarter of the data per token.</p>`,
  "e-router": `<p><b>Router.</b> A sigmoid score for each of the 256 experts; the top 6 are kept and their scores renormalised. Load balancing is done through a router bias, with a small auxiliary loss.</p>`,
  "e-experts": `<p><b>Latent experts.</b> 256 of them, each 384 → 768 → 384 with a squared ReLU. Granularity 4: a routed expert is a quarter of the hidden size of the dense block it replaces.</p>`,
  "e-shared": `<p><b>Shared expert.</b> Evaluated for every token, hidden size 1,536. The report's figure draws it among the latent experts. The stated parameter count only matches a dense block of hidden size 3,072 if it reads the full 1,536-wide stream.</p>`,
  "e-sum": `<p><b>Sum.</b> The six routed outputs, weighted by their router scores, and the shared expert's output are added.</p>`,
  "e-up": `<p><b>Up-projection.</b> Back from 384 to 1,536 dimensions, then a geodesic write onto the stream.</p>`,
};

export default function mount(root) {
  const { canvas, panel } = scaffold(root, { wide: true });
  canvas.append(h("p", { class: "ol-hint-line" }, "Select a block to open it. The slider changes the layer, and the mixer with it."));
  const W = 780;
  const H = 620;
  const s = svg(canvas, W, H, "Block diagram of Olala: embedding, 36 layers of mixer and mixture-of-experts with geodesic writes, output layer, and the internals of the selected component");
  const gMain = s.append("g");
  const gLink = s.append("g");
  const gDetail = s.append("g");

  let layer = 0;
  let sel = "mixer";
  let sub = null;
  let narrow = false;
  let seen = new Set();
  let refocus = null;
  let userPick = false;
  let frameNode = null;

  const g1 = group(panel);
  const lS = slider(g1, {
    label: "layer, counted from 0",
    min: 0,
    max: 35,
    step: 1,
    value: layer,
    format: (v) => `${v}, ${isAttn(v) ? "attention" : "Mamba-3"}`,
    onInput: (v) => {
      // The slider is about the mixer, so moving it always brings the mixer back.
      layer = v;
      sel = "mixer";
      sub = null;
      draw();
    },
  });
  const g2 = group(panel);
  const say = note(g2);

  /* ---------- drawing helpers ---------- */
  // Clickable nodes are buttons: focusable, labelled, and operable with Enter or Space.
  // A key drawn several times (the two RMSNorm boxes, say) gets one tab stop.
  function pickable(n, key, label, onPick, active) {
    n.classed("is-pick", true)
      .attr("role", "button")
      .attr("data-key", key)
      .attr("tabindex", seen.has(key) ? -1 : 0)
      .attr("aria-pressed", active)
      .attr("aria-label", label)
      .on("click", () => onPick(key))
      .on("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        onPick(key, true);
      });
    seen.add(key);
  }
  function box(g, key, cx, cy, w, label, { cls = "", hgt = 28, onPick, active = false, dim = false } = {}) {
    const n = g.append("g").attr("class", `ol-node ${cls}`).attr("opacity", dim ? 0.45 : 1);
    n.append("rect")
      .attr("class", cls ? "ol-soft" : "ol-box")
      .attr("x", cx - w / 2)
      .attr("y", cy - hgt / 2)
      .attr("width", w)
      .attr("height", hgt)
      .attr("rx", 5)
      .style("stroke-width", active ? 2.4 : null)
      .style("stroke", active ? "var(--ol-ink)" : null);
    n.append("text").attr("x", cx).attr("y", cy + 4.5).attr("text-anchor", "middle").attr("font-weight", active ? 600 : 400).text(label);
    if (onPick) pickable(n, key, label, onPick, active);
    return n;
  }
  function wire(g, pts, { head = true, dash, cls = "" } = {}) {
    const last = pts.length - 1;
    if (last > 1 || !head)
      g.append("path")
        .attr("fill", "none")
        .attr("stroke", cls ? "var(--c)" : "var(--ol-ink2)")
        .attr("class", cls)
        .attr("stroke-width", 1.4)
        .attr("stroke-dasharray", dash || null)
        .attr("d", "M" + pts.slice(0, head ? last : last + 1).map((p) => p.join(",")).join("L"));
    if (head) arrow(g, pts[last - 1][0], pts[last - 1][1], pts[last][0], pts[last][1], cls, { width: 1.4, head: 7, dash });
  }
  function circleNode(g, key, cx, cy, glyph, onPick, active, label) {
    const n = g.append("g").attr("class", "ol-node");
    n.append("circle").attr("class", "ol-box").attr("cx", cx).attr("cy", cy).attr("r", 11).style("stroke-width", active ? 2.4 : null).style("stroke", active ? "var(--ol-ink)" : null);
    n.append("text").attr("x", cx).attr("y", cy + 4.5).attr("text-anchor", "middle").text(glyph);
    if (onPick) pickable(n, key, label || glyph, onPick, active);
  }
  const small = (g, x, y, text, anchor = "start") => g.append("text").attr("class", "ol-t2").attr("x", x).attr("y", y).attr("text-anchor", anchor).text(text);

  /* ---------- left column: the model ---------- */
  const CX = 150;
  const Y = { text: 598, embed: 530, l2: 482, mixer: 400, geo1: 338, moe: 262, geo2: 200, head: 104 };
  const anchors = { mixer: [230, Y.mixer], moe: [230, Y.moe], geo: [230, Y.geo1], embed: [235, Y.embed], l2: [205, Y.l2], head: [235, Y.head] };

  function pickMain(key, viaKeyboard) {
    sel = key === "geo1" || key === "geo2" ? "geo" : key;
    sub = null;
    userPick = true;
    if (viaKeyboard) refocus = key;
    draw();
  }

  function drawMain() {
    gMain.selectAll("*").remove();
    const attn = isAttn(layer);
    gMain.append("rect").attr("x", 30).attr("y", 72).attr("width", 240).attr("height", 486).attr("rx", 18).attr("fill", "var(--ol-panel)").attr("stroke", "var(--ol-rule)");
    gMain.append("rect").attr("x", 46).attr("y", 164).attr("width", 208).attr("height", 272).attr("rx", 14).attr("fill", "var(--ol-surface)").attr("stroke", "var(--ol-ink2)").attr("stroke-width", 1.2);
    small(gMain, 56, 452, "36 ×").attr("font-weight", 600);
    small(gMain, 92, 452, `showing layer ${layer}`);

    // The residual stream, bottom to top.
    wire(gMain, [[CX, Y.text - 12], [CX, Y.embed + 15]]);
    wire(gMain, [[CX, Y.embed - 14], [CX, Y.l2 + 15]]);
    wire(gMain, [[CX, Y.l2 - 14], [CX, Y.mixer + 18]], { cls: "c-geo" });
    wire(gMain, [[CX, Y.mixer - 17], [CX, Y.geo1 + 15]]);
    wire(gMain, [[CX, Y.geo1 - 14], [CX, Y.moe + 18]], { cls: "c-geo" });
    wire(gMain, [[CX, Y.moe - 17], [CX, Y.geo2 + 15]]);
    wire(gMain, [[CX, Y.geo2 - 14], [CX, Y.head + 15]], { cls: "c-geo" });
    wire(gMain, [[CX, Y.head - 14], [CX, 44]]);
    // The residual also enters each geodesic write from the side.
    wire(gMain, [[CX, 440], [244, 440], [244, Y.geo1], [231, Y.geo1]], { cls: "c-geo" });
    wire(gMain, [[CX, 300], [244, 300], [244, Y.geo2], [231, Y.geo2]], { cls: "c-geo" });

    small(gMain, CX, Y.text + 4, "input text, as tokens", "middle");
    box(gMain, "embed", CX, Y.embed, 170, "token embedding", { onPick: pickMain, active: sel === "embed" });
    box(gMain, "l2", CX, Y.l2, 110, "L2 norm", { onPick: pickMain, active: sel === "l2" });
    box(gMain, "mixer", CX, Y.mixer, 160, attn ? "differential attention" : "Mamba-3", { cls: attn ? "c-attn" : "c-mamba", hgt: 34, onPick: pickMain, active: sel === "mixer" });
    box(gMain, "geo1", CX, Y.geo1, 160, "geodesic write", { cls: "c-geo", onPick: pickMain, active: sel === "geo" });
    box(gMain, "moe", CX, Y.moe, 160, "Latent-MoE", { cls: "c-moe", hgt: 34, onPick: pickMain, active: sel === "moe" });
    box(gMain, "geo2", CX, Y.geo2, 160, "geodesic write", { cls: "c-geo", onPick: pickMain, active: sel === "geo" });
    box(gMain, "head", CX, Y.head, 170, "linear output layer", { onPick: pickMain, active: sel === "head" });
    small(gMain, CX + 10, 510, "1,536 per token");
    small(gMain, CX + 10, 60, "151,936 logits");
  }

  /* ---------- right frame: the selected component ---------- */
  const FX = 306;
  const FY = 36;
  const FW = 462;
  const FH = 576;
  const pickSub = (key, viaKeyboard) => {
    sub = sub === key ? null : key;
    if (viaKeyboard) refocus = key;
    draw();
  };

  function frame(title, subtitle) {
    frameNode = gDetail.append("rect").attr("x", FX).attr("y", FY).attr("width", FW).attr("height", FH).attr("rx", 14).attr("fill", "none").attr("stroke", "var(--ol-ink2)").attr("stroke-width", 1.4).attr("stroke-dasharray", "2 5").attr("stroke-linecap", "round").node();
    gDetail.append("text").attr("class", "ol-th").attr("x", FX + 18).attr("y", FY + 28).text(title);
    if (subtitle) small(gDetail, FX + 18, FY + 46, subtitle);
  }

  function attention() {
    const g = gDetail;
    frame(`Layer ${layer}: differential attention`, "one of the 7 attention layers");
    const xq = 372, xk = 486, xv = 612, xg = 722, xm = 518;
    const y = { out: 112, mul: 156, diff: 204, sdpa: 262, ss: 326, rms: 378, shift: 430, kron: 484, lin: 540, bus: 584 };
    const on = (k) => sub === k;
    // input bus
    wire(g, [[xq, y.bus], [xg, y.bus]], { head: false });
    small(g, xq - 34, y.bus + 18, "layer input x");
    for (const x of [xq, xk - 28, xk + 28, xv - 28, xv + 28, xg]) wire(g, [[x, y.bus], [x, y.lin + 15]]);
    // Q
    box(g, "a-proj", xq, y.lin, 64, "Linear", { onPick: pickSub, active: on("a-proj") });
    wire(g, [[xq, y.lin - 14], [xq, y.rms + 15]]);
    box(g, "a-rms", xq, y.rms, 74, "RMSNorm", { onPick: pickSub, active: on("a-rms") });
    wire(g, [[xq, y.rms - 14], [xq, y.ss + 15]]);
    box(g, "a-ssmax", xq, y.ss, 74, "SSMax", { cls: "c-noise", onPick: pickSub, active: on("a-ssmax") });
    wire(g, [[xq, y.ss - 14], [xq, y.sdpa + 16]]);
    small(g, xq + 8, y.sdpa + 34, "Q");
    // K and V: rank-4 factors, outer product, token shift
    for (const [x, name] of [[xk, "K"], [xv, "V"]]) {
      for (const d of [6, 3]) g.append("rect").attr("class", "ol-box").attr("x", x - 28 - 26 + d).attr("y", y.lin - 14 - d).attr("width", 52).attr("height", 28).attr("rx", 5);
      box(g, "a-tpa", x - 28, y.lin, 52, "Linear", { onPick: pickSub, active: on("a-tpa") });
      box(g, "a-tpa", x + 28, y.lin, 52, "Linear", { onPick: pickSub, active: on("a-tpa") });
      wire(g, [[x - 28, y.lin - 14], [x - 28, y.kron], [x - 12, y.kron]]);
      wire(g, [[x + 28, y.lin - 14], [x + 28, y.kron], [x + 12, y.kron]]);
      circleNode(g, "a-tpa", x, y.kron, "⊗", pickSub, on("a-tpa"), "outer product");
      wire(g, [[x, y.kron - 11], [x, y.shift + 15]]);
      box(g, "a-shift", x, y.shift, 84, "token shift", { cls: "c-geo", onPick: pickSub, active: on("a-shift") });
      if (name === "K") {
        wire(g, [[x, y.shift - 14], [x, y.rms + 15]]);
        box(g, "a-rms", x, y.rms, 74, "RMSNorm", { onPick: pickSub, active: on("a-rms") });
        wire(g, [[x, y.rms - 14], [x, y.sdpa + 16]]);
      } else wire(g, [[x, y.shift - 14], [x, y.sdpa + 16]]);
      small(g, x + 8, y.sdpa + 34, name);
    }
    small(g, (xk + xv) / 2, y.kron - 2, "rank 4,", "middle");
    small(g, (xk + xv) / 2, y.kron + 14, "cached", "middle");
    // attention, subtraction, gate
    box(g, "a-sdpa", xm, y.sdpa, 340, "scaled dot-product attention", { hgt: 30, onPick: pickSub, active: on("a-sdpa") });
    wire(g, [[xm, y.sdpa - 15], [xm, y.diff + 16]]);
    box(g, "a-diff", xm, y.diff, 200, "differential subtraction", { cls: "c-attn", hgt: 30, onPick: pickSub, active: on("a-diff") });
    small(g, xm + 110, y.diff - 2, "36 signal heads,");
    small(g, xm + 110, y.diff + 14, "12 noise");
    wire(g, [[xm, y.diff - 15], [xm, y.mul + 12]]);
    circleNode(g, "a-gate", xm, y.mul, "×", pickSub, on("a-gate"), "gate product");
    box(g, "a-gate", xg, y.lin, 64, "Linear", { onPick: pickSub, active: on("a-gate") });
    wire(g, [[xg, y.lin - 14], [xg, y.ss + 12]]);
    circleNode(g, "a-gate", xg, y.ss, "σ", pickSub, on("a-gate"), "SiLU gate");
    small(g, xg - 16, y.ss + 4, "SiLU gate,", "end");
    small(g, xg - 16, y.ss + 20, "zero-centered", "end");
    wire(g, [[xg, y.ss - 11], [xg, y.mul], [xm + 12, y.mul]]);
    wire(g, [[xm, y.mul - 11], [xm, y.out + 15]]);
    box(g, "a-out", xm, y.out, 64, "Linear", { onPick: pickSub, active: on("a-out") });
  }

  function mamba() {
    const g = gDetail;
    frame(`Layer ${layer}: Mamba-3`, "one of the 29 linear-mixer layers");
    const xm = 470, xg = 660;
    const y = { out: 120, mul: 172, ssm: 240, rope: 308, norm: 362, proj: 426, lin: 494, bus: 548 };
    const on = (k) => sub === k;
    wire(g, [[xm, y.bus], [xg, y.bus]], { head: false });
    small(g, xm - 60, y.bus + 18, "layer input x");
    wire(g, [[xm, y.bus], [xm, y.lin + 15]]);
    wire(g, [[xg, y.bus], [xg, y.lin + 15]]);
    box(g, "m-in", xm, y.lin, 110, "Linear", { onPick: pickSub, active: on("m-in") });
    wire(g, [[xm, y.lin - 14], [xm, y.proj + 15]]);
    box(g, "m-in", xm, y.proj, 150, "Linear", { cls: "c-mamba", onPick: pickSub, active: on("m-in") });
    // three groups of projected inputs; one passes through Norm and RoPE
    for (const x of [xm - 54, xm - 30]) wire(g, [[x, y.proj - 14], [x, y.ssm + 17]]);
    wire(g, [[xm + 36, y.proj - 14], [xm + 36, y.norm + 13]]);
    box(g, "m-norm", xm + 36, y.norm, 64, "Norm", { hgt: 24, onPick: pickSub, active: on("m-norm") });
    wire(g, [[xm + 36, y.norm - 12], [xm + 36, y.rope + 15]]);
    box(g, "m-norm", xm + 36, y.rope, 64, "RoPE", { cls: "c-noise", onPick: pickSub, active: on("m-norm") });
    wire(g, [[xm + 36, y.rope - 14], [xm + 36, y.ssm + 17]]);
    box(g, "m-ssm", xm, y.ssm, 204, "Mamba-3 state-space model", { cls: "c-mamba", hgt: 32, onPick: pickSub, active: on("m-ssm") });
    small(g, xm - 8, y.ssm - 24, "rank 4, state 128", "end");
    small(g, FX + FW - 22, FY + 28, "state of one head", "end");
    g.append("text").attr("x", FX + FW - 22).attr("y", FY + 48).attr("text-anchor", "end").text("Sₜ = αₜ Sₜ₋₁ + Δtₜ Σᵣ kᵣ ⊗ vᵣ");
    wire(g, [[xm, y.ssm - 16], [xm, y.mul + 12]]);
    circleNode(g, "m-gate", xm, y.mul, "×", pickSub, on("m-gate"), "gate product");
    box(g, "m-gate", xg, y.lin, 90, "Linear", { onPick: pickSub, active: on("m-gate") });
    wire(g, [[xg, y.lin - 14], [xg, y.proj + 15]]);
    box(g, "m-gate", xg, y.proj, 90, "Linear", { cls: "c-mamba", onPick: pickSub, active: on("m-gate") });
    wire(g, [[xg, y.proj - 14], [xg, y.rope + 12]]);
    circleNode(g, "m-gate", xg, y.rope, "σ", pickSub, on("m-gate"), "SiLU gate");
    small(g, xg + 18, y.rope + 4, "SiLU gate");
    wire(g, [[xg, y.rope - 11], [xg, y.mul], [xm + 12, y.mul]]);
    wire(g, [[xm, y.mul - 11], [xm, y.out + 15]]);
    box(g, "m-out", xm, y.out, 90, "Linear", { onPick: pickSub, active: on("m-out") });
  }

  function moe() {
    const g = gDetail;
    frame("Latent-MoE", "the feed-forward block after every mixer");
    const xm = 470, xr = 690;
    const y = { up: 124, sum: 196, e1: 290, e2: 330, proj: 470, bus: 540 };
    const on = (k) => sub === k;
    wire(g, [[xm, y.bus], [xr, y.bus]], { head: false });
    small(g, xm - 60, y.bus + 18, "stream x, 1,536");
    wire(g, [[xm, y.bus], [xm, y.proj + 15]]);
    wire(g, [[xr, y.bus], [xr, y.proj + 15]]);
    box(g, "e-proj", xm, y.proj, 90, "Linear", { onPick: pickSub, active: on("e-proj") });
    small(g, xm + 54, y.proj - 2, "latent projection");
    small(g, xm + 54, y.proj + 14, "1,536 → 384");
    box(g, "e-router", xr, y.proj, 90, "Linear", { onPick: pickSub, active: on("e-router") });
    small(g, xr, y.proj + 34, "router", "middle");
    // into the experts
    wire(g, [[xm, y.proj - 14], [xm, y.e2 + 34], [xm - 62, y.e2 + 34], [xm - 62, y.e2 + 15]]);
    wire(g, [[xm, y.e2 + 34], [xm + 62, y.e2 + 34], [xm + 62, y.e2 + 15]]);
    box(g, "e-shared", xm - 62, y.e1, 116, "shared expert", { cls: "c-violet", onPick: pickSub, active: on("e-shared") });
    box(g, "e-experts", xm + 62, y.e1, 116, "latent expert", { cls: "c-moe", onPick: pickSub, active: on("e-experts"), dim: true });
    box(g, "e-experts", xm - 62, y.e2, 116, "latent expert", { cls: "c-moe", onPick: pickSub, active: on("e-experts"), dim: true });
    box(g, "e-experts", xm + 62, y.e2, 116, "latent expert", { cls: "c-moe", onPick: pickSub, active: on("e-experts") });
    small(g, xm + 128, y.e2 + 20, "granularity 4");
    wire(g, [[xr, y.proj - 14], [xr, (y.e1 + y.e2) / 2], [xm + 124, (y.e1 + y.e2) / 2]]);
    small(g, xr + 4, (y.e1 + y.e2) / 2 - 26, "top 6", "end");
    small(g, xr + 4, (y.e1 + y.e2) / 2 - 10, "of 256", "end");
    // out
    wire(g, [[xm - 62, y.e1 - 14], [xm - 62, y.sum], [xm - 12, y.sum]]);
    wire(g, [[xm + 62, y.e1 - 14], [xm + 62, y.sum], [xm + 12, y.sum]]);
    circleNode(g, "e-sum", xm, y.sum, "+", pickSub, on("e-sum"), "sum");
    wire(g, [[xm, y.sum - 11], [xm, y.up + 15]]);
    box(g, "e-up", xm, y.up, 90, "Linear", { onPick: pickSub, active: on("e-up") });
    small(g, xm + 54, y.up + 4, "384 → 1,536");
  }

  function geodesic() {
    const g = gDetail;
    frame("Geodesic write", "how every block output joins the stream");
    const cx = 500, cy = 330, R = 120;
    g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", R).attr("fill", "none").attr("stroke", "var(--ol-muted)").attr("stroke-width", 1.2);
    const at = (a) => [cx + R * Math.sin(a), cy - R * Math.cos(a)];
    const [x0, y0] = at(-0.5);
    arrow(g, cx, cy, x0, y0, "c-ink", { width: 2 });
    g.append("path").attr("class", "ol-line c-geo").attr("stroke-width", 4).attr("d", d3.line()(d3.range(0, 31).map((i) => at(-0.5 + (0.95 * i) / 30))));
    const [x1, y1] = at(0.45);
    g.append("circle").attr("class", "ol-dot c-geo").attr("r", 6).attr("cx", x1).attr("cy", y1);
    arrow(g, x0, y0, x0 + 96, y0 - 52, "c-violet", { width: 2 });
    small(g, cx + 12, cy - 26, "residual x");
    small(g, x0 + 70, y0 - 58, "block output s");
    small(g, x1 + 12, y1 + 4, "new x, still on the sphere");
    small(g, cx, cy + R + 34, "the stream moves along the arc, by an angle set", "middle");
    small(g, cx, cy + R + 50, "by the tangent part of s and a learned step size", "middle");
  }

  const FACTS = {
    embed: ["Token embedding", "one vector per token", [["vocabulary", "151,936 tokens"], ["dimension", "1,536"], ["tied to the output layer", "no"]]],
    l2: ["L2 normalisation", "the entry onto the sphere", [["applied to", "every embedding"], ["radius afterwards", "√D, for all tokens"], ["normalisation before blocks", "none"]]],
    head: ["Linear output layer", "from the stream to the vocabulary", [["output", "151,936 logits"], ["final normalisation", "none"], ["why none", "x is already on the sphere"]]],
  };
  function facts(title, subtitle, rows) {
    const g = gDetail;
    frame(title, subtitle);
    rows.forEach(([k, v], i) => {
      small(g, FX + 40, FY + 110 + i * 34, k);
      g.append("text").attr("x", FX + 250).attr("y", FY + 110 + i * 34).attr("font-weight", 600).text(v);
      g.append("line").attr("stroke", "var(--ol-grid)").attr("x1", FX + 40).attr("x2", FX + FW - 40).attr("y1", FY + 122 + i * 34).attr("y2", FY + 122 + i * 34);
    });
  }

  // Wide: the frame sits beside the model. Narrow: it goes under it, so that
  // nothing has to be found by scrolling sideways.
  function layout() {
    const want = canvas.clientWidth > 0 && canvas.clientWidth < 620;
    if (want === narrow && s.attr("data-laid")) return false;
    narrow = want;
    s.attr("data-laid", 1);
    if (narrow) {
      s.attr("viewBox", "0 0 482 1224").attr("width", 482).attr("height", 1224).style("min-width", "420px");
      gMain.attr("transform", "translate(-20,0)");
      gDetail.attr("transform", `translate(${10 - FX},${H + 14 - FY})`);
    } else {
      s.attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H).style("min-width", null);
      gMain.attr("transform", null);
      gDetail.attr("transform", null);
    }
    return true;
  }

  function draw() {
    seen = new Set();
    drawMain();
    gDetail.selectAll("*").remove();
    gLink.selectAll("*").remove();
    const attn = isAttn(layer);
    if (sel === "mixer") (attn ? attention : mamba)();
    else if (sel === "moe") moe();
    else if (sel === "geo") geodesic();
    else facts(...FACTS[sel]);
    if (!narrow) {
      const [ax, ay] = anchors[sel];
      gLink.append("path").attr("fill", "none").attr("stroke", "var(--ol-ink2)").attr("stroke-width", 1.4).attr("stroke-dasharray", "2 5").attr("stroke-linecap", "round").attr("d", `M${ax + 4},${ay}L${FX},${ay}`);
    }
    say(NOTES[sub || (sel === "mixer" ? (attn ? "attn" : "mamba") : sel)]);
    if (refocus) {
      s.select(`[data-key="${refocus}"][tabindex="0"]`).node()?.focus({ preventScroll: true });
      refocus = null;
    }
    if (narrow && userPick && frameNode) {
      const r = frameNode.getBoundingClientRect();
      if (r.top > innerHeight * 0.55 || r.bottom < 80) frameNode.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
    userPick = false;
  }

  layout();
  draw();
  new ResizeObserver(() => {
    if (layout()) draw();
  }).observe(canvas);
}
