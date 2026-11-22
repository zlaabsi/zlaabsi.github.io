// Latent-MoE feed-forward block (report §4, Table 23).
// 2.5D: 256 experts laid out as a floor plan, with the six a token selects
// rising out of it. Height carries the routing weight, so sparsity is seen
// rather than counted. A second view plots the ablations of Tables 16 and 17.

import { d3, scaffold, svg, slider, segmented, button, readout, note, group, isoProjector, rng, sigmoid, tip, fmt } from "./core.js";

const D = 1536;
const LAT = 384;
const HID = 768;
const SHARED_HID = 1536;
const NEXP = 256;
const SIDE = 16;
const P = {
  proj: D * LAT, // one latent projection
  expert: 2 * LAT * HID, // two matrices per routed expert
  shared: 2 * D * SHARED_HID,
  dense: 2 * D * 3072,
};

const T16 = {
  moe: [{ g: 2, v: 2.91 }, { g: 4, v: 2.893 }, { g: 8, v: 2.88 }],
  lmoe: [{ g: 2, v: 2.853 }, { g: 4, v: 2.845 }, { g: 8, v: 2.839 }],
};
const T17 = [{ k: 50, v: 2.839 }, { k: 24, v: 2.845 }, { k: 13, v: 2.853 }, { k: 6, v: 2.869 }];

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 760;
  const H = 540;
  const s = svg(canvas, W, H, "Floor plan of 256 latent experts with the six selected for one token raised above it");
  const gScene = s.append("g");
  const gAbl = s.append("g");
  const iso = isoProjector({ ox: 352, oy: 104 });
  const C = 12; // tile pitch

  let token = 1;
  const g1 = group(panel);
  const view = segmented(g1, { label: "View", options: [{ value: "route", label: "Routing one token" }, { value: "abl", label: "Ablations" }], value: "route", onChange: draw });
  const ctl = group(g1);
  const kS = slider(ctl, { label: "experts selected per token, top-k", min: 1, max: 16, step: 1, value: 6, format: (v) => String(v), onInput: draw });
  button(ctl, "Route another token", () => { token++; draw(); });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "act", label: "feed-forward weights read for this token" },
    { key: "dense", label: "dense FFN of hidden size 3,072" },
    { key: "tot", label: "feed-forward weights in the layer" },
    { key: "frac", label: "share read" },
  ]);
  const say = note(g2);

  function strip(g, x, y, len, cls, z = 0, w = 10, hgt = 4) {
    const b = iso.box(x, y, z, w, len, hgt);
    g.append("path").attr("d", b.left).attr("class", `ol-fill ${cls}`).attr("opacity", 0.55);
    g.append("path").attr("d", b.right).attr("class", `ol-fill ${cls}`).attr("opacity", 0.75);
    g.append("path").attr("d", b.top).attr("class", `ol-fill ${cls}`);
  }

  function label(g, pt, dx, dy, lines, anchor = "start") {
    const [px, py] = iso(...pt);
    const t = g.append("text").attr("text-anchor", anchor).attr("x", px + dx).attr("y", py + dy);
    lines.forEach((ln, i) => t.append("tspan").attr("x", px + dx).attr("dy", i ? 17 : 0).attr("class", i ? "ol-t2" : "ol-th").text(ln));
    g.append("line").attr("stroke", "var(--ol-muted)").attr("stroke-width", 0.8).attr("x1", px).attr("y1", py).attr("x2", px + dx + (anchor === "end" ? 6 : -6)).attr("y2", py + dy - 4);
  }

  function drawRoute() {
    const k = kS.value;
    gScene.selectAll("*").remove();
    const r = rng(7000 + token);
    const scores = d3.range(NEXP).map(() => sigmoid(1.3 * r.normal() - 0.6));
    const order = d3.range(NEXP).sort((a, b) => scores[b] - scores[a]);
    const chosen = new Set(order.slice(0, k));
    const tot = d3.sum(order.slice(0, k), (i) => scores[i]);

    // Input and latent strips on the left.
    const full = SIDE * C;
    strip(gScene, -78, 0, full, "c-geo");
    strip(gScene, -44, 0, full / 4, "c-moe");
    // Tiles back to front.
    const tiles = d3.range(NEXP).map((i) => ({ i, gx: i % SIDE, gy: Math.floor(i / SIDE) })).sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
    for (const t of tiles) {
      const on = chosen.has(t.i);
      const hgt = on ? 14 + 190 * (scores[t.i] / tot) * Math.min(1, k / 6) : 1.5;
      const b = iso.box(t.gx * C, t.gy * C, 0, C - 2, C - 2, hgt);
      const g = gScene.append("g").attr("class", on ? "c-moe" : "c-muted");
      if (on) {
        g.append("path").attr("d", b.left).attr("class", "ol-fill").attr("opacity", 0.6);
        g.append("path").attr("d", b.right).attr("class", "ol-fill").attr("opacity", 0.8);
        g.append("path").attr("d", b.top).attr("class", "ol-fill");
      } else {
        g.append("path").attr("d", b.top).attr("fill", "var(--ol-grid)").attr("stroke", "var(--ol-rule)").attr("stroke-width", 0.5);
      }
      g.append("path")
        .attr("d", b.top)
        .attr("class", "ol-hit")
        .on("pointermove", (ev) =>
          tip.show(ev, `<b>Expert ${t.i + 1} of 256</b><br>router score σ = ${scores[t.i].toFixed(3)}<br>${on ? `selected, weight ${(scores[t.i] / tot).toFixed(3)} after renormalisation` : "not selected for this token"}`)
        )
        .on("pointerleave", tip.hide);
    }
    // Shared expert and the way out, on the right.
    const sb = iso.box(full + 22, 0, 0, 26, full / 2, 34);
    const gs = gScene.append("g").attr("class", "c-violet");
    gs.append("path").attr("d", sb.left).attr("class", "ol-fill").attr("opacity", 0.6);
    gs.append("path").attr("d", sb.right).attr("class", "ol-fill").attr("opacity", 0.8);
    gs.append("path").attr("d", sb.top).attr("class", "ol-fill");
    strip(gScene, full + 70, 0, full / 4, "c-moe");
    strip(gScene, full + 104, 0, full, "c-geo");

    label(gScene, [-78, full, 2], -24, 30, ["residual x", "1,536 numbers"], "end");
    label(gScene, [-44, 0, 2], -40, -50, ["latent projection", "1,536 → 384,", "shared by all experts"], "end");
    label(gScene, [0, full, 0], -40, 62, ["256 routed experts", "each 384 → 768 → 384,", "squared ReLU"], "end");
    label(gScene, [full + 48, 0, 34], 26, -56, ["shared expert", "reads the full 1,536,", "on for every token"], "start");
    label(gScene, [full + 80, full / 4, 2], 40, 26, ["sum, up-projection", "384 → 1,536"], "start");
    label(gScene, [full + 114, full, 2], 24, 32, ["written to the stream", "by a geodesic update"], "start");
    const topOn = order[0];
    const [tx, ty] = iso((topOn % SIDE) * C + 5, Math.floor(topOn / SIDE) * C + 5, 14 + 190 * (scores[topOn] / tot) * Math.min(1, k / 6));
    gScene.append("text").attr("class", "ol-halo").attr("x", tx).attr("y", ty - 9).attr("text-anchor", "middle").text(`${scores[topOn] === undefined ? "" : (scores[topOn] / tot).toFixed(2)}`);
    const [hx, hy] = iso(full * 0.5, 0, 0);
    gScene.append("text").attr("class", "ol-t2").attr("x", hx + 4).attr("y", hy - 58).attr("text-anchor", "middle").text(`top-${k} by sigmoid score, height = weight`);

    // Parameter bar.
    const by = H - 54;
    const bx0 = 40;
    const bw = W - 80;
    const parts = [
      { label: "projections", v: 2 * P.proj, cls: "c-moe", op: 0.45 },
      { label: `${k} routed experts`, v: k * P.expert, cls: "c-moe", op: 1 },
      { label: "shared expert", v: P.shared, cls: "c-violet", op: 1 },
    ];
    const total = d3.sum(parts, (p) => p.v);
    const sc = d3.scaleLinear([0, 2 * P.proj + 16 * P.expert + P.shared], [0, bw]);
    let acc = 0;
    gScene.append("text").attr("class", "ol-th").attr("x", bx0).attr("y", by - 30).text("Weights read for this token");
    for (const p of parts) {
      const w = sc(p.v);
      gScene.append("rect").attr("class", `ol-fill ${p.cls}`).attr("opacity", p.op).attr("x", bx0 + acc + 1).attr("y", by).attr("width", Math.max(1, w - 2)).attr("height", 16).attr("rx", 3);
      gScene.append("text").attr("class", "ol-t2").attr("x", bx0 + acc + 2).attr("y", by + 33).text(w > 70 ? p.label : "");
      acc += w;
    }
    const dx = bx0 + sc(P.dense);
    gScene.append("line").attr("stroke", "var(--ol-ink)").attr("stroke-width", 1.5).attr("x1", dx).attr("x2", dx).attr("y1", by - 8).attr("y2", by + 22);
    gScene.append("text").attr("class", "ol-t2").attr("x", dx + 6).attr("y", by - 10).text("dense FFN, hidden 3,072");

    const layerTotal = 2 * P.proj + NEXP * P.expert + P.shared;
    out({ act: fmt.int(total), dense: fmt.int(P.dense), tot: fmt.int(layerTotal), frac: fmt.pct1(total / layerTotal) });
    say(
      `<p>The router scores all 256 experts with a sigmoid, keeps the top ${k}, and renormalises the kept scores. Each expert works in a 384-dimensional latent copy of the stream rather than on the 1,536-dimensional stream itself, which keeps its aspect ratio \\(768 / 384 = 2\\) in the range that works for dense MLPs.</p>${
        k === 6
          ? `<p>At top-6 the budget is exact. Projections \\(2 \\cdot 589{,}824\\), routed experts \\(6 \\cdot 589{,}824\\) and the shared expert \\(4{,}718{,}592\\) add up to \\(9{,}437{,}184\\), which is \\(2 \\cdot 1536 \\cdot 3072\\): a dense two-matrix FFN of hidden size 3,072.</p>`
          : `<p>Set top-k to 6 to see the active budget land exactly on a dense FFN of hidden size 3,072.</p>`
      }<p class="ol-src">Router scores are random here; counts are weights only. The shared expert's 1,536-wide input is inferred from that exact equality.</p>`
    );
  }

  function drawAbl() {
    gAbl.selectAll("*").remove();
    const m = { t: 60, b: 60 };
    const y = d3.scaleLinear([2.83, 2.92], [H - m.b, m.t]);
    const panelAt = (x0, x1, title, xs, xlab) => {
      const x = d3.scalePoint(xs, [x0 + 30, x1 - 30]);
      const gy = gAbl.append("g").attr("class", "ol-axis ol-axis--y").attr("transform", `translate(${x0},0)`);
      gy.call(d3.axisLeft(y).tickValues([2.84, 2.86, 2.88, 2.9, 2.92]).tickSize(-(x1 - x0)).tickPadding(8).tickFormat(d3.format(".2f")));
      gy.select(".domain").remove();
      gAbl.append("text").attr("class", "ol-th").attr("x", x0).attr("y", m.t - 30).text(title);
      for (const v of xs) gAbl.append("text").attr("class", "ol-t2").attr("x", x(v)).attr("y", H - m.b + 22).attr("text-anchor", "middle").text(v);
      gAbl.append("text").attr("class", "ol-t2").attr("x", x1).attr("y", H - 12).attr("text-anchor", "end").text(xlab);
      return x;
    };
    const xa = panelAt(70, 380, "Validation loss by granularity", [2, 4, 8], "granularity G");
    const xb = panelAt(450, 730, "Latent-MoE, G = 8, fewer active experts", [50, 24, 13, 6], "active experts");
    const series = (x, pts, key, cls, name, labelBelow) => {
      const g = gAbl.append("g").attr("class", cls);
      g.append("path").attr("class", "ol-line").attr("d", d3.line().x((d) => x(d[key])).y((d) => y(d.v))(pts));
      g.selectAll("circle").data(pts).join("circle").attr("class", "ol-dot").attr("r", 5).attr("cx", (d) => x(d[key])).attr("cy", (d) => y(d.v));
      g.selectAll("text.v").data(pts).join("text").attr("class", "v ol-halo").attr("text-anchor", "middle").attr("x", (d) => x(d[key])).attr("y", (d) => y(d.v) + (labelBelow ? 22 : -12)).text((d) => d.v.toFixed(3));
      if (name) g.append("text").attr("class", "ol-th ol-halo").attr("x", x(pts[0][key]) - 8).attr("y", y(pts[0].v) + (labelBelow ? 44 : -34)).text(name);
    };
    series(xa, T16.moe, "g", "c-violet", "standard MoE", false);
    series(xa, T16.lmoe, "g", "c-moe", "Latent-MoE", true);
    series(xb, T17, "k", "c-moe", "", false);
    say(
      `<p>At 124M active and about 730M total parameters, Latent-MoE is ahead of standard MoE at every granularity, by about 0.04 nats. Loss keeps improving with finer experts; the final model stops at \\(G = 4\\) because its experts are already small.</p><p>On the right, halving the number of active experts costs 0.006; going down to an eighth costs 0.030. The dense backbone alone sits at 3.017, off the top of the scale.</p><p class="ol-src">Report, Tables 16 and 17. The noise floor on validation loss is 0.003.</p>`
    );
  }

  function draw() {
    const route = view.value === "route";
    gScene.attr("display", route ? null : "none");
    gAbl.attr("display", route ? "none" : null);
    ctl.style.display = route ? "" : "none";
    g2.querySelector("dl").style.display = route ? "" : "none";
    s.attr("aria-label", route ? "Floor plan of 256 latent experts with the selected ones raised above it" : "Validation loss against granularity for standard and latent MoE, and against the number of active experts");
    route ? drawRoute() : drawAbl();
  }
  draw();
}
