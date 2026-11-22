// Three ways to write a block output onto the residual stream (report §6).
// 2D: these are wiring diagrams, and the quantity that separates them,
// the angle of each write, is one curve against depth.

import { d3, scaffold, svg, slider, segmented, readout, note, group, axes, arrow } from "./core.js";

const preNorm = (k) => Math.acos(Math.sqrt(k) / Math.sqrt(k + 1));
const K = 72;

const TEXT = {
  pre: `<p><b>Pre-Norm.</b> The block reads a normalised copy and adds its output to an un-normalised stream. The stream's norm grows with depth, so each new output is a smaller fraction of it. On the rescaled stream this is exactly a geodesic step of fixed angle \\(\\arccos(\\sqrt{k}/\\sqrt{k+1})\\): the curse of depth, written as an angle.</p>`,
  post: `<p><b>Post-Norm.</b> The sum is renormalised after every block, a hard radial projection back onto the sphere. Nothing shrinks the step with depth: an update as large as the stream and orthogonal to it turns the stream by 45° at every block, which the report links to the loss spikes of Post-Norm at scale.</p>`,
  geo: `<p><b>GeoNorm.</b> No normalisation on the read, none after the sum. The block output is projected onto the tangent space and the stream moves along the geodesic by \\(\\theta = \\alpha\\lVert v\\rVert / \\lVert x\\rVert\\), with one learned \\(\\alpha\\) per block. The angle adapts; Pre-Norm is the special case where it is fixed.</p>`,
};

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 760;
  const H = 520;
  const s = svg(canvas, W, H, "Wiring of Pre-Norm, Post-Norm and GeoNorm blocks, and the angle each one turns the residual stream by as depth grows");

  const cols = { pre: 130, post: 380, geo: 630 };
  const groups = {};
  const boxNode = (g, cx, cy, w, label, cls = "") => {
    g.append("rect").attr("class", `ol-box ${cls}`).attr("x", cx - w / 2).attr("y", cy - 14).attr("width", w).attr("height", 28).attr("rx", 5);
    g.append("text").attr("x", cx).attr("y", cy + 4.5).attr("text-anchor", "middle").text(label);
  };
  const plus = (g, cx, cy) => {
    g.append("circle").attr("class", "ol-box").attr("cx", cx).attr("cy", cy).attr("r", 10);
    g.append("path").attr("stroke", "var(--ol-ink)").attr("stroke-width", 1.4).attr("d", `M${cx - 5},${cy}h10M${cx},${cy - 5}v10`);
  };
  const stream = (g, cx, y0, y1) => {
    g.append("line").attr("stroke", "var(--ol-geo)").attr("stroke-width", 3.5).attr("stroke-linecap", "round").attr("x1", cx).attr("x2", cx).attr("y1", y0).attr("y2", y1 + 8);
    g.append("path").attr("fill", "var(--ol-geo)").attr("d", `M${cx},${y1 - 4}l-7,13h14z`);
  };
  const branch = (g, cx, yTap, yJoin, bx) => {
    g.append("path").attr("fill", "none").attr("stroke", "var(--ol-ink2)").attr("stroke-width", 1.4).attr("d", `M${cx},${yTap}H${bx}V${yJoin}`);
    arrow(g, bx, yJoin, cx + 12, yJoin, "", { width: 1.4 });
  };
  for (const [key, cx] of Object.entries(cols)) {
    const g = (groups[key] = s.append("g"));
    const bx = cx + 78;
    g.append("text").attr("class", "ol-th").attr("x", cx).attr("y", 24).attr("text-anchor", "middle").text({ pre: "Pre-Norm", post: "Post-Norm", geo: "GeoNorm" }[key]);
    stream(g, cx, 250, 44);
    if (key === "pre") {
      branch(g, cx, 222, 96, bx);
      boxNode(g, bx, 186, 64, "Norm");
      boxNode(g, bx, 138, 64, "block");
      plus(g, cx, 96);
    } else if (key === "post") {
      branch(g, cx, 222, 128, bx);
      boxNode(g, bx, 176, 64, "block");
      plus(g, cx, 128);
      boxNode(g, cx, 82, 64, "Norm");
    } else {
      branch(g, cx, 222, 108, bx);
      boxNode(g, bx, 168, 64, "block");
      boxNode(g, cx - 6, 108, 112, "geodesic write", "ol-geo-box");
    }
    const eq = g.append("text").attr("x", cx).attr("y", 280).attr("text-anchor", "middle");
    const mi = (t) => `<tspan class="ol-mi">${t}</tspan>`;
    eq.html(
      {
        pre: `${mi("x′")} = ${mi("x")} + ${mi("f")}(Norm(${mi("x")}))`,
        post: `${mi("x′")} = Norm(${mi("x")} + ${mi("f")}(${mi("x")}))`,
        geo: `${mi("x′")} = exp<tspan class="ol-msub" dy="4">x</tspan><tspan dy="-4">(${mi("α v")})</tspan>`,
      }[key]
    );
  }
  s.select(".ol-geo-box").attr("stroke", "var(--ol-geo)").attr("stroke-width", 2);

  const m = { l: 60, r: 30, t: 336, b: 44 };
  const x = d3.scaleLinear([1, K], [m.l, W - m.r]);
  const y = d3.scaleLinear([0, 0.9], [H - m.b, m.t]);
  axes(s, { x, y, W, H, m, xTicks: [1, 12, 24, 36, 48, 60, 72], yTicks: [0, 0.3, 0.6, 0.9], yFormat: d3.format(".1f"), xLabel: "residual write k (two per layer, 72 in Olala)", yLabel: "angle of the write, in radians" });
  const ks = d3.range(1, K + 0.01, 0.25);
  const lines = {
    pre: s.append("path").attr("class", "ol-line c-violet").attr("d", d3.line().x((k) => x(k)).y((k) => y(preNorm(k)))(ks)),
    post: s.append("path").attr("class", "ol-line c-noise").attr("d", `M${x(1)},${y(Math.PI / 4)}H${x(K)}`),
    geo: s.append("path").attr("class", "ol-line c-geo").attr("stroke-width", 3).attr("d", `M${x(37)},${y(0.55)}H${x(K)}`),
  };
  s.append("text").attr("class", "ol-halo").attr("x", x(14)).attr("y", y(preNorm(14)) - 10).text("Pre-Norm: arccos(√k / √(k+1))");
  s.append("text").attr("class", "ol-halo").attr("x", x(K) - 4).attr("y", y(Math.PI / 4) - 9).attr("text-anchor", "end").text("Post-Norm with ‖s‖ = ‖x‖ and s ⟂ x: 45° every time");
  s.append("text").attr("class", "ol-halo").attr("x", x(K) - 4).attr("y", y(0.55) - 10).attr("text-anchor", "end").text("GeoNorm, measured on MLP writes of the second half: about 0.55");
  const cur = s.append("g");
  cur.append("line").attr("class", "ol-ref").attr("y1", m.t).attr("y2", H - m.b);
  cur.append("circle").attr("class", "ol-dot c-violet").attr("r", 5);

  const g1 = group(panel);
  const which = segmented(g1, { label: "Scheme", options: [{ value: "pre", label: "Pre-Norm" }, { value: "post", label: "Post-Norm" }, { value: "geo", label: "GeoNorm" }], value: "geo", onChange: draw });
  const kS = slider(g1, { label: "write index k", min: 1, max: K, step: 1, value: 36, format: (v) => String(v), onInput: draw });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "pre", label: "Pre-Norm angle at k" },
    { key: "share", label: "new output as a share of the Pre-Norm stream, 1/√(k+1)" },
    { key: "post", label: "idealised Post-Norm angle" },
  ]);
  const say = note(g2);

  function draw() {
    const k = kS.value;
    const sel = which.value;
    for (const key of Object.keys(cols)) {
      groups[key].attr("opacity", key === sel ? 1 : 0.38);
      lines[key].attr("opacity", key === sel ? 1 : 0.4);
    }
    cur.select("line").attr("x1", x(k)).attr("x2", x(k));
    cur.select("circle").attr("cx", x(k)).attr("cy", y(preNorm(k)));
    out({ pre: `${preNorm(k).toFixed(3)} rad`, share: (1 / Math.sqrt(k + 1)).toFixed(3), post: "0.785 rad" });
    say(TEXT[sel] + `<p class="ol-src">Only the 0.55 plateau is a measurement; the two curves are the closed forms from the report's derivation.</p>`);
  }
  draw();
}
