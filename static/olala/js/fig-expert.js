// The shape of one routed expert (report §4): standard MoE against Latent-MoE.
// 2D: the argument is a ratio of two widths, so every width is drawn as a
// height on one scale, and the ratio is read on a log axis underneath.

import { scaffold, svg, slider, readout, note, group, mtext, tip, fmt } from "./core.js";

const D = 1536;
const HID = 768;
// Divisors of the stream width, so the number of experts per budget is whole.
const LATENTS = [128, 192, 256, 384, 512, 768, 1536];
const OLALA = LATENTS.indexOf(384);
const PX = 150 / D;

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 760;
  const H = 650;
  const s = svg(canvas, W, H, "");

  const BAR = 10;
  const X = { in: 92, h: 370, out: 648, latIn: 204, latOut: 536 };
  const CY = { std: 131, lat: 400 };
  const tall = (dim) => dim * PX;

  const bar = (g, x, cy, dim, cls) =>
    g.append("rect").attr("class", `ol-fill ${cls}`).attr("x", x).attr("y", cy - tall(dim) / 2).attr("width", BAR).attr("height", tall(dim)).attr("rx", 2);

  // A weight matrix between a layer of width d0 at x0 and one of width d1 at x1.
  const trap = (g, x0, d0, x1, d1, cy) =>
    g.append("path").attr("d", `M${x0},${cy - tall(d0) / 2}L${x1},${cy - tall(d1) / 2}L${x1},${cy + tall(d1) / 2}L${x0},${cy + tall(d0) / 2}Z`);

  const hover = (sel, html) => sel.on("pointermove", (ev) => tip.show(ev, html)).on("pointerleave", tip.hide);

  const dim = (g, x, y, sym, value) => mtext(g.append("text").attr("class", "ol-t2").attr("x", x + BAR / 2).attr("y", y).attr("text-anchor", "middle"), [{ i: sym }, ` = ${fmt.int(value)}`]);

  const onFill = (g, x, y, label) =>
    g.append("text").attr("x", x).attr("y", y).attr("text-anchor", "middle").style("fill", "var(--ol-surface)").style("font-weight", 600).text(label);

  const heading = (g, y, title) => {
    g.append("text").attr("class", "ol-th").attr("x", 40).attr("y", y).text(title);
    return g.append("text").attr("class", "ol-t2").attr("x", W - 40).attr("y", y).attr("text-anchor", "end");
  };

  /* ---------- standard expert: drawn once ---------- */

  const gStd = s.append("g");
  heading(gStd, 28, "Standard MoE").text(`hidden ÷ input = ${fmt.int(HID)} ÷ ${fmt.int(D)} = ${HID / D}`);
  gStd.append("rect").attr("class", "ol-soft c-violet").attr("x", 108).attr("y", CY.std - 87).attr("width", 534).attr("height", 174).attr("rx", 10);
  const w1 = `${fmt.int(D)} × ${fmt.int(HID)} = ${fmt.int(D * HID)} weights`;
  hover(trap(gStd, 116, D, 366, HID, CY.std).attr("class", "ol-fill c-violet"), `<b>First matrix</b><br>${w1}`);
  hover(trap(gStd, 384, HID, 634, D, CY.std).attr("class", "ol-fill c-violet"), `<b>Second matrix</b><br>${w1}`);
  onFill(gStd, 216, CY.std + 5, "W₁");
  onFill(gStd, 534, CY.std + 5, "W₂");
  bar(gStd, X.h, CY.std, HID, "c-ink");
  bar(gStd, X.in, CY.std, D, "c-geo");
  bar(gStd, X.out, CY.std, D, "c-geo");
  const yStd = CY.std + 87 + 18;
  dim(gStd, X.in, yStd, "d", D);
  dim(gStd, X.h, yStd, "h", HID);
  dim(gStd, X.out, yStd, "d", D);
  gStd
    .append("text")
    .attr("class", "ol-t2")
    .attr("x", X.h + BAR / 2)
    .attr("y", yStd + 18)
    .attr("text-anchor", "middle")
    .text(`one expert reads the stream itself: ${fmt.int(2 * D * HID)} weights`);

  /* ---------- latent expert: redrawn with the slider ---------- */

  const gLat = s.append("g");
  const latRatio = heading(gLat, 288, "Latent-MoE");
  const gLatBody = gLat.append("g");

  /* ---------- the ratio, on a log axis ---------- */

  const AX = { y: 602, x0: 90, oct: 122 };
  const xr = (r) => AX.x0 + (Math.log2(r) + 2) * AX.oct;
  const gAx = s.append("g");
  gAx.append("text").attr("class", "ol-th").attr("x", AX.x0).attr("y", AX.y - 40).text("hidden width ÷ input width");
  gAx.append("rect").attr("class", "ol-soft c-moe").attr("x", xr(2)).attr("y", AX.y - 10).attr("width", xr(4) - xr(2)).attr("height", 20).attr("rx", 6);
  gAx.append("text").attr("class", "ol-t2").attr("x", (xr(2) + xr(4)) / 2).attr("y", AX.y - 40).attr("text-anchor", "middle").text("where dense MLPs work best");
  gAx.append("line").attr("stroke", "var(--ol-rule)").attr("stroke-width", 1.4).attr("x1", xr(0.25)).attr("x2", xr(8)).attr("y1", AX.y).attr("y2", AX.y);
  for (const r of [0.25, 0.5, 1, 2, 4, 8]) {
    gAx.append("line").attr("stroke", "var(--ol-rule)").attr("stroke-width", 1.4).attr("x1", xr(r)).attr("x2", xr(r)).attr("y1", AX.y - 5).attr("y2", AX.y + 5);
    gAx.append("text").attr("class", "ol-t2").attr("x", xr(r)).attr("y", AX.y + 25).attr("text-anchor", "middle").text(String(r));
  }
  const marker = (cls) => {
    const g = gAx.append("g").attr("class", cls);
    g.append("circle").attr("class", "ol-dot").attr("r", 6.5).attr("cy", AX.y);
    g.append("text").attr("class", "ol-halo").attr("y", AX.y - 13).attr("text-anchor", "middle");
    return g;
  };
  const mStd = marker("c-violet");
  const mLat = marker("c-moe");
  mStd.attr("transform", `translate(${xr(HID / D)},0)`);

  /* ---------- controls ---------- */

  const g1 = group(panel);
  const latS = slider(g1, {
    label: "width the experts read, ℓ",
    min: 0,
    max: LATENTS.length - 1,
    step: 1,
    value: OLALA,
    format: (i) => fmt.int(LATENTS[i]),
    marks: [{ value: OLALA, label: "Olala" }],
    onInput: draw,
  });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "std", label: "standard expert, hidden ÷ input" },
    { key: "lat", label: "latent expert, hidden ÷ input" },
    { key: "wstd", label: "weights in one standard expert, 2·d·h" },
    { key: "wlat", label: "weights in one latent expert, 2·ℓ·h" },
    { key: "n", label: "latent experts for the weights of one standard expert" },
    { key: "proj", label: "the two shared projections, once per block, 2·d·ℓ" },
  ]);
  const say = note(g2);

  function draw() {
    const lat = LATENTS[latS.value];
    const n = D / lat;
    const ratio = HID / lat;
    const cy = CY.lat;
    const half = tall(Math.max(HID, lat)) / 2 + 16;
    const g = gLatBody;
    g.selectAll("*").remove();

    latRatio.text(`hidden ÷ input = ${fmt.int(HID)} ÷ ${fmt.int(lat)} = ${ratio}`);

    // The experts that fit in the weights of one standard expert, back to front.
    for (let k = n - 1; k >= 0; k--) {
      g.append("rect").attr("class", "ol-soft c-moe").attr("x", 196 + 2 * k).attr("y", cy - half - 3.5 * k).attr("width", 358).attr("height", 2 * half).attr("rx", 10);
    }
    const wl = `${fmt.int(lat)} × ${fmt.int(HID)} = ${fmt.int(lat * HID)} weights`;
    hover(trap(g, 218, lat, 366, HID, cy).attr("class", "ol-fill c-moe"), `<b>First matrix</b><br>${wl}`);
    hover(trap(g, 384, HID, 532, lat, cy).attr("class", "ol-fill c-moe"), `<b>Second matrix</b><br>${wl}`);
    onFill(g, 322, cy + 5, "W₁");
    onFill(g, 428, cy + 5, "W₂");
    bar(g, X.latIn, cy, lat, "c-ink");
    bar(g, X.h, cy, HID, "c-ink");
    bar(g, X.latOut, cy, lat, "c-ink");

    // One projection each way, shared by every expert of the block.
    const wp = `${fmt.int(D)} × ${fmt.int(lat)} = ${fmt.int(D * lat)} weights, shared by all experts`;
    hover(trap(g, 106, D, 192, lat, cy).attr("fill", "var(--ol-muted)"), `<b>Down-projection</b><br>${wp}`);
    hover(trap(g, 558, lat, 644, D, cy).attr("fill", "var(--ol-muted)"), `<b>Up-projection</b><br>${wp}`);
    onFill(g, 0, 0, "down-projection").attr("transform", `translate(124,${cy}) rotate(-90)`).style("font-weight", 500).attr("pointer-events", "none");
    onFill(g, 0, 0, "up-projection").attr("transform", `translate(634,${cy}) rotate(-90)`).style("font-weight", 500).attr("pointer-events", "none");
    bar(g, X.in, cy, D, "c-geo");
    bar(g, X.out, cy, D, "c-geo");

    const y = cy + Math.max(tall(D) / 2, half) + 18;
    dim(g, X.in, y, "d", D);
    dim(g, X.latIn, y, "ℓ", lat);
    dim(g, X.h, y, "h", HID);
    dim(g, X.latOut, y, "ℓ", lat);
    dim(g, X.out, y, "d", D);
    g.append("text")
      .attr("class", "ol-t2")
      .attr("x", X.h + BAR / 2)
      .attr("y", y + 18)
      .attr("text-anchor", "middle")
      .text(n === 1 ? "one expert for the same weights: the projections buy nothing" : `${n} experts for the weights of one standard expert`);

    const same = ratio === HID / D;
    mLat.attr("transform", `translate(${xr(ratio)},0)`);
    mLat.select("text").text(same ? `both, ${ratio}` : `latent, ${ratio}`);
    mStd.select("text").text(same ? "" : `standard, ${HID / D}`);

    s.attr("aria-label", `One routed expert drawn as a shape: reading the ${fmt.int(D)}-wide stream directly, and reading a latent copy of width ${fmt.int(lat)} through a shared projection`);

    out({
      std: `${HID / D}`,
      lat: `${ratio}`,
      wstd: fmt.int(2 * D * HID),
      wlat: fmt.int(2 * lat * HID),
      n: `${n}`,
      proj: fmt.int(2 * D * lat),
    });

    const where = ratio < 2 ? "below" : ratio > 4 ? "above" : "inside";
    say(
      `<p>An expert is a two-matrix MLP, and its shape is the ratio of its hidden width to the width it reads. The report's rule of thumb is that dense MLPs work best when that ratio is between two and four. A routed expert of hidden size 768 that reads the 1,536-wide stream is at 0.5: narrower in the middle than at its ends.</p>${
        lat === D
          ? `<p>With \\(\\ell = d\\) nothing changes. The latent expert has the standard shape and the same weights, and the two projections are extra.</p>`
          : `<p>Latent-MoE puts one down-projection in front of all the experts of a block and one up-projection behind them. At \\(\\ell = ${lat}\\) the ratio is ${ratio}, ${where} that range, and an expert holds ${n} times fewer weights, so ${n} of them fit in the budget of one standard expert.${
              lat === 384 ? ` This is Olala's setting, and why its number of experts is multiplied by four.` : ""
            }</p>`
      }<p class="ol-src">Widths and weight counts only, from \\(d = 1536\\) and \\(h = 768\\). The shared expert is left out. The measured gain is in the ablation view of the routing figure.</p>`
    );
  }
  draw();
}
