// Where to put the attention layers (report §3.2, Table 4).
// 2D: nine layer orderings as strips, one metric as a dot per strip.

import { d3, scaffold, svg, segmented, note, group, tip } from "./core.js";

// Benchmark scale: 24 layers, 4 attention (A) among 20 linear-mixer layers (l).
// Two rows carry an obvious typo in the report's table ("Af"); read as "AA".
const ROWS = [
  { name: "Uniform (adopted)", p: "llllAllllAllllAllllAllll", val: 2.789, hs: 46.37, piqa: 70.0, fda: 67.85, swde: 71.23 },
  { name: "Middle block", p: "llllllllllAAAAllllllllll", val: 2.796, hs: 46.1, piqa: 70.73, fda: 67.15, swde: 61.75 },
  { name: "Edges", p: "AAllllllllllllllllllllAA", val: 2.809, hs: 44.99, piqa: 70.46, fda: 43.92, swde: 61.48 },
  { name: "Spread, including ends", p: "AlllllllAllllllAlllllllA", val: 2.798, hs: 46.11, piqa: 69.1, fda: 69.6, swde: 73.28 },
  { name: "Paired thirds", p: "lllllllAAllllllAAlllllll", val: 2.791, hs: 46.24, piqa: 70.24, fda: 70.24, swde: 71.02 },
  { name: "Two pairs, front", p: "llllAAllllAAllllllllllll", val: 2.796, hs: 45.94, piqa: 69.15, fda: 70.14, swde: 69.94 },
  { name: "Alternating, front", p: "lllAlAlAlAllllllllllllll", val: 2.804, hs: 45.45, piqa: 69.26, fda: 73.5, swde: 53.46 },
  { name: "Two pairs, back", p: "llllllllllllAAllllAAllll", val: 2.791, hs: 46.13, piqa: 70.46, fda: 69.78, swde: 74.98 },
  { name: "Alternating, back", p: "llllllllllllllAlAlAlAlll", val: 2.795 },
];

const METRICS = {
  val: { label: "Validation loss", dom: [2.785, 2.812], floor: 0.003, f: (v) => v.toFixed(3), better: "lower is better" },
  fda: { label: "FDA recall", dom: [40, 78], floor: 6.4, f: (v) => `${v.toFixed(1)}%`, better: "higher is better" },
  swde: { label: "SWDE recall", dom: [50, 78], floor: 3.5, f: (v) => `${v.toFixed(1)}%`, better: "higher is better" },
};

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 760;
  const H = 424;
  const s = svg(canvas, W, H, "Nine placements of four attention layers among twenty linear-mixer layers, with the resulting benchmark metric");
  const top = 64;
  const pitch = 35;
  const sx = 196;
  const cw = 12;
  const lx0 = 520;
  const lx1 = 728;

  s.append("text").attr("class", "ol-t2").attr("x", sx).attr("y", 30).text("layer 0");
  s.append("text").attr("class", "ol-t2").attr("x", sx + 24 * cw).attr("y", 30).attr("text-anchor", "end").text("layer 23");
  s.append("line").attr("stroke", "var(--ol-muted)").attr("x1", sx + 52).attr("x2", sx + 24 * cw - 58).attr("y1", 26).attr("y2", 26);
  s.append("path").attr("fill", "var(--ol-muted)").attr("d", `M${sx + 24 * cw - 56},26l-8,-4v8z`);

  const rows = s.selectAll("g.row").data(ROWS).join("g").attr("class", "row").attr("transform", (d, i) => `translate(0,${top + i * pitch})`);
  rows.append("text").attr("x", sx - 14).attr("y", 5).attr("text-anchor", "end").attr("font-weight", (d, i) => (i === 0 ? 600 : 400)).text((d) => d.name);
  rows.each(function (d) {
    d3.select(this)
      .selectAll("rect.c")
      .data(d.p.split(""))
      .join("rect")
      .attr("class", (c) => `c ol-fill ${c === "A" ? "c-attn" : "c-mamba"}`)
      .attr("opacity", (c) => (c === "A" ? 1 : 0.4))
      .attr("x", (c, j) => sx + j * cw)
      .attr("y", -8)
      .attr("width", cw - 2)
      .attr("height", 16)
      .attr("rx", 2);
  });
  rows.append("line").attr("class", "guide").attr("stroke", "var(--ol-grid)").attr("x1", lx0).attr("x2", lx1).attr("y1", 0).attr("y2", 0);
  rows.append("circle").attr("class", "ol-dot c-ink").attr("r", 5);
  rows.append("text").attr("class", "v ol-halo").attr("y", 5);
  rows
    .append("rect")
    .attr("class", "ol-hit")
    .attr("x", 0)
    .attr("y", -pitch / 2)
    .attr("width", W)
    .attr("height", pitch)
    .on("pointermove", (ev, d) =>
      tip.show(
        ev,
        d.fda
          ? `<b>${d.name}</b><br>validation loss ${d.val.toFixed(3)}<br>HellaSwag ${d.hs.toFixed(2)}%, PIQA ${d.piqa.toFixed(2)}%<br>FDA ${d.fda.toFixed(2)}%, SWDE ${d.swde.toFixed(2)}%`
          : `<b>${d.name}</b><br>validation loss ${d.val.toFixed(3)}<br><span class="ol-tip-sub">other metrics not reported</span>`
      )
    )
    .on("pointerleave", tip.hide);

  const band = s.insert("rect", "g.row").attr("fill", "var(--ol-ink)").attr("opacity", 0.07).attr("y", top - pitch / 2).attr("height", ROWS.length * pitch);
  const axisG = s.append("g").attr("class", "ol-axis").attr("transform", `translate(0,${top + ROWS.length * pitch - 6})`);
  const head = s.append("text").attr("class", "ol-th").attr("x", lx0).attr("y", 30);
  const bandLbl = s.append("text").attr("class", "ol-t2").attr("y", H - 6);

  const g1 = group(panel);
  const metric = segmented(g1, { label: "Metric", options: Object.entries(METRICS).map(([value, m]) => ({ value, label: m.label })), value: "val", onChange: draw });
  const g2 = group(panel);
  const say = note(g2);

  function draw() {
    const key = metric.value;
    const M = METRICS[key];
    const x = d3.scaleLinear(M.dom, [lx0, lx1]);
    head.text(`${M.label}, ${M.better}`);
    axisG.call(d3.axisBottom(x).tickValues(key === "val" ? [2.79, 2.8, 2.81] : d3.range(M.dom[0], M.dom[1] + 1, 10)).tickSizeOuter(0).tickFormat(key === "val" ? d3.format(".2f") : (v) => `${v}%`));
    const ref = ROWS[0][key];
    band.attr("x", x(ref - M.floor)).attr("width", x(ref + M.floor) - x(ref - M.floor));
    bandLbl.attr("x", lx1).attr("text-anchor", "end").text("shaded band: seed noise around the adopted layout");
    rows.select("circle").attr("display", (d) => (d[key] == null ? "none" : null)).attr("cx", (d) => (d[key] == null ? 0 : x(d[key])));
    rows
      .select("text.v")
      .attr("x", (d) => (d[key] == null ? lx0 : x(d[key]) + (x(d[key]) > lx1 - 60 ? -10 : 10)))
      .attr("text-anchor", (d) => (d[key] != null && x(d[key]) > lx1 - 60 ? "end" : "start"))
      .attr("class", (d) => (d[key] == null ? "v ol-t2" : "v ol-halo"))
      .text((d) => (d[key] == null ? "not reported" : M.f(d[key])));
    say(
      key === "val"
        ? `<p>Spreading the four attention layers evenly gives the lowest loss. Placements that concentrate attention in the later half (two pairs back, alternating back) beat their mirror images in the earlier half, by 0.005 and 0.009, both beyond the 0.003 noise floor.</p><p class="ol-src">Report, Table 4, at benchmark scale: 24 layers, 750M parameters. Hover a row for every metric.</p>`
        : `<p>Recall is much noisier than loss on this benchmark: the two-sigma width across seeds is about ${M.floor} points here, shown as the band. Most placements sit inside it. The clear losers put attention only at the edges, or interleave it tightly near the input.</p><p class="ol-src">Report, Table 4 and the noise floor of §2.3.</p>`
    );
  }
  draw();
}
