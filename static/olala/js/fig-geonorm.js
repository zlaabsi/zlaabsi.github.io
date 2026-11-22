// GeoNorm: writing onto the residual hypersphere (report §6, Figure 3).
// 3D: the objects are a sphere, a tangent plane and a geodesic. A flat
// drawing shows the two endpoints; only the solid shows why one move leaves
// the surface and has to be pulled back while the other never leaves it.
// The cross-section view is the exact planar picture: x, s, v and both
// endpoints all lie in the plane spanned by x and s.
//
// With ‖x‖ = 1 and φ the angle between x and s:
//   hard projection   x_hard = (x + s)/‖x + s‖,   angle atan2(‖s‖ sin φ, 1 + ‖s‖ cos φ)
//   geodesic update   v = s − (xᵀs) x,  θ = α‖v‖,  x_geo = cos θ · x + sin θ · v/‖v‖

import { d3, scaffold, svg, slider, segmented, readout, note, group, h, css, onTheme, rng, arrow, fmt } from "./core.js";

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const WRITES = 72;
const preNormAngle = (k) => Math.acos(Math.sqrt(k) / Math.sqrt(k + 1));

export default async function mount(root) {
  const { canvas, panel } = scaffold(root);
  const box = h("div", { class: "ol-three" });
  const labelLayer = h("div", {});
  const hint = h("div", { class: "ol-hint" }, "drag to rotate");
  box.append(labelLayer, hint);
  const flat = h("div", {});
  canvas.append(box, flat);
  const W2 = 640;
  const H2 = 470;
  const s2 = svg(flat, W2, H2, "Cross-section through x and s: the hard projection and the geodesic update on the same great circle");

  const g1 = group(panel);
  const view = segmented(g1, {
    label: "View",
    options: [
      { value: "one", label: "One write, 3D" },
      { value: "flat", label: "Cross-section, 2D" },
      { value: "walk", label: "72 writes, 3D" },
    ],
    value: "one",
    onChange: draw,
  });
  const ctlOne = group(g1);
  const phiS = slider(ctlOne, { label: "angle between x and s", min: 5, max: 175, step: 1, value: 85, format: (v) => `${v}°`, onInput: draw });
  const normS = slider(ctlOne, { label: "size of the update, ‖s‖/‖x‖", min: 0.05, max: 2.5, step: 0.01, value: 0.9, onInput: draw });
  const alphaS = slider(ctlOne, { label: "learned step size α", min: 0, max: 1.5, step: 0.01, value: 1, onInput: draw });
  const ctlWalk = group(g1);
  const kS = slider(ctlWalk, { label: "writes shown", min: 1, max: WRITES, step: 1, value: 16, format: (v) => String(v), onInput: draw });
  const g2 = group(panel);
  const outOne = readout(g2, [
    { key: "geo", label: "geodesic angle θ = α‖v‖/‖x‖" },
    { key: "hard", label: "hard-projection angle" },
    { key: "gap", label: "gap between the two endpoints" },
    { key: "rad", label: "radial part of s, discarded" },
  ]);
  const outWalk = readout(g2, [
    { key: "pk", label: "Pre-Norm angle at this write" },
    { key: "pl", label: "Pre-Norm, total arc so far" },
    { key: "cl", label: "constant 0.55 rad, total arc" },
  ]);
  const [dlOne, dlWalk] = g2.querySelectorAll("dl");
  const say = note(g2);

  /* ---------- three.js stage ---------- */
  let T = null;
  let gl = null;
  try {
    T = await import(THREE_URL);
    gl = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    T = null;
  }
  let scene, camera, dyn, labels3d = [];
  const cam = { az: 0.42, el: 0.3, dist: 4.9 };
  if (T) {
    gl.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    box.prepend(gl.domElement);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(32, 4 / 3, 0.1, 50);
    scene.add(new T.AmbientLight(0xffffff, 1.5));
    const sun = new T.DirectionalLight(0xffffff, 1.6);
    sun.position.set(2.5, 4, 3);
    scene.add(sun);
    dyn = new T.Group();
    scene.add(dyn);
    new ResizeObserver(render).observe(box);
    let drag = null;
    box.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el };
      box.setPointerCapture(e.pointerId);
      hint.hidden = true;
    });
    box.addEventListener("pointermove", (e) => {
      if (!drag) return;
      cam.az = drag.az - (e.clientX - drag.x) * 0.008;
      cam.el = Math.max(-1.2, Math.min(1.35, drag.el + (e.clientY - drag.y) * 0.008));
      render();
    });
    const end = () => (drag = null);
    box.addEventListener("pointerup", end);
    box.addEventListener("pointercancel", end);
  } else {
    view.el.querySelectorAll("button").forEach((b) => (b.disabled = b.dataset.value !== "flat"));
    view.set("flat");
  }

  function render() {
    if (!T) return;
    const w = box.clientWidth;
    const hgt = box.clientHeight;
    if (!w || !hgt) return;
    gl.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    camera.position.set(cam.dist * Math.cos(cam.el) * Math.sin(cam.az), cam.dist * Math.sin(cam.el), cam.dist * Math.cos(cam.el) * Math.cos(cam.az));
    camera.lookAt(0.15, 0.3, 0);
    camera.updateProjectionMatrix();
    gl.render(scene, camera);
    for (const l of labels3d) {
      const p = l.pos.clone().project(camera);
      l.el.style.left = `${((p.x + 1) / 2) * w + (l.dx || 0)}px`;
      l.el.style.top = `${((1 - p.y) / 2) * hgt + (l.dy || 0)}px`;
    }
  }

  function clear() {
    dyn.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    dyn.clear();
    labelLayer.innerHTML = "";
    labels3d = [];
  }
  const colour = (name) => new T.Color(css(root, name));
  const mat = (name, opts = {}) => new T.MeshPhongMaterial({ color: colour(name), shininess: 20, ...opts });
  function tag(pos, html, dx = 0, dy = 0) {
    const el = h("div", { class: "ol-label3d", html });
    labelLayer.append(el);
    labels3d.push({ pos, el, dx, dy });
  }
  function bar(a, b, name, r = 0.014, head = true) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-4) return;
    const hl = head ? Math.min(0.11, len * 0.5) : 0;
    const g = new T.Group();
    const cyl = new T.Mesh(new T.CylinderGeometry(r, r, len - hl, 12), mat(name));
    cyl.position.y = (len - hl) / 2;
    g.add(cyl);
    if (head) {
      const cone = new T.Mesh(new T.ConeGeometry(r * 3, hl, 16), mat(name));
      cone.position.y = len - hl / 2;
      g.add(cone);
    }
    g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
    g.position.copy(a);
    dyn.add(g);
  }
  function tube(pts, name, r = 0.012) {
    if (pts.length < 2) return;
    dyn.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), Math.max(8, pts.length * 2), r, 8), mat(name)));
  }
  function dot(p, name, r = 0.035) {
    const m = new T.Mesh(new T.SphereGeometry(r, 20, 14), mat(name));
    m.position.copy(p);
    dyn.add(m);
  }
  function dashed(a, b, name) {
    const geo = new T.BufferGeometry().setFromPoints([a, b]);
    const ln = new T.Line(geo, new T.LineDashedMaterial({ color: colour(name), dashSize: 0.05, gapSize: 0.04 }));
    ln.computeLineDistances();
    dyn.add(ln);
  }
  function globe() {
    dyn.add(new T.Mesh(new T.SphereGeometry(1, 64, 40), new T.MeshPhongMaterial({ color: colour("--ol-ink2"), transparent: true, opacity: 0.1, depthWrite: false, shininess: 5 })));
    const lineMat = new T.LineBasicMaterial({ color: colour("--ol-muted"), transparent: true, opacity: 0.45 });
    const ring = (f) => {
      const pts = d3.range(0, 97).map((i) => f((i / 96) * 2 * Math.PI));
      dyn.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), lineMat));
    };
    for (const lat of [-60, -30, 0, 30, 60]) {
      const c = Math.cos((lat * Math.PI) / 180);
      const sn = Math.sin((lat * Math.PI) / 180);
      ring((t) => new T.Vector3(c * Math.cos(t), sn, c * Math.sin(t)));
    }
    for (const lon of [0, 30, 60, 90, 120, 150]) {
      const a = (lon * Math.PI) / 180;
      ring((t) => new T.Vector3(Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)));
    }
  }

  function geometry() {
    const phi = (phiS.value * Math.PI) / 180;
    const ns = normS.value;
    const alpha = alphaS.value;
    const vt = ns * Math.sin(phi); // tangent component of s
    const vr = ns * Math.cos(phi); // radial component of s
    const theta = alpha * vt;
    const hard = Math.atan2(vt, 1 + vr);
    return { phi, ns, alpha, vt, vr, theta, hard };
  }

  function drawOne() {
    const q = geometry();
    clear();
    globe();
    const xh = new T.Vector3(-0.3, 0.88, 0.36).normalize();
    const uh = new T.Vector3(1, 0, 0).sub(xh.clone().multiplyScalar(xh.x)).normalize();
    const wh = new T.Vector3().crossVectors(xh, uh);
    const O = new T.Vector3();
    const at = (ang) => xh.clone().multiplyScalar(Math.cos(ang)).add(uh.clone().multiplyScalar(Math.sin(ang)));
    const X = xh.clone();
    const P = X.clone().add(xh.clone().multiplyScalar(q.vr)).add(uh.clone().multiplyScalar(q.vt));
    const V = X.clone().add(uh.clone().multiplyScalar(q.vt));
    const Xhard = at(q.hard);
    const Xgeo = at(q.theta);

    // Tangent plane at x.
    const half = Math.max(0.75, Math.min(2.2, q.vt + 0.25));
    const corners = [[-0.35, -half * 0.6], [half, -half * 0.6], [half, half * 0.6], [-0.35, half * 0.6]].map(([a, b]) => X.clone().add(uh.clone().multiplyScalar(a)).add(wh.clone().multiplyScalar(b)));
    const pg = new T.BufferGeometry().setFromPoints([corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]]);
    pg.computeVertexNormals();
    dyn.add(new T.Mesh(pg, new T.MeshBasicMaterial({ color: colour("--ol-violet"), transparent: true, opacity: 0.1, side: T.DoubleSide, depthWrite: false })));
    dyn.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(corners), new T.LineBasicMaterial({ color: colour("--ol-violet"), transparent: true, opacity: 0.55 })));

    bar(O, X, "--ol-ink");
    bar(X, P, "--ol-violet");
    bar(X, V, "--ol-geo", 0.011);
    dashed(P, V, "--ol-violet");
    dashed(O, P, "--ol-noise");
    dot(P, "--ol-violet", 0.028);
    tube(d3.range(0, 41).map((i) => at((q.hard * i) / 40)), "--ol-noise", 0.011);
    tube(d3.range(0, 61).map((i) => at((q.theta * i) / 60)), "--ol-geo", 0.02);
    dot(Xhard, "--ol-noise");
    dot(Xgeo, "--ol-geo", 0.045);

    tag(X.clone().multiplyScalar(0.55), "x", -14, 0);
    tag(X.clone().lerp(P, 0.55), "s", 12, -10);
    tag(P, "x + s", 26, -10);
    tag(X.clone().lerp(V, 0.6), "v", 0, 16);
    tag(Xhard, "x<sub>hard</sub>", -30, 14);
    tag(Xgeo, "x<sub>geo</sub>", 30, 12);
    tag(corners[2], "tangent plane at x", -50, -12);
    render();

    outOne({
      geo: `${q.theta.toFixed(3)} rad, ${fmt.deg(q.theta)}`,
      hard: `${q.hard.toFixed(3)} rad, ${fmt.deg(q.hard)}`,
      gap: fmt.deg(Math.abs(q.theta - q.hard)),
      rad: `${q.vr >= 0 ? "+" : "−"}${Math.abs(q.vr).toFixed(2)} ‖x‖`,
    });
    say(oneText(q));
  }

  function oneText(q) {
    const big = Math.abs(q.theta - q.hard) > 0.12;
    return `<p>Post-Norm forms \\(x + s\\), which leaves the sphere, and pulls it back along the radius (pink). GeoNorm first drops the radial part of \\(s\\), keeps the tangent part \\(v\\), and walks an arc of length \\(\\alpha\\lVert v\\rVert\\) along the great circle (gold). The norm of \\(x\\) is preserved exactly because \\(v \\perp x\\).</p><p>${
      big
        ? "The two endpoints differ visibly here. The hard projection compresses a long tangent step, since its angle is an arctangent and cannot exceed the direction of \\(s\\); the geodesic angle is linear in \\(\\lVert v\\rVert\\)."
        : "For this update the two endpoints nearly coincide. Raise the size of the update, or keep the angle near 90°, to separate them."
    }</p><p class="ol-src">Measured on real models the angle between \\(x\\) and \\(s\\) stays close to 90° at every depth, which is the case where the two writes differ most.</p>`;
  }

  function walkPaths(K) {
    // Same random tangent directions for both walks; only the step angles differ.
    const start = new T.Vector3(-0.5, 0.7, 0.5).normalize();
    const mk = (angleOf) => {
      const pts = [start.clone()];
      let p = start.clone();
      const rr = rng(42);
      let total = 0;
      for (let k = 1; k <= K; k++) {
        const g = new T.Vector3(rr.normal(), rr.normal() * 0.5 + 0.25, rr.normal());
        const t = g.sub(p.clone().multiplyScalar(g.dot(p))).normalize();
        const a = angleOf(k);
        total += a;
        const steps = Math.max(2, Math.ceil(a / 0.08));
        const p0 = p.clone();
        for (let i = 1; i <= steps; i++) {
          const b = (a * i) / steps;
          pts.push(p0.clone().multiplyScalar(Math.cos(b)).add(t.clone().multiplyScalar(Math.sin(b))));
        }
        p = pts[pts.length - 1].clone();
      }
      return { pts, total, end: p };
    };
    return { pre: mk(preNormAngle), con: mk(() => 0.55), start };
  }

  function drawWalk() {
    const K = kS.value;
    clear();
    globe();
    const { pre, con, start } = walkPaths(K);
    tube(con.pts, "--ol-geo", 0.009);
    tube(pre.pts, "--ol-violet", 0.009);
    dot(start, "--ol-ink", 0.04);
    dot(pre.end, "--ol-violet", 0.04);
    dot(con.end, "--ol-geo", 0.04);
    tag(start, "x<sub>0</sub>", -18, -12);
    tag(pre.end, "Pre-Norm schedule", 0, -18);
    tag(con.end, "constant 0.55 rad", 0, 20);
    render();
    outWalk({ pk: `${preNormAngle(K).toFixed(3)} rad`, pl: `${pre.total.toFixed(1)} rad`, cl: `${con.total.toFixed(1)} rad` });
    say(
      `<p>Pre-Norm is itself a geodesic update, with a fixed angle \\(\\arccos(\\sqrt{k}/\\sqrt{k+1})\\) at write \\(k\\): 45° for the first write, then smaller and smaller. The violet path uses that schedule and stalls: deep blocks barely move the stream, which is the curse of depth.</p><p>The gold path takes a constant 0.55 rad, the value the report measures for MLP writes across the second half of the trained model, where Pre-Norm would have decayed to 0.12.</p><p class="ol-src">Directions are random and shared by both paths; only the angles carry information. The model's 72 measured angles are in the report's Figure 7.</p>`
    );
  }

  /* ---------- exact cross-section ---------- */
  function drawFlat() {
    const q = geometry();
    s2.selectAll("*").remove();
    const ext = Math.max(1.25, 1 + Math.max(0, q.vr) + 0.25, q.vt + 0.35);
    const R = Math.min(165, (H2 - 56) / (ext + 1.08), (W2 * 0.56 - 30) / Math.max(1.1, q.vt + 0.5));
    const cx = W2 * 0.42;
    const cy = H2 - 24 - R;
    const pt = (u, x) => [cx + u * R, cy - x * R];
    s2.append("circle").attr("cx", cx).attr("cy", cy).attr("r", R).attr("fill", "none").attr("stroke", "var(--ol-muted)").attr("stroke-width", 1.2);
    s2.append("line").attr("class", "ol-ref").attr("stroke", "var(--ol-violet)").attr("x1", pt(-0.6, 1)[0]).attr("y1", pt(0, 1)[1]).attr("x2", pt(Math.max(1.2, q.vt + 0.3), 1)[0]).attr("y2", pt(0, 1)[1]);
    const X = pt(0, 1);
    const P = pt(q.vt, 1 + q.vr);
    const V = pt(q.vt, 1);
    const Xh = pt(Math.sin(q.hard), Math.cos(q.hard));
    const Xg = pt(Math.sin(q.theta), Math.cos(q.theta));
    const arc = (a, cls, w) =>
      s2
        .append("path")
        .attr("class", `ol-line ${cls}`)
        .attr("stroke-width", w)
        .attr("d", d3.line()(d3.range(0, 49).map((i) => pt(Math.sin((a * i) / 48), Math.cos((a * i) / 48)))));
    s2.append("line").attr("class", "ol-ref").attr("stroke", "var(--ol-noise)").attr("x1", cx).attr("y1", cy).attr("x2", P[0]).attr("y2", P[1]);
    s2.append("line").attr("class", "ol-ref").attr("stroke", "var(--ol-violet)").attr("x1", P[0]).attr("y1", P[1]).attr("x2", V[0]).attr("y2", V[1]);
    arc(q.hard, "c-noise", 2);
    arc(q.theta, "c-geo", 4);
    arrow(s2, cx, cy, X[0], X[1], "c-ink", { width: 2 });
    arrow(s2, X[0], X[1], P[0], P[1], "c-violet", { width: 2 });
    arrow(s2, X[0], X[1], V[0], V[1], "c-geo", { width: 2 });
    s2.append("circle").attr("class", "ol-dot c-noise").attr("r", 5).attr("cx", Xh[0]).attr("cy", Xh[1]);
    s2.append("circle").attr("class", "ol-dot c-geo").attr("r", 6).attr("cx", Xg[0]).attr("cy", Xg[1]);
    const t = (p, dx, dy, txt, anchor = "start") => s2.append("text").attr("class", "ol-halo").attr("x", p[0] + dx).attr("y", p[1] + dy).attr("text-anchor", anchor).html(txt);
    const mi = (a) => `<tspan class="ol-mi">${a}</tspan>`;
    t([cx, (cy + X[1]) / 2], -12, 4, mi("x"), "end");
    t([(X[0] + P[0]) / 2, (X[1] + P[1]) / 2], -8, -8, mi("s"), "end");
    t(P, 10, -6, `${mi("x")} + ${mi("s")}`);
    t([(X[0] + V[0]) / 2, X[1]], 0, 20, `${mi("v")}, tangent part of ${mi("s")}`, "middle");
    t(Xh, -10, 20, `${mi("x")}<tspan class="ol-msub" dy="4">hard</tspan>`, "end");
    t(Xg, 12, 16, `${mi("x")}<tspan class="ol-msub" dy="4">geo</tspan>`);
    t(pt(-0.6, 1), 0, -8, "tangent line at x");
    s2.append("circle").attr("r", 3).attr("cx", cx).attr("cy", cy).attr("fill", "var(--ol-ink)");
    outOne({
      geo: `${q.theta.toFixed(3)} rad, ${fmt.deg(q.theta)}`,
      hard: `${q.hard.toFixed(3)} rad, ${fmt.deg(q.hard)}`,
      gap: fmt.deg(Math.abs(q.theta - q.hard)),
      rad: `${q.vr >= 0 ? "+" : "−"}${Math.abs(q.vr).toFixed(2)} ‖x‖`,
    });
    say(oneText(q));
  }

  function draw() {
    const v = view.value;
    box.style.display = v === "flat" ? "none" : "";
    flat.style.display = v === "flat" ? "" : "none";
    ctlOne.style.display = v === "walk" ? "none" : "";
    ctlWalk.style.display = v === "walk" ? "" : "none";
    dlOne.style.display = v === "walk" ? "none" : "";
    dlWalk.style.display = v === "walk" ? "" : "none";
    if (v === "flat") drawFlat();
    else if (v === "one") drawOne();
    else drawWalk();
  }
  onTheme(draw);
  draw();
}
