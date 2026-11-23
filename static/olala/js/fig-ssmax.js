// Attention fading and Scalable Softmax (report §3.3.1).
// 2D: one curve against context length is the whole phenomenon.
//
// Model: one key leads the other n − 1 keys by a logit gap Δ.
//   softmax:  p = 1 / (1 + (n − 1) e^(−Δ))
//   SSMax:    logits are multiplied by s·log n, so
//             p = 1 / (1 + (n − 1) n^(−sΔ))

import { d3, scaffold, svg, slider, readout, note, group, axes, logScale, fmt } from "./core.js";

const WINDOWS = [
  { n: 8192, label: "pretraining 8k" },
  { n: 32768, label: "annealing 32k" },
  { n: 262144, label: "extension 256k" },
];

const plain = (n, gap) => 1 / (1 + (n - 1) * Math.exp(-gap));
const ssmax = (n, gap, s) => 1 / (1 + (n - 1) * Math.exp(-s * gap * Math.log(n)));

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 720;
  const H = 420;
  const m = { l: 54, r: 28, t: 56, b: 46 };
  const s = svg(canvas, W, H, "Attention weight on the leading key as context length grows, for softmax and Scalable Softmax");

  const x = d3.scaleLog([32, 262144], [m.l, W - m.r]).base(2);
  const y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
  axes(s, {
    x,
    y,
    W,
    H,
    m,
    xTicks: [32, 128, 512, 2048, 8192, 32768, 262144],
    xFormat: (v) => (v >= 1024 ? `${v / 1024}k` : v),
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    yFormat: d3.format(".2f"),
    xLabel: "tokens the softmax normalises over, n",
    yLabel: "weight on the leading key",
  });

  for (const w of WINDOWS) {
    s.append("line").attr("class", "ol-ref").attr("x1", x(w.n)).attr("x2", x(w.n)).attr("y1", m.t).attr("y2", H - m.b);
    s.append("text")
      .attr("class", "ol-t2")
      .attr("x", x(w.n) + (w.n > 200000 ? 0 : 0))
      .attr("y", m.t - 10)
      .attr("text-anchor", w.n > 200000 ? "end" : "middle")
      .text(w.label);
  }

  const ns = d3.range(5, 18.01, 0.05).map((e) => 2 ** e);
  const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1]));
  const pPlain = s.append("path").attr("class", "ol-line c-violet");
  const pSS = s.append("path").attr("class", "ol-line c-attn").attr("stroke-width", 2.6);
  const lPlain = s.append("text").attr("class", "ol-halo");
  const lSS = s.append("text").attr("class", "ol-halo").attr("font-weight", 600);
  const half = s.append("g");
  half.append("circle").attr("r", 5).attr("class", "ol-dot c-violet");
  half.append("text").attr("class", "ol-t2 ol-halo");

  const g1 = group(panel);
  const gapS = slider(g1, { label: "logit gap Δ of the leading key", min: 0.2, max: 12, step: 0.05, value: 6, onInput: draw });
  const sS = slider(g1, {
    label: "learned scale s",
    value: 1,
    scale: logScale(0.35, 19.75),
    marks: [
      { value: 1, label: "init 1", align: "left" },
      { value: 2.09, label: "median 2.09", align: "right" },
    ],
    onInput: draw,
  });
  const g2 = group(panel);
  const out = readout(g2, [
    { key: "p8", label: "softmax at 8k" },
    { key: "p256", label: "softmax at 256k" },
    { key: "s8", label: "SSMax at 8k" },
    { key: "s256", label: "SSMax at 256k" },
    { key: "sd", label: "exponent s·Δ" },
    { key: "eff", label: "SSMax effective gap at 8k, s·Δ·ln n" },
  ]);
  const say = note(g2);

  function draw() {
    const gap = gapS.value;
    const sc = sS.value;
    const a = ns.map((n) => [n, plain(n, gap)]);
    const b = ns.map((n) => [n, ssmax(n, gap, sc)]);
    pPlain.attr("d", line(a));
    pSS.attr("d", line(b));

    // Label each curve where it is furthest from the other one.
    // Labels sit near the left end, where the two curves are still apart;
    // if they are within a label's height of each other, push them apart.
    const i = 22;
    let ySS = y(b[i][1]) - 10;
    let yPl = y(a[i][1]) + 20;
    if (yPl - ySS < 34) { ySS = Math.min(ySS, y(b[i][1]) - 10); yPl = ySS + 34 + 12; }
    lSS.attr("x", x(ns[i])).attr("y", Math.max(m.t + 14, ySS)).text("Scalable Softmax");
    lPlain.attr("x", x(ns[i])).attr("y", Math.min(H - m.b - 8, yPl)).text("softmax");

    const nHalf = 1 + Math.exp(gap);
    const show = nHalf > 40 && nHalf < 240000;
    half.attr("display", show ? null : "none");
    if (show) {
      half.select("circle").attr("cx", x(nHalf)).attr("cy", y(0.5));
      half.select("text").attr("x", x(nHalf) + 9).attr("y", y(0.5) - 8).text(`half its mass by n = ${fmt.int(Math.round(nHalf))}`);
    }

    out({
      p8: plain(8192, gap).toFixed(3),
      p256: plain(262144, gap).toFixed(3),
      s8: ssmax(8192, gap, sc).toFixed(3),
      s256: ssmax(262144, gap, sc).toFixed(3),
      sd: (sc * gap).toFixed(2),
      eff: `${(sc * gap * Math.log(8192)).toFixed(1)} nats`,
    });
    const e = sc * gap;
    const regime =
      e > 1.02
        ? `Here \\(s\\Delta > 1\\): the SSMax weight <em>rises</em> towards one as the context grows.`
        : e < 0.98
          ? `Here \\(s\\Delta < 1\\): even SSMax fades, only polynomially, as \\(n^{s\\Delta - 1}\\).`
          : `At \\(s\\Delta = 1\\) the weight tends to exactly one half at every length.`;
    say(
      `<p>With a fixed gap, softmax gives the leading key \\(1/(1+(n-1)e^{-\\Delta})\\), which decays like \\(e^{\\Delta}/n\\). SSMax multiplies the logits by \\(s\\log n\\), which replaces \\(e^{\\Delta}\\) by \\(n^{s\\Delta}\\).</p><p>${regime}</p><p class="ol-src">Toy model, exact arithmetic. On the trained model the 336 learned scales span 0.35 to 19.75, median 2.09.</p>`
    );
  }
  draw();
}
