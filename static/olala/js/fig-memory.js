// Two associative memories (report §3.1; the framing follows Alexandre TL's
// talk "Le Transformer en passe d'être dépassé ?").
// 2D: a growing table beside a fixed matrix, and one curve for each showing
// how well a stored value can be read back as more pairs are written.
//
// Both memories store T pairs (k_i, v_i) with random unit keys and values.
//   attention:     read(q) = Σ softmax(β q·k_i) v_i          cache grows with T
//   linear state:  S = Σ α^(T−i) k_i v_iᵀ,  read(q) = qᵀS    size fixed
// The y axis is the cosine between read(k_j) and the stored v_j, averaged over j.

import { d3, scaffold, svg, slider, readout, note, group, axes, rng, css, onTheme, fmt } from "./core.js";

const TMAX = 512;
const DV = 16;
const BETA = 20;
const TS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512];

function unit(r, d) {
  const v = Float64Array.from({ length: d }, () => r.normal());
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
}

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 720;
  const H = 520;
  const s = svg(canvas, W, H, "A growing key-value table next to a fixed-size state matrix, and read-back accuracy of each as more pairs are stored");
  const top = s.append("g");
  const m = { l: 54, r: 28, t: 250, b: 46 };
  const x = d3.scaleLog([1, TMAX], [m.l, W - m.r]).base(2);
  const y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
  axes(s, { x, y, W, H, m, xTicks: [1, 4, 16, 64, 256, 512], xFormat: (v) => v, yTicks: [0, 0.25, 0.5, 0.75, 1], yFormat: d3.format(".2f"), xLabel: "pairs written so far, T", yLabel: "cosine between the value read back and the value stored" });
  const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1]));
  const pAtt = s.append("path").attr("class", "ol-line c-attn");
  const pLin = s.append("path").attr("class", "ol-line c-mamba").attr("stroke-width", 2.6);
  const pTheory = s.append("path").attr("class", "ol-ref");
  const lAtt = s.append("text").attr("class", "ol-halo").text("attention");
  const lLin = s.append("text").attr("class", "ol-halo").attr("font-weight", 600).text("fixed-size state");
  const lTh = s.append("text").attr("class", "ol-t2 ol-halo");
  const cursor = s.append("g");
  cursor.append("line").attr("class", "ol-ref").attr("y1", m.t).attr("y2", H - m.b);
  const cA = cursor.append("circle").attr("r", 5).attr("class", "ol-dot c-attn");
  const cL = cursor.append("circle").attr("r", 5).attr("class", "ol-dot c-mamba");

  const g1 = group(panel);
  const tS = slider(g1, { label: "pairs written, T", min: 0, max: TS.length - 1, step: 1, value: 9, format: (v) => String(TS[v]), onInput: draw });
  const dS = slider(g1, { label: "key dimension d<sub>k</sub>", min: 4, max: 7, step: 1, value: 5, format: (v) => String(2 ** v), onInput: () => { cache = null; draw(); } });
  const aS = slider(g1, { label: "state decay α per step", min: 0.9, max: 1, step: 0.001, value: 1, format: (v) => v.toFixed(3), onInput: draw });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "ma", label: "attention cache, T(d<sub>k</sub> + d<sub>v</sub>)" },
    { key: "ml", label: "state, d<sub>k</sub> · d<sub>v</sub>" },
    { key: "ca", label: "read-back cosine, attention" },
    { key: "cl", label: "read-back cosine, state" },
  ]);
  const say = note(g2);

  let cache = null;
  function build(dk) {
    const r = rng(101 + dk);
    const K = d3.range(TMAX).map(() => unit(r, dk));
    const V = d3.range(TMAX).map(() => unit(r, DV));
    const G = d3.range(TMAX).map(() => new Float64Array(TMAX));
    for (let i = 0; i < TMAX; i++)
      for (let j = i; j < TMAX; j++) {
        let acc = 0;
        for (let c = 0; c < dk; c++) acc += K[i][c] * K[j][c];
        G[i][j] = G[j][i] = acc;
      }
    return { dk, K, V, G };
  }

  function recall(T, alpha) {
    const { G, V } = cache;
    const step = Math.max(1, Math.floor(T / 48));
    let sa = 0;
    let sl = 0;
    let cnt = 0;
    for (let j = 0; j < T; j += step) {
      const ra = new Float64Array(DV);
      const rl = new Float64Array(DV);
      let z = 0;
      const w = new Float64Array(T);
      for (let i = 0; i < T; i++) {
        w[i] = Math.exp(BETA * (G[j][i] - 1));
        z += w[i];
      }
      for (let i = 0; i < T; i++) {
        const wa = w[i] / z;
        const wl = Math.pow(alpha, T - 1 - i) * G[j][i];
        for (let c = 0; c < DV; c++) {
          ra[c] += wa * V[i][c];
          rl[c] += wl * V[i][c];
        }
      }
      const cos = (rr) => {
        let dot = 0;
        let nn = 0;
        for (let c = 0; c < DV; c++) {
          dot += rr[c] * V[j][c];
          nn += rr[c] * rr[c];
        }
        return nn > 0 ? dot / Math.sqrt(nn) : 0;
      };
      sa += cos(ra);
      sl += cos(rl);
      cnt++;
    }
    return [sa / cnt, sl / cnt];
  }

  function glyphs(T, dk, alpha) {
    top.selectAll("*").remove();
    const pos = css(root, "--ol-attn");
    const neg = css(root, "--ol-mamba");
    const mid = css(root, "--ol-grid");
    const colr = (v, mx) => {
      const t = Math.max(-1, Math.min(1, v / mx));
      return t >= 0 ? d3.interpolateRgb(mid, pos)(Math.sqrt(t)) : d3.interpolateRgb(mid, neg)(Math.sqrt(-t));
    };
    // Left: the attention cache, one row per token, capped at 12 drawn rows.
    const tx = 54;
    const ty = 52;
    top.append("text").attr("class", "ol-th").attr("x", tx).attr("y", 24).text("Attention: a table that grows");
    const rowsShown = Math.min(T, 12);
    const rh = 11;
    for (let i = 0; i < rowsShown; i++) {
      top.append("rect").attr("class", "ol-soft c-attn").attr("x", tx).attr("y", ty + i * (rh + 2)).attr("width", 70).attr("height", rh).attr("rx", 2);
      top.append("rect").attr("class", "ol-soft c-attn").attr("x", tx + 76).attr("y", ty + i * (rh + 2)).attr("width", 120).attr("height", rh).attr("rx", 2);
    }
    top.append("text").attr("class", "ol-t2").attr("x", tx).attr("y", ty - 8).text("keys");
    top.append("text").attr("class", "ol-t2").attr("x", tx + 76).attr("y", ty - 8).text("values");
    top
      .append("text")
      .attr("class", "ol-t2")
      .attr("x", tx + 208)
      .attr("y", ty + 10)
      .text(T > 12 ? `${T} rows, 12 drawn` : `${T} ${T === 1 ? "row" : "rows"}`);
    top.append("text").attr("class", "ol-t2").attr("x", tx + 208).attr("y", ty + 28).text("one per token read");

    // Right: the state matrix after T writes, top-left 16 x 16 block, real values.
    const sx = 420;
    const sy = 52;
    const cs = 10;
    top.append("text").attr("class", "ol-th").attr("x", sx).attr("y", 24).text("Linear mixer: a matrix that stays put");
    const { K, V } = cache;
    const n = Math.min(16, dk);
    const S = d3.range(n).map(() => new Float64Array(16));
    for (let i = 0; i < T; i++) {
      const a = Math.pow(alpha, T - 1 - i);
      for (let p = 0; p < n; p++) for (let q = 0; q < 16; q++) S[p][q] += a * K[i][p] * V[i][q];
    }
    const mx = Math.max(0.05, d3.max(S, (rw) => d3.max(rw, Math.abs)));
    for (let p = 0; p < n; p++)
      for (let q = 0; q < 16; q++)
        top.append("rect").attr("x", sx + q * cs).attr("y", sy + p * cs).attr("width", cs - 1).attr("height", cs - 1).attr("fill", colr(S[p][q], mx));
    top.append("rect").attr("x", sx - 1).attr("y", sy - 1).attr("width", 16 * cs + 1).attr("height", n * cs + 1).attr("fill", "none").attr("stroke", "var(--ol-ink2)");
    top.append("text").attr("class", "ol-t2").attr("x", sx + 172).attr("y", sy + 10).text(`${dk} × ${DV} numbers`);
    top.append("text").attr("class", "ol-t2").attr("x", sx + 172).attr("y", sy + 28).text("whatever T is");
    top.append("text").attr("class", "ol-t2").attr("x", sx + 172).attr("y", sy + 58).text("each write adds");
    top.append("text").attr("class", "ol-t2").attr("x", sx + 172).attr("y", sy + 76).text("one outer product");
    if (dk > 16) top.append("text").attr("class", "ol-t2").attr("x", sx).attr("y", sy + 16 * cs + 16).text("first 16 key rows shown");
  }

  function draw() {
    const dk = 2 ** dS.value;
    const alpha = aS.value;
    const T = TS[tS.value];
    if (!cache || cache.dk !== dk) cache = build(dk);
    const pts = TS.map((t) => [t, ...recall(t, alpha)]);
    pAtt.attr("d", line(pts.map((d) => [d[0], d[1]])));
    pLin.attr("d", line(pts.map((d) => [d[0], d[2]])));
    const th = d3.range(0, 9.01, 0.1).map((e) => [2 ** e, 1 / Math.sqrt(1 + (2 ** e - 1) / dk)]);
    pTheory.attr("d", alpha > 0.9995 ? line(th) : null);
    lTh.attr("display", alpha > 0.9995 ? null : "none").attr("x", x(TMAX) - 4).attr("y", y(th[th.length - 1][1]) + 18).attr("text-anchor", "end").text("dashed: 1/√(1 + (T − 1)/dₖ)");
    const last = pts[pts.length - 1];
    lAtt.attr("x", x(TMAX) - 4).attr("y", y(last[1]) - 9).attr("text-anchor", "end");
    lLin.attr("x", x(48)).attr("y", y(pts[10][2]) - 12);
    const cur = pts[tS.value];
    cursor.select("line").attr("x1", x(T)).attr("x2", x(T));
    cA.attr("cx", x(T)).attr("cy", y(cur[1]));
    cL.attr("cx", x(T)).attr("cy", y(cur[2]));
    glyphs(T, dk, alpha);
    out({ ma: fmt.int(T * (dk + DV)), ml: fmt.int(dk * DV), ca: cur[1].toFixed(3), cl: cur[2].toFixed(3) });
    say(
      `<p>Both memories receive the same pairs. Attention keeps every pair and picks the closest key with a softmax, so the value it returns stays nearly exact. The state superposes all pairs in one matrix, and reading with \\(k_j\\) returns \\(v_j\\) plus a little of every other value, weighted by \\(k_j^\\top k_i\\).</p><p>${
        alpha > 0.9995
          ? `With random keys and no decay the expected cosine is \\(1/\\sqrt{1+(T-1)/d_k}\\): capacity scales with the key dimension, and precision degrades smoothly once \\(T\\) passes it.`
          : `With decay \\(\\alpha < 1\\) the state forgets old pairs on purpose: recent values are read back cleanly, and the average over all \\(T\\) stored pairs drops.`
      }</p><p class="ol-src">Simulation on random unit vectors, softmax sharpness fixed at ${BETA}. This is why the hybrid keeps a few attention layers for exact recall.</p>`
    );
  }
  onTheme(draw);
  draw();
}
