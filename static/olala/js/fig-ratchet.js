// Anatomy of the three degenerate Mamba-3 layers (report §12 and Appendix C).
// 2D: each ingredient of the mechanism is one function with a kink in it.
// Four panels, in the order the report assembles them.

import { d3, scaffold, svg, slider, segmented, checkbox, readout, note, group, axes, logScale, rng, bf16, fmt } from "./core.js";

const A_FLOOR = 1e-4;
const RHO_MAX = 0.8;
const sup = (n) => String(n).replace(/-/g, "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
const pow10 = (d) => `10${sup(Math.round(Math.log10(d)))}`;

export default function mount(root) {
  const { canvas, panel } = scaffold(root);
  const W = 720;
  const H = 430;
  const m = { l: 62, r: 28, t: 52, b: 48 };
  const s = svg(canvas, W, H, "Four ingredients of the runaway: decay clamp, forced growth, saturated step angle, bf16 rounding");
  const scenes = { corner: s.append("g"), growth: s.append("g"), flat: s.append("g"), erase: s.append("g") };

  const g1 = group(panel);
  const step = segmented(g1, {
    label: "Ingredient",
    options: [
      { value: "corner", label: "Decay corner" },
      { value: "growth", label: "Forced growth" },
      { value: "flat", label: "Flat direction" },
      { value: "erase", label: "Erased siblings" },
    ],
    value: "corner",
    onChange: draw,
  });
  const ctl = group(g1);
  const g2 = group(panel);
  const dlBox = group(g2);
  const say = note(g2);
  let controls = {};
  let out = () => {};

  function setup(kind) {
    ctl.innerHTML = "";
    dlBox.innerHTML = "";
    controls = {};
    if (kind === "corner") {
      controls.a = slider(ctl, { label: "learned decay rate −A of one head", value: 0.02, scale: logScale(1e-6, 10), format: (v) => v.toExponential(1), onInput: render });
      out = readout(dlBox, [
        { key: "alpha", label: "state kept per step, α = e<sup>AΔt</sup>" },
        { key: "tau", label: "memory time constant" },
        { key: "grad", label: "gradient reaching A" },
      ]);
    } else if (kind === "growth") {
      controls.c = slider(ctl, { label: "coherence of what the head accumulates", min: 0, max: 1, step: 0.01, value: 0.3, onInput: render });
      controls.norm = checkbox(ctl, { label: "output norm in place", value: false, onChange: render });
      out = readout(dlBox, [
        { key: "clamp", label: "readout at T = 65,536, α at the clamp" },
        { key: "d99", label: "same, α = 0.99" },
        { key: "slope", label: "local growth exponent at the clamp" },
      ]);
    } else if (kind === "flat") {
      controls.rho = slider(ctl, { label: "tangent size ‖v‖/‖x‖", value: 0.3, scale: logScale(1e-2, 1e16), format: (v) => (v < 1000 ? d3.format(".3~g")(v) : v.toExponential(0)), onInput: render });
      out = readout(dlBox, [
        { key: "theta", label: "step angle, as a share of its ceiling" },
        { key: "fwd", label: "effect of growing further on the output" },
        { key: "back", label: "gradient reaching the head, relative" },
      ]);
    } else {
      controls.mag = slider(ctl, { label: "magnitude of the runaway head", min: 0, max: 16, step: 1, value: 2, format: (v) => `10${sup(v)}`, onInput: render });
      out = readout(dlBox, [
        { key: "ulp", label: "spacing of bf16 numbers at that magnitude" },
        { key: "alive", label: "sibling heads that still change the sum" },
        { key: "same", label: "sum with all 47 siblings removed" },
      ]);
    }
  }

  /* ----- (i) decay corner ----- */
  function corner() {
    const g = scenes.corner;
    g.selectAll("*").remove();
    const x = d3.scaleLog([1e-6, 10], [m.l, W - m.r]);
    const y = d3.scaleLog([0.1, 1e5], [H - m.b, m.t]);
    axes(g, { x, y, W, H, m, xTicks: [1e-6, 1e-4, 1e-2, 1], xFormat: pow10, yTicks: [1, 100, 1e4], yFormat: (d) => fmt.int(d), xLabel: "learned decay rate −A (larger forgets faster)", yLabel: "memory time constant, in tokens" });
    g.append("rect").attr("x", m.l).attr("y", m.t).attr("width", x(A_FLOOR) - m.l).attr("height", H - m.b - m.t).attr("fill", "var(--ol-mamba)").attr("opacity", 0.1);
    g.append("text").attr("class", "ol-halo").attr("x", m.l + 10).attr("y", m.t + 22).text("past the clamp:");
    g.append("text").attr("class", "ol-halo").attr("x", m.l + 10).attr("y", m.t + 40).text("gradient is exactly zero");
    const tau = (a) => 1 / Math.max(a, A_FLOOR);
    const xs = d3.range(-6, 1.001, 0.02).map((e) => 10 ** e);
    g.append("path").attr("class", "ol-line c-mamba").attr("stroke-width", 2.6).attr("d", d3.line().x((a) => x(a)).y((a) => y(tau(a)))(xs));
    g.append("line").attr("class", "ol-ref").attr("x1", x(A_FLOOR)).attr("x2", x(A_FLOOR)).attr("y1", m.t).attr("y2", H - m.b);
    g.append("text").attr("class", "ol-t2 ol-halo").attr("x", x(A_FLOOR) + 8).attr("y", H - m.b - 10).text("clamp, −A = 10⁻⁴");
    const a = controls.a.value;
    g.append("circle").attr("class", "ol-dot c-mamba").attr("r", 7).attr("cx", x(a)).attr("cy", y(tau(a)));
    g.append("text").attr("class", "ol-halo").attr("font-weight", 600).attr("x", x(a) + (a > 0.5 ? -12 : 12)).attr("y", y(tau(a)) - 12).attr("text-anchor", a > 0.5 ? "end" : "start").text("this head");
    const clamped = a <= A_FLOOR;
    out({ alpha: Math.exp(-Math.max(a, A_FLOOR)).toFixed(5), tau: `${fmt.int(Math.round(tau(a)))} tokens`, grad: clamped ? "0, exactly" : "non-zero" });
    say(
      `<p>Each head keeps a fraction \\(\\alpha_t = e^{A\\,\\Delta t_t}\\) of its state per step. The kernel clamps the learned rate so that \\(-A \\ge 10^{-4}\\). A head that benefits from longer memory is pushed left along the curve. ${
        clamped ? "Here it has crossed the clamp: the forward pass uses the clamped value whatever \\(A\\) is, so nothing pulls it back." : "Slide it past the clamp to see what changes."
      }</p><p>The boundary is a corner with a finite gradient inward and none outward. At the clamp the time constant is \\(10^4\\) tokens, a near-perfect integrator inside any training context.</p><p class="ol-src">Report, Appendix C.3 (i), drawn for a step size of one. All three runaway heads sit exactly on the clamp.</p>`
    );
  }

  /* ----- (ii) forced growth ----- */
  function growth() {
    const g = scenes.growth;
    g.selectAll("*").remove();
    const c = controls.c.value;
    const withNorm = controls.norm.value;
    // E‖Σ α^(T−t) w_t‖² with w_t = c·u + √(1−c²)·ξ_t, ξ_t independent unit-variance directions.
    const norm = (T, al) => {
      const g1 = al === 1 ? T : (1 - al ** T) / (1 - al);
      const g2 = al === 1 ? T : (1 - al ** (2 * T)) / (1 - al * al);
      return Math.sqrt(c * c * g1 * g1 + (1 - c * c) * g2);
    };
    const x = d3.scaleLog([1, 65536], [m.l, W - m.r]).base(2);
    const y = d3.scaleLog([0.5, 1e5], [H - m.b, m.t]);
    axes(g, { x, y, W, H, m, xTicks: [1, 16, 256, 4096, 65536], xFormat: (d) => fmt.int(d), yTicks: [1, 100, 1e4], yFormat: (d) => fmt.int(d), xLabel: "position in the sequence, T", yLabel: withNorm ? "size of the readout after the output norm" : "size of the readout, relative to one write" });
    const Ts = d3.range(0, 16.01, 0.1).map((e) => 2 ** e);
    const series = [
      { al: 1 - A_FLOOR, label: "α at the clamp, 1 − 10⁻⁴", cls: "c-mamba", w: 2.8 },
      { al: 0.99, label: "α = 0.99", cls: "c-violet", w: 2 },
      { al: 0.9, label: "α = 0.9", cls: "c-muted", w: 2 },
    ];
    series.forEach((sr, i) => {
      const f = (T) => (withNorm ? 1 : norm(T, sr.al));
      g.append("path").attr("class", `ol-line ${sr.cls}`).attr("stroke-width", sr.w).attr("d", d3.line().x((T) => x(T)).y((T) => y(f(T)))(Ts));
      if (!withNorm || i === 0)
        g.append("text").attr("class", "ol-halo").attr("font-weight", i ? 400 : 600).attr("text-anchor", "end").attr("x", x(65536) - 4).attr("y", y(f(65536)) - 9).text(withNorm ? "every decay rate: bounded by the norm" : sr.label);
    });
    if (!withNorm) {
      const guide = (e, txt, y0) => {
        g.append("path").attr("class", "ol-ref").attr("d", d3.line().x((T) => x(T)).y((T) => y(y0 * T ** e))([4, 300]));
        g.append("text").attr("class", "ol-t2 ol-halo").attr("x", x(300) + 6).attr("y", y(y0 * 300 ** e) + 4).text(txt);
      };
      guide(1, "slope 1", 3);
      guide(0.5, "slope ½", 0.42);
    }
    const al = 1 - A_FLOOR;
    const slope = Math.log(norm(4096, al) / norm(1024, al)) / Math.log(4);
    out({ clamp: withNorm ? "1" : fmt.int(Math.round(norm(65536, al))), d99: withNorm ? "1" : norm(65536, 0.99).toFixed(1), slope: withNorm ? "0" : slope.toFixed(2) });
    say(
      `<p>With \\(\\alpha \\approx 1\\) the recursion telescopes: the readout is \\(\\sum_{t \\le T} \\sum_r (q^\\top k_r(t))\\, v_r(t)\\), linear attention over the whole prefix with no normalising denominator. Its norm must grow with \\(T\\), like \\(\\sqrt{T}\\) for incoherent terms and like \\(T\\) once they share a direction.</p><p>${
        withNorm
          ? "An RMS norm on the mixer output bounds the readout whatever the head does. This is the brake that was removed for tensor parallelism."
          : "Decay is the only thing that bounds it: with \\(\\alpha = 0.9\\) the sum saturates after about ten tokens."
      }</p><p class="ol-src">Closed form for independent terms with a shared component. Measured on the model: \\(t^{1.9}\\) at layer 1, \\(t^{1.0}\\) at layer 7, \\(t^{0.36}\\) at layer 23. The report notes that 1.9 exceeds what this simple account allows.</p>`
    );
  }

  /* ----- (iv) flat direction ----- */
  function flat() {
    const g = scenes.flat;
    g.selectAll("*").remove();
    const x = d3.scaleLog([1e-2, 1e16], [m.l, W - m.r]);
    const yA = d3.scaleLinear([0, 1.15], [210, m.t]);
    const yB = d3.scaleLog([1e-17, 10], [H - m.b, 262]);
    const rhos = d3.range(-2, 16.01, 0.05).map((e) => 10 ** e);
    // Top: forward step angle. Bottom: backward gradient through the direction normalisation.
    g.append("g").attr("class", "ol-axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues([1e-2, 1, 1e4, 1e8, 1e12, 1e16]).tickFormat(pow10).tickSizeOuter(0));
    const ga = g.append("g").attr("class", "ol-axis ol-axis--y").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(yA).tickValues([0, 0.5, 1]).tickSize(-(W - m.l - m.r)).tickFormat(d3.format(".1f")));
    ga.select(".domain").remove();
    const gb = g.append("g").attr("class", "ol-axis ol-axis--y").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(yB).tickValues([1e-16, 1e-8, 1]).tickSize(-(W - m.l - m.r)).tickFormat(pow10));
    gb.select(".domain").remove();
    g.append("text").attr("class", "ol-t2").attr("x", m.l).attr("y", m.t - 14).text("forward: step angle θ, as a share of its ceiling");
    g.append("text").attr("class", "ol-t2").attr("x", m.l).attr("y", 250).text("backward: gradient reaching the head, relative, log scale");
    g.append("text").attr("class", "ol-t2").attr("x", W - m.r).attr("y", H - 8).attr("text-anchor", "end").text("tangent size of the branch output, ‖v‖/‖x‖");
    const x0 = x(1e11);
    g.append("rect").attr("x", x0).attr("y", m.t).attr("width", x(1e16) - x0).attr("height", H - m.b - m.t).attr("fill", "var(--ol-mamba)").attr("opacity", 0.1);
    g.append("text").attr("class", "ol-halo").attr("x", x0 + 8).attr("y", m.t + 60).text("where the three");
    g.append("text").attr("class", "ol-halo").attr("x", x0 + 8).attr("y", m.t + 78).text("layers were found");
    const th = (r) => Math.min(r, RHO_MAX) / RHO_MAX;
    const bk = (r) => (r <= RHO_MAX ? 1 : RHO_MAX / r);
    g.append("path").attr("class", "ol-line c-geo").attr("stroke-width", 2.8).attr("d", d3.line().x((r) => x(r)).y((r) => yA(th(r)))(rhos));
    g.append("path").attr("class", "ol-line c-violet").attr("stroke-width", 2.4).attr("d", d3.line().x((r) => x(r)).y((r) => yB(bk(r)))(rhos));
    g.append("line").attr("class", "ol-ref").attr("x1", x(RHO_MAX)).attr("x2", x(RHO_MAX)).attr("y1", m.t).attr("y2", H - m.b);
    g.append("text").attr("class", "ol-t2 ol-halo").attr("x", x(RHO_MAX) + 8).attr("y", 200).text("saturation, about 0.8");
    const r = controls.rho.value;
    g.append("circle").attr("class", "ol-dot c-geo").attr("r", 6).attr("cx", x(r)).attr("cy", yA(th(r)));
    g.append("circle").attr("class", "ol-dot c-violet").attr("r", 6).attr("cx", x(r)).attr("cy", yB(bk(r)));
    const sat = r > RHO_MAX;
    out({ theta: fmt.pct(th(r)), fwd: sat ? "none" : "moves the stream further", back: sat ? fmt.sci(bk(r)) : "1" });
    say(
      `<p>The step angle is proportional to the tangent size of the branch output, up to a clamp. ${
        sat
          ? "Past the clamp the forward pass is exactly invariant to further growth, so the magnitude costs nothing in the loss. The gradient through the direction normalisation scales as \\(1/\\lVert g\\rVert\\), so the head also drifts out of reach of the training signal."
          : "Below the clamp the size of the output still matters, and the head is still trained through it."
      }</p><p>Growth is easy to enter, free while it lasts, and has no restoring force: a ratchet. Once one head dominates the branch direction, the output gradients of its 47 siblings vanish with it.</p><p class="ol-src">The report gives the saturation threshold (about 0.8) and the measured ratios (10¹¹ to 10¹⁶); the clamp is drawn here as a plain minimum. The layers' constant angles are 0.267, 0.079 and 0.172 rad.</p>`
    );
  }

  /* ----- (v) erased siblings ----- */
  const sib = (() => {
    const r = rng(77);
    return d3.range(47).map(() => r.normal());
  })();
  function erase() {
    const g = scenes.erase;
    g.selectAll("*").remove();
    const M = 10 ** controls.mag.value;
    const base = bf16(M);
    const ulp = 2 ** (Math.floor(Math.log2(M)) - 7);
    const alive = sib.map((v) => bf16(M + v) !== base);
    const total = bf16(M + d3.sum(sib));
    const cols = 12;
    const cw = 44;
    const x0 = (W - cols * cw) / 2;
    const y0 = 128;
    g.append("text").attr("class", "ol-th").attr("x", x0).attr("y", 56).text("One layer, 48 heads summed by the output projection");
    g.append("text").attr("class", "ol-t2").attr("x", x0).attr("y", 76).text("each square is one head's contribution to one output element, stored in bf16");
    const cell = (i, on, big, label) => {
      const cx = x0 + (i % cols) * cw;
      const cy = y0 + Math.floor(i / cols) * 62;
      g.append("rect").attr("x", cx + 2).attr("y", cy).attr("width", cw - 6).attr("height", 34).attr("rx", 4).attr("class", big ? "ol-fill c-mamba" : on ? "ol-soft c-mamba" : "").attr("fill", big || on ? null : "var(--ol-grid)").attr("stroke", big || on ? null : "var(--ol-rule)");
      g.append("text").attr("class", "ol-t2").attr("x", cx + cw / 2 - 1).attr("y", cy + 50).attr("text-anchor", "middle").attr("fill", null).text(label);
    };
    cell(0, true, true, pow10ish(M));
    sib.forEach((v, i) => cell(i + 1, alive[i], false, v.toFixed(1)));
    const n = d3.sum(alive, (d) => (d ? 1 : 0));
    g.append("text").attr("class", "ol-halo").attr("x", x0).attr("y", y0 + 4 * 62 + 24).text(`filled: the runaway head. outlined: siblings that still change the sum. grey: erased by rounding.`);
    out({ ulp: ulp >= 1 ? fmt.sci(ulp) : ulp.toPrecision(2), alive: `${n} of 47`, same: total === base ? "bit-identical" : "different" });
    say(
      `<p>bf16 keeps eight significant bits. Around a value \\(M\\) the representable numbers are \\(2^{\\lfloor \\log_2 M \\rfloor - 7}\\) apart, so anything smaller than half that spacing is rounded away when added.</p><p>${
        n === 0 ? "At this magnitude none of the 47 sibling heads can change the sum: the layer computes them and then erases them." : "At this magnitude some siblings still register. Raise the magnitude towards what was measured."
      } On the model, removing the other 47 heads leaves 96 to 100% of the layer output bit-identical, and keeping only the runaway head reproduces the baseline loss.</p><p class="ol-src">Sibling values are random draws of order one; the rounding is exact bf16 arithmetic. Measured runaway outputs reach 1.8 × 10¹⁶.</p>`
    );
  }
  function pow10ish(M) {
    const e = Math.log10(M);
    return e < 3 ? d3.format(".3~g")(M) : `10${sup(e.toFixed(0))}`;
  }

  const fns = { corner, growth, flat, erase };
  function render() {
    fns[step.value]();
  }
  function draw() {
    for (const [k, g] of Object.entries(scenes)) g.attr("display", k === step.value ? null : "none");
    setup(step.value);
    render();
  }
  draw();
}
