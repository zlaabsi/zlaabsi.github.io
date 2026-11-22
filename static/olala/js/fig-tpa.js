// Tensor Product Attention cache (report §3.3.4, Figure 2).
// 2.5D: the point is a stack. R rank-one sheets, each the outer product of
// two short vectors, sit above the dense tensor they sum to. Only the short
// vectors are cached. Depth is what lets "R sheets" and "one tensor" coexist.

import { d3, scaffold, svg, slider, readout, note, group, isoProjector, rng, css, onTheme, fmt } from "./core.js";

const HK = 12; // KV heads drawn
const DF = 16; // feature columns drawn, each standing for 8 of 128 dims
const U = 11;
const RMAX = 8;

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 760;
  const H = 530;
  const s = svg(canvas, W, H, "Rank-one sheets built from cached factor vectors, stacked above the dense key tensor they sum to");
  const iso = isoProjector({ ox: 378, oy: 356 });
  const scene = s.append("g");
  const labels = s.append("g");

  const r = rng(5);
  const A = d3.range(RMAX).map(() => d3.range(HK).map(() => r.normal()));
  const B = d3.range(RMAX).map(() => d3.range(DF).map(() => r.normal()));

  const g1 = group(panel);
  const rS = slider(g1, { label: "rank R", min: 1, max: RMAX, step: 1, value: 4, format: (v) => String(v), onInput: () => { if (pick.value > rS.value) pick.set(rS.value); draw(); } });
  const pick = slider(g1, { label: "sheet shown in full, r", min: 1, max: RMAX, step: 1, value: 4, format: (v) => String(v), onInput: () => { if (pick.value > rS.value) pick.set(rS.value); draw(); } });
  const hS = slider(g1, { label: "KV heads H<sub>kv</sub>", min: 4, max: 48, step: 1, value: 12, format: (v) => String(v), onInput: draw });
  const dS = slider(g1, { label: "head dimension d<sub>h</sub>", min: 32, max: 256, step: 32, value: 128, format: (v) => String(v), onInput: draw });
  const nS = slider(g1, { label: "context length n", min: 10, max: 18, step: 1, value: 15, format: (v) => fmt.tokens(2 ** v), onInput: draw });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "dense", label: "dense K, V per token, 2·H<sub>kv</sub>·d<sub>h</sub>" },
    { key: "tpa", label: "TPA per token, 2R(H<sub>kv</sub> + d<sub>h</sub>)" },
    { key: "ratio", label: "ratio" },
    { key: "tok", label: "bytes per token, 7 layers, bf16" },
    { key: "ctx", label: "cache at n tokens" },
  ]);
  const say = note(g2);

  function colour() {
    const pos = css(root, "--ol-attn");
    const neg = css(root, "--ol-mamba");
    const mid = css(root, "--ol-grid");
    const up = d3.interpolateRgb(mid, pos);
    const dn = d3.interpolateRgb(mid, neg);
    return (v, max) => {
      const t = Math.max(-1, Math.min(1, v / max));
      return t >= 0 ? up(Math.sqrt(t)) : dn(Math.sqrt(-t));
    };
  }

  function cell(g, x, y, z, w, d, fill) {
    g.append("path")
      .attr("d", iso.path([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]]))
      .attr("fill", fill)
      .attr("stroke", "var(--ol-surface)")
      .attr("stroke-width", 0.6);
  }

  function sheet(g, z, values, max, col) {
    for (let i = 0; i < HK; i++) for (let j = 0; j < DF; j++) cell(g, j * U, i * U, z, U, U, col(values(i, j), max));
    g.append("path")
      .attr("d", iso.path([[0, 0, z], [DF * U, 0, z], [DF * U, HK * U, z], [0, HK * U, z]]))
      .attr("fill", "none")
      .attr("stroke", "var(--ol-ink2)")
      .attr("stroke-width", 1);
  }

  function draw() {
    const R = rS.value;
    const sel = Math.min(pick.value, R) - 1;
    const col = colour();
    scene.selectAll("*").remove();
    labels.selectAll("*").remove();

    // The dense tensor, rebuilt from the factors.
    const sum = (i, j) => d3.sum(d3.range(R), (k) => A[k][i] * B[k][j]) / R;
    const gSum = scene.append("g");
    sheet(gSum, 0, sum, 1.6, col);

    const z0 = 178;
    const dz = 18;
    for (let k = 0; k < R; k++) {
      const z = z0 + k * dz;
      const g = scene.append("g");
      const on = k === sel;
      if (on) sheet(g, z, (i, j) => A[k][i] * B[k][j], 2.2, col);
      else
        g.append("path")
          .attr("d", iso.path([[0, 0, z], [DF * U, 0, z], [DF * U, HK * U, z], [0, HK * U, z]]))
          .attr("fill", "var(--ol-surface)")
          .attr("fill-opacity", k < sel ? 0.75 : 0.12)
          .attr("stroke", "var(--ol-muted)")
          .attr("stroke-width", 0.9);
      // Cached factors: a_r along the head axis, b_r along the feature axis.
      const off = -2.4 * U;
      for (let i = 0; i < HK; i++) cell(g, off, i * U, z, U, U, col(A[k][i], 2));
      for (let j = 0; j < DF; j++) cell(g, j * U, off, z, U, U, col(B[k][j], 2));
      for (const q of [
        [[off, 0, z], [off + U, 0, z], [off + U, HK * U, z], [off, HK * U, z]],
        [[0, off, z], [DF * U, off, z], [DF * U, off + U, z], [0, off + U, z]],
      ])
        g.append("path").attr("d", iso.path(q)).attr("fill", "none").attr("stroke", on ? "var(--ol-ink)" : "var(--ol-ink2)").attr("stroke-width", on ? 1.4 : 0.7);
    }

    // Annotations, anchored to projected points of the scene.
    const zTop = z0 + (R - 1) * dz;
    const zSel = z0 + sel * dz;
    const lab = (pt, dx, dy, lines, anchor = "start", strong = false) => {
      const [px, py] = iso(...pt);
      const t = labels.append("text").attr("text-anchor", anchor).attr("x", px + dx).attr("y", py + dy);
      lines.forEach((ln, i) => t.append("tspan").attr("x", px + dx).attr("dy", i ? 17 : 0).attr("class", i || !strong ? (i ? "ol-t2" : null) : "ol-th").text(ln));
      const ex = px + (anchor === "end" ? dx + 6 : dx - 6);
      labels.append("line").attr("stroke", "var(--ol-muted)").attr("stroke-width", 0.8).attr("x1", px).attr("y1", py).attr("x2", ex).attr("y2", py + dy - 4);
    };
    lab([-2.4 * U, HK * U, zTop], -46, -30, [`head factors a₁…a${sub(R)}`, `${HK} entries each, one per KV head`], "end", true);
    lab([DF * U, -2.4 * U + U, zTop], 46, -34, [`feature factors b₁…b${sub(R)}`, "one entry per feature"], "start", true);
    lab([DF * U, HK * U * 0.5, zSel], 52, 30, [`sheet ${sel + 1}: a${sub(sel + 1)} ⊗ b${sub(sel + 1)}`, "rank one, never stored"], "start");
    lab([DF * U, HK * U * 0.5, 0], 52, 8, ["Kₜ = (1/R) Σ aᵣ ⊗ bᵣ", "rebuilt when the layer runs"], "start", true);
    lab([0, HK * U, 0], -52, 14, ["12 KV heads by 128 features", "each drawn column is 8 features"], "end");

    // Downward arrow from the stack to the sum.
    const [ax, ay] = iso(DF * U * 0.5, HK * U * 0.5, z0 - 8);
    const [bx, by] = iso(DF * U * 0.5, HK * U * 0.5, 70);
    labels.append("line").attr("stroke", "var(--ol-ink2)").attr("stroke-width", 1.4).attr("x1", ax).attr("y1", ay).attr("x2", bx).attr("y2", by - 8);
    labels.append("path").attr("fill", "var(--ol-ink2)").attr("d", `M${bx},${by}l-5,-9h10z`);
    labels.append("text").attr("class", "ol-halo").attr("x", ax + 9).attr("y", (ay + by) / 2 + 2).text("average the R sheets");

    // Diverging key.
    const kx = 22;
    const ky = H - 30;
    [-1, -0.5, 0, 0.5, 1].forEach((v, i) => labels.append("rect").attr("x", kx + i * 18).attr("y", ky).attr("width", 17).attr("height", 11).attr("rx", 2).attr("fill", col(v, 1)));
    labels.append("text").attr("class", "ol-t2").attr("x", kx).attr("y", ky - 7).text("entry value, negative to positive");

    const Hkv = hS.value;
    const dh = dS.value;
    const n = 2 ** nS.value;
    const dense = 2 * Hkv * dh;
    const tpa = 2 * R * (Hkv + dh);
    out({
      dense: fmt.int(dense),
      tpa: fmt.int(tpa),
      ratio: `${(dense / tpa).toFixed(2)}×`,
      tok: fmt.bytes(tpa * 7 * 2),
      ctx: `${fmt.bytes(tpa * 7 * 2 * n)} against ${fmt.bytes(dense * 7 * 2 * n)}`,
    });
    const isFinal = R === 4 && Hkv === 12 && dh === 128;
    say(
      `<p>A dense cache stores \\(H_{kv} \\times d_h\\) numbers per token for keys and again for values: a product. TPA stores \\(R\\) pairs of vectors, a sum, \\(2R(H_{kv}+d_h)\\), and rebuilds the tensor by outer products when the layer runs.</p>${
        isFinal
          ? `<p>At \\(R = 4\\), \\(H_{kv} = 12\\), \\(d_h = 128\\) this gives the report's 1,120 elements per token per layer, hence \\(7 \\times 1120 \\times 2 = 15{,}680\\) bytes per token in bf16 over the seven attention layers.</p>`
          : `<p>Set \\(R = 4\\), \\(H_{kv} = 12\\), \\(d_h = 128\\) to recover the report's 1,120 elements per token per layer.</p>`
      }<p class="ol-src">Factor values are random, for illustration. The 12 KV heads are inferred from the 1,120 figure and the 12 noise heads; the report states the total, not the split.</p>`
    );
  }

  function sub(n) {
    return String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);
  }

  onTheme(draw);
  draw();
}
