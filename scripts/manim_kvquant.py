"""Manim animations for KV-cache quantization theory article.

8 scenes (transparent background, WebM):
  1. JLProjection       — random Gaussian matrix, distance preservation
  2. SignQuantization    — asymmetric QJL estimator + convergence
  3. PolarRecursion      — recursive polar tree with angle geometry
  4. BetaConcentration   — morphing Beta density + Gaussian overlay
  5. LloydMaxConvergence — 2-step algorithm with region shading
  6. TurboQuantPipeline  — MSE + prod pipeline flow
  7. RandomRotation      — before/after rotation on coordinates
  8. DistortionBounds    — upper vs lower bound + 2.7× gap
"""
import os
import numpy as np
from manim import *

os.environ['PATH'] += ':/Users/zlaabsi/Library/TinyTeX/bin/universal-darwin'

# Font & palette
FONT = "Source Serif 4"
ACCENT = "#D4A843"
OLIVE = "#8B9A6B"
SIENNA = "#C97A50"
TXT = "#f0f0f0"
BLUE = "#4878d0"
PINK = "#E07B9B"

config.pixel_width = 1920
config.pixel_height = 1080
config.frame_rate = 30
config.background_opacity = 0.0

# Global stroke multiplier — all strokes thicker for readability
SW = 1.5  # multiply all stroke_width values by this factor
TEX_SW = 1.2 * SW  # stronger outline for LaTeX glyphs on 1080p renders

_BaseTex = Tex
_BaseMathTex = MathTex


def _thicken_tex_glyphs(mobj, stroke_width=TEX_SW):
    """Add a same-color outline so TeX glyphs do not look hairline-thin."""
    for glyph in mobj.family_members_with_points():
        glyph.set_stroke(
            color=glyph.get_fill_color(),
            width=stroke_width,
            opacity=1.0,
            family=False,
        )
    return mobj


def Tex(*args, **kwargs):
    return _thicken_tex_glyphs(_BaseTex(*args, **kwargs))


def MathTex(*args, **kwargs):
    return _thicken_tex_glyphs(_BaseMathTex(*args, **kwargs))


def make_axes_with_labels(x_range, y_range, x_length, y_length,
                          x_ticks=None, y_ticks=None, **kwargs):
    ax = Axes(
        x_range=x_range, y_range=y_range,
        x_length=x_length, y_length=y_length,
        axis_config={"color": TXT, "include_numbers": False,
                     "include_ticks": True, "stroke_width": 3, "tick_size": 0.1},
        **kwargs,
    )
    labels = VGroup()
    if x_ticks:
        for val, txt in x_ticks:
            lbl = Text(txt, font_size=20, color=TXT, font=FONT)
            lbl.next_to(ax.c2p(val, y_range[0]), DOWN, buff=0.15)
            labels.add(lbl)
    if y_ticks:
        for val, txt in y_ticks:
            lbl = Text(txt, font_size=20, color=TXT, font=FONT)
            lbl.next_to(ax.c2p(x_range[0], val), LEFT, buff=0.15)
            labels.add(lbl)
    return ax, labels


def box(txt, color, w=1.4, h=0.55, fs=20):
    """Rounded rectangle with centered label."""
    r = RoundedRectangle(width=w, height=h, corner_radius=0.11,
                         color=color, stroke_width=3*SW)
    r.set_fill(color, opacity=0.15)
    t = Text(txt, font_size=fs, color=color, font=FONT).move_to(r)
    return VGroup(r, t)


# ─────────────────────────────────────────────────────────────────
# Scene 1
# ─────────────────────────────────────────────────────────────────
class JLProjection(Scene):
    """Random Gaussian projection with matrix visualization."""

    def construct(self):
        # ── Title ────────────────────────────────────────────────
        title = Text("Johnson-Lindenstrauss Projection", font_size=42,
                     color=TXT, font=FONT).to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=1.5)
        self.wait(1)

        # --- Step 1: show the matrix S ───────────────────────────
        step1 = Tex(r"Step 1: Draw random matrix $\mathbf{S}$",
                    color=ACCENT, font_size=28)
        step1.next_to(title, DOWN, buff=0.35)
        self.play(Write(step1), run_time=1.2)
        self.wait(0.8)

        np.random.seed(42)
        d_high, m_low = 8, 2
        S_mat = np.random.randn(m_low, d_high) / np.sqrt(m_low)

        cells = VGroup()
        for r in range(m_low):
            for c in range(d_high):
                rect = Rectangle(width=0.65, height=0.45, stroke_color=TXT,
                                 stroke_width=1.5*SW)
                val = S_mat[r, c]
                clr = ACCENT if val >= 0 else SIENNA
                t = Text(f"{val:+.1f}", font_size=14, color=clr, font=FONT)
                t.move_to(rect)
                cells.add(VGroup(rect, t))
        grid = cells.arrange_in_grid(rows=m_low, cols=d_high, buff=0.05)
        grid.scale(0.9).move_to(ORIGIN + UP * 0.3)

        s_label = MathTex(
            r"\mathbf{S} \in \mathbb{R}^{2 \times 8},"
            r"\quad S_{ij} \overset{\text{i.i.d.}}{\sim}"
            r" \mathcal{N}(0,\,1/m)",
            color=TXT,
        ).scale(0.7).next_to(grid, DOWN, buff=0.35)

        self.play(LaggedStart(*[FadeIn(c, scale=0.6) for c in cells],
                              lag_ratio=0.04), run_time=2.0)
        self.play(Write(s_label), run_time=1.5)
        self.wait(1.5)

        # --- Step 2: project points ──────────────────────────────
        step2 = Tex(r"Step 2: Compute $\mathbf{S}\mathbf{x}$ for each point",
                    color=ACCENT, font_size=28)
        step2.move_to(step1)
        self.play(FadeOut(grid), FadeOut(s_label), run_time=0.8)
        self.play(FadeTransform(step1, step2), run_time=1.0)
        self.wait(0.8)

        n_pts = 7
        pts_high = np.random.randn(n_pts, d_high) * 0.6
        pts_low = (S_mat @ pts_high.T).T

        sc_h = 1.6 / max(np.abs(pts_high[:, :2]).max(), 0.01)
        sc_l = 1.6 / max(np.abs(pts_low).max(), 0.01)

        left_ell = Ellipse(width=4, height=4, color=ACCENT,
                           stroke_width=3*SW, stroke_opacity=0.5).move_to(LEFT * 4)
        right_ell = Ellipse(width=4, height=4, color=OLIVE,
                            stroke_width=3*SW, stroke_opacity=0.5).move_to(RIGHT * 4)
        ll = MathTex(r"\mathbb{R}^8", color=ACCENT).scale(0.85)\
            .move_to(LEFT * 4 + UP * 2.6)
        rl = MathTex(r"\mathbb{R}^2", color=OLIVE).scale(0.85)\
            .move_to(RIGHT * 4 + UP * 2.6)

        left_dots = VGroup(*[
            Dot(np.array([p[0] * sc_h - 4, p[1] * sc_h, 0]),
                radius=0.16, color=ACCENT) for p in pts_high])
        right_dots = VGroup(*[
            Dot(np.array([p[0] * sc_l + 4, p[1] * sc_l, 0]),
                radius=0.16, color=OLIVE) for p in pts_low])

        arrow = Arrow(LEFT * 1.5, RIGHT * 1.5, color=TXT, stroke_width=5*SW)
        arr_lbl = MathTex(r"\mathbf{S}", color=TXT).scale(0.9)\
            .next_to(arrow, UP, buff=0.15)

        self.play(FadeIn(left_ell), FadeIn(right_ell),
                  Write(ll), Write(rl), run_time=1.5)
        self.wait(0.5)
        self.play(LaggedStart(*[FadeIn(d, scale=0.5) for d in left_dots],
                              lag_ratio=0.1), run_time=1.5)
        self.wait(0.5)
        self.play(GrowArrow(arrow), Write(arr_lbl), run_time=1.2)
        self.wait(0.5)
        self.play(*[TransformFromCopy(left_dots[i], right_dots[i])
                    for i in range(n_pts)], run_time=2.5)
        self.wait(1.5)

        # --- Step 3: distance preservation ───────────────────────
        step3 = Tex(r"Step 3: Distances approximately preserved",
                    color=ACCENT, font_size=28)
        step3.move_to(step2)
        self.play(FadeTransform(step2, step3), run_time=1.0)
        self.wait(1)

        pairs = [(0, 1), (2, 3), (4, 5)]
        for i, j in pairs:
            ll_line = DashedLine(left_dots[i].get_center(),
                                 left_dots[j].get_center(),
                                 color=SIENNA, stroke_width=3.5*SW, dash_length=0.12)
            lr_line = DashedLine(right_dots[i].get_center(),
                                 right_dots[j].get_center(),
                                 color=SIENNA, stroke_width=3.5*SW, dash_length=0.12)
            d_orig = np.linalg.norm(pts_high[i] - pts_high[j])
            d_proj = np.linalg.norm(pts_low[i] - pts_low[j])
            ratio = d_proj / d_orig if d_orig > 0 else 1.0
            mid = (right_dots[i].get_center() + right_dots[j].get_center()) / 2
            rt = MathTex(f"{ratio:.2f}" + r"\times", color=SIENNA).scale(0.65)
            rt.next_to(mid, RIGHT, buff=0.12)
            self.play(Create(ll_line), Create(lr_line), Write(rt), run_time=1.5)
            self.wait(0.8)

        # epsilon formula — proper LaTeX
        eps_line1 = MathTex(
            r"m = O\!\left(\varepsilon^{-2} \log n\right)",
            color=TXT,
        ).scale(0.8)
        eps_line2 = MathTex(
            r"\Rightarrow \;"
            r"\frac{\|\mathbf{S}\mathbf{x}_i - \mathbf{S}\mathbf{x}_j\|}"
            r"{\|\mathbf{x}_i - \mathbf{x}_j\|}"
            r"\in [1{-}\varepsilon,\,1{+}\varepsilon]",
            color=TXT,
        ).scale(0.6)
        eps_group = VGroup(eps_line1, eps_line2).arrange(DOWN, buff=0.15)
        eps_group.to_edge(DOWN, buff=0.55)
        self.play(Write(eps_line1), run_time=1.5)
        self.wait(1)
        self.play(Write(eps_line2), run_time=2.0)
        self.wait(2.5)


# ─────────────────────────────────────────────────────────────────
# Scene 2
# ─────────────────────────────────────────────────────────────────
class SignQuantization(Scene):
    """QJL: asymmetric sign quantization with convergence."""

    def construct(self):
        title = Text("QJL: 1-Bit Sign Quantization", font_size=42,
                     color=TXT, font=FONT).to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=1.2)
        self.wait(1)

        # ── Part A: Number-line sign snap ────────────────────────
        part_a = Text("Part A", font_size=20, color="#bbbbbb",
                      font=FONT).next_to(title, DOWN, buff=0.15)
        self.play(FadeIn(part_a, shift=DOWN * 0.1), run_time=0.6)

        line = Line(LEFT * 5, RIGHT * 5, color=TXT, stroke_width=4*SW)\
            .shift(UP * 0.5)
        ticks = VGroup()
        tick_labels = VGroup()
        for v in range(-3, 4):
            tk = Line(UP * 0.12, DOWN * 0.12, color=TXT, stroke_width=3*SW)
            tk.move_to(line.point_from_proportion((v + 3) / 6))
            ticks.add(tk)
            tl = Text(str(v), font_size=22, color=TXT, font=FONT)
            tl.next_to(tk, DOWN, buff=0.15)
            tick_labels.add(tl)

        self.play(Create(line), Create(ticks),
                  *[Write(l) for l in tick_labels], run_time=1.5)
        self.wait(0.5)

        def v2p(v):
            return line.point_from_proportion((v + 3) / 6)

        np.random.seed(7)
        samples = np.random.randn(12)
        dots = VGroup(*[Dot(v2p(s), radius=0.18, color=ACCENT)
                        for s in samples if abs(s) <= 3])
        self.play(*[FadeIn(d, scale=0.5) for d in dots], run_time=1.2)

        lbl_sk = MathTex(
            r"\mathbf{S}\mathbf{k}",
            r"\;\text{(Gaussian projection of key)}",
            color=ACCENT,
        ).scale(0.65).next_to(line, UP, buff=0.5)
        self.play(Write(lbl_sk), run_time=1.2)
        self.wait(1)

        zero_line = DashedLine(v2p(0) + UP * 0.3, v2p(0) + DOWN * 0.3,
                               color=SIENNA, stroke_width=4*SW)
        zero_lbl = MathTex(r"0", color=SIENNA).scale(0.6)
        zero_lbl.next_to(zero_line, DOWN, buff=0.35)
        self.play(Create(zero_line), FadeIn(zero_lbl), run_time=0.8)
        self.wait(0.8)

        new_pos = []
        for d in dots:
            val = (d.get_center()[0] - line.get_start()[0]) / \
                  (line.get_end()[0] - line.get_start()[0]) * 6 - 3
            new_pos.append(v2p(1 if val >= 0 else -1))

        self.play(*[dots[i].animate.move_to(new_pos[i])
                    for i in range(len(dots))], run_time=2.0)
        self.wait(0.5)

        lbl_sign = MathTex(
            r"\text{sign}(\mathbf{S}\mathbf{k}) \in \{-1,+1\}^m",
            color=SIENNA,
        ).scale(0.7).next_to(line, DOWN, buff=0.9)
        self.play(Write(lbl_sign), run_time=1.2)
        self.wait(1.5)

        # ── Part B: Asymmetric pipeline ──────────────────────────
        self.play(*[FadeOut(m) for m in [line, ticks, tick_labels,
                   dots, zero_line, zero_lbl, lbl_sk, lbl_sign, part_a]],
                  run_time=0.8)
        self.wait(0.5)

        asym_title = Tex(
            r"The Asymmetric Design (key insight of QJL)",
            color=TXT, font_size=28,
        )
        asym_title.shift(UP * 2.5)
        self.play(Write(asym_title), run_time=1.2)
        self.wait(0.8)

        # Key path (top)
        k_in = box("k", ACCENT, 0.8, 0.5)
        k_proj = box("Sk", ACCENT, 1.0, 0.5)
        k_sign = box("sign(Sk)", SIENNA, 1.6, 0.5)
        k_store = box("{-1,+1}^m", SIENNA, 1.6, 0.5, fs=18)

        k_row = VGroup(k_in, k_proj, k_sign, k_store).arrange(RIGHT, buff=0.8)
        k_row.shift(UP * 1.0)

        k_arrows = VGroup()
        for a, b in [(k_in, k_proj), (k_proj, k_sign), (k_sign, k_store)]:
            k_arrows.add(Arrow(a.get_right(), b.get_left(),
                               color=SIENNA, stroke_width=3*SW, buff=0.08))

        k_label = Text("Key path (quantized to 1 bit)", font_size=20,
                       color=SIENNA, font=FONT).next_to(k_row, UP, buff=0.2)

        # Query path (bottom)
        q_in = box("q", OLIVE, 0.8, 0.5)
        q_proj = box("Sq", OLIVE, 1.0, 0.5)
        q_full = box("full precision", OLIVE, 1.8, 0.5, fs=18)

        q_row = VGroup(q_in, q_proj, q_full).arrange(RIGHT, buff=0.8)
        q_row.shift(DOWN * 0.6)
        # align q_in with k_in
        q_row.shift(k_in.get_center()[0] - q_in.get_center()[0])

        q_arrows = VGroup()
        for a, b in [(q_in, q_proj), (q_proj, q_full)]:
            q_arrows.add(Arrow(a.get_right(), b.get_left(),
                               color=OLIVE, stroke_width=3*SW, buff=0.08))

        q_label = Text("Query path (no quantization)", font_size=20,
                       color=OLIVE, font=FONT).next_to(q_row, DOWN, buff=0.2)

        # Show key path first, then query path
        self.play(Write(k_label), run_time=0.8)
        self.play(LaggedStart(*[FadeIn(m) for m in [k_in, k_proj, k_sign, k_store]],
                              lag_ratio=0.3), run_time=1.8)
        self.play(*[GrowArrow(a) for a in k_arrows], run_time=1.2)
        self.wait(1)

        self.play(Write(q_label), run_time=0.8)
        self.play(LaggedStart(*[FadeIn(m) for m in [q_in, q_proj, q_full]],
                              lag_ratio=0.3), run_time=1.5)
        self.play(*[GrowArrow(a) for a in q_arrows], run_time=1.0)
        self.wait(0.8)

        asym_note = MathTex(
            r"\text{Asymmetry: only } \mathbf{k} \text{ is quantized;}"
            r"\; \mathbf{q} \text{ stays full precision}",
            color=ACCENT,
        ).scale(0.65).to_edge(DOWN, buff=0.5)
        self.play(Write(asym_note), run_time=1.5)
        self.wait(2)

        # ── Part C: Convergence with correction factor ───────────
        self.play(*[FadeOut(m) for m in self.mobjects if m is not title],
                  run_time=0.8)
        self.wait(0.5)

        conv_title = Tex(
            r"Estimator converges to $\langle \mathbf{q},\, \hat{\mathbf{k}} \rangle$",
            color=TXT, font_size=28,
        )
        conv_title.shift(UP * 2.8)
        self.play(Write(conv_title), run_time=1.2)
        self.wait(1)

        # Correct simulation
        d_dim = 50
        np.random.seed(42)
        k = np.random.randn(d_dim)
        k_hat = k / np.linalg.norm(k)
        q_parallel = 0.6 * k_hat
        noise = np.random.randn(d_dim)
        noise -= np.dot(noise, k_hat) * k_hat
        noise *= 0.3
        q = q_parallel + noise
        true_val = np.dot(q, k_hat)  # normalized IP = alpha ~ 0.6
        biased_target = true_val * np.sqrt(2 / np.pi)  # ~ 0.48

        # Biased (no correction) and corrected estimates
        # E[sq * sign(sk)] = <q, k_hat> * sqrt(2/pi), so:
        #   biased  = running / i          -> converges to <q,k_hat>*sqrt(2/pi)
        #   correct = running / i * sqrt(pi/2) -> converges to <q,k_hat>
        est_biased, est_correct = [], []
        running = 0.0
        for i in range(1, 51):
            s = np.random.randn(d_dim)
            sq, sk = np.dot(s, q), np.dot(s, k)
            running += sq * np.sign(sk)
            est_biased.append(running / i)
            est_correct.append(running / i * np.sqrt(np.pi / 2))

        y_lo = min(min(est_biased), min(est_correct), true_val) - 0.2
        y_hi = max(max(est_biased), max(est_correct), true_val) + 0.2
        y_lo, y_hi = max(y_lo, -1.0), min(y_hi, 1.5)

        ax, ax_labels = make_axes_with_labels(
            [1, 50, 10], [y_lo, y_hi, 0.5], 8, 4,
            x_ticks=[(10, "10"), (20, "20"), (30, "30"), (40, "40"), (50, "50")],
            y_ticks=[(v, f"{v:.1f}") for v in
                     np.arange(np.ceil(y_lo * 2) / 2, y_hi, 0.5)],
        )
        ax.shift(DOWN * 0.2)
        ax_labels.shift(DOWN * 0.2)

        x_lbl = MathTex(r"m \;\text{(sketch dimension)}", color=TXT)\
            .scale(0.55).next_to(ax, DOWN, buff=0.35)
        y_lbl = MathTex(r"\widehat{\langle \mathbf{q},\,\mathbf{k}\rangle}",
                        color=TXT)\
            .scale(0.55).rotate(PI / 2).next_to(ax, LEFT, buff=0.35)
        true_line = ax.plot(lambda x: true_val, x_range=[1, 50],
                            color=OLIVE, stroke_width=4*SW)
        true_lbl = MathTex(
            r"\langle \mathbf{q},\,\hat{\mathbf{k}} \rangle"
            r"= " + f"{true_val:.2f}",
            color=OLIVE,
        ).scale(0.55).next_to(true_line, RIGHT, buff=0.15)

        self.play(Create(ax), *[Write(l) for l in ax_labels],
                  Write(x_lbl), Write(y_lbl), run_time=1.5)
        self.wait(0.5)
        self.play(Create(true_line), Write(true_lbl), run_time=1.2)
        self.wait(1)

        # biased curve (without sqrt(pi/2) correction)
        pts_b = [ax.c2p(i + 1, est_biased[i]) for i in range(50)]
        line_b = VMobject(color=SIENNA, stroke_width=3.5*SW)
        line_b.set_points_smoothly(pts_b)
        lbl_b = Text("without correction", font_size=18, color=SIENNA, font=FONT)
        lbl_b.to_corner(UR, buff=1.2)

        self.play(Create(line_b), Write(lbl_b), run_time=4)
        self.wait(1)

        # corrected curve
        pts_c = [ax.c2p(i + 1, est_correct[i]) for i in range(50)]
        line_c = VMobject(color=ACCENT, stroke_width=4.5*SW)
        line_c.set_points_smoothly(pts_c)
        correction_lbl = MathTex(
            r"\times\;\sqrt{\pi/2}\;\text{correction}",
            color=ACCENT,
        ).scale(0.55)
        correction_lbl.next_to(lbl_b, DOWN, buff=0.3)

        self.play(Create(line_c), Write(correction_lbl), run_time=4)
        self.wait(1)

        # Final annotation: the correction factor formula
        factor_note = MathTex(
            r"\mathbb{E}\!\left[\mathbf{s}_i^\top \mathbf{q}\;"
            r"\text{sign}(\mathbf{s}_i^\top \mathbf{k})\right]"
            r"= \sqrt{\tfrac{2}{\pi}}\;"
            r"\langle \mathbf{q},\,\hat{\mathbf{k}} \rangle",
            color=TXT,
        ).scale(0.6).to_edge(DOWN, buff=0.35)
        self.play(Write(factor_note), run_time=2.0)
        self.wait(2.5)


# ─────────────────────────────────────────────────────────────────
# Scene 3
# ─────────────────────────────────────────────────────────────────
class PolarRecursion(Scene):
    """Recursive polar tree with angle geometry."""

    def construct(self):
        title = Text("Recursive Polar Transformation", font_size=42,
                     color=TXT, font=FONT).to_edge(UP, buff=0.35)
        self.play(Write(title), run_time=1.5)
        self.wait(1)

        # ── Unit circle inset: show what psi means ───────────────
        inset_title = Tex(
            r"Polar decomposition of a pair $(x_1, x_2)$",
            color=ACCENT, font_size=26,
        )
        inset_title.next_to(title, DOWN, buff=0.25)
        self.play(Write(inset_title), run_time=1.2)
        self.wait(0.8)

        circle = Circle(radius=1.3, color=TXT, stroke_width=3*SW)
        circle.shift(LEFT * 4.5 + DOWN * 0.5)
        x_ax = Line(circle.get_center() + LEFT * 1.5,
                     circle.get_center() + RIGHT * 1.5,
                     color=TXT, stroke_width=2*SW, stroke_opacity=0.5)
        y_ax = Line(circle.get_center() + DOWN * 1.5,
                     circle.get_center() + UP * 1.5,
                     color=TXT, stroke_width=2*SW, stroke_opacity=0.5)

        self.play(Create(circle), Create(x_ax), Create(y_ax), run_time=1.5)
        self.wait(0.5)

        angle_val = PI / 5
        pt = circle.get_center() + 1.3 * np.array([np.cos(angle_val),
                                                     np.sin(angle_val), 0])
        dot = Dot(pt, radius=0.1, color=SIENNA)
        radius_line = Line(circle.get_center(), pt, color=OLIVE, stroke_width=3*SW)
        self.play(FadeIn(dot), Create(radius_line), run_time=1.2)
        self.wait(0.5)

        arc = Arc(radius=0.5, start_angle=0, angle=angle_val,
                  color=ACCENT, stroke_width=4*SW)
        arc.move_arc_center_to(circle.get_center())

        psi_lbl = MathTex(r"\psi", color=ACCENT).scale(0.8)
        psi_lbl.next_to(arc, RIGHT, buff=0.1).shift(UP * 0.1)
        r_lbl = MathTex(r"r", color=OLIVE).scale(0.8)
        r_lbl.move_to(radius_line.get_center() + UP * 0.25 + LEFT * 0.1)

        self.play(Create(arc), Write(psi_lbl), Write(r_lbl), run_time=1.5)
        self.wait(1)

        formula = MathTex(
            r"r = \sqrt{x_1^2 + x_2^2}",
            r",\quad \psi = \text{atan2}(x_2, x_1)",
            color=TXT,
        ).scale(0.6)
        formula.next_to(circle, DOWN, buff=0.4)
        self.play(Write(formula), run_time=1.5)
        self.wait(1.5)

        # Also show context on the right side
        context_box = VGroup(
            Tex(r"Key idea:", color=ACCENT, font_size=24),
            MathTex(
                r"(x_1, x_2) \;\longrightarrow\; (r,\;\psi)",
                color=TXT,
            ).scale(0.65),
            Tex(r"Apply recursively on the radii", color=TXT, font_size=22),
        ).arrange(DOWN, buff=0.25, aligned_edge=LEFT)
        context_box.move_to(RIGHT * 2.5 + DOWN * 0.5)
        self.play(FadeIn(context_box, shift=LEFT * 0.3), run_time=1.5)
        self.wait(2)

        # Fade inset
        inset = VGroup(circle, x_ax, y_ax, dot, radius_line, arc,
                       psi_lbl, r_lbl, formula, inset_title, context_box)
        self.play(FadeOut(inset), run_time=1.0)
        self.wait(0.5)

        # ── Build the tree ───────────────────────────────────────
        # Level 0: 8 coordinates — use MathTex inside manual boxes
        coord_labels = [MathTex(f"x_{i+1}", color=SIENNA).scale(0.6)
                        for i in range(8)]
        coords = VGroup()
        for i in range(8):
            r_box = RoundedRectangle(width=0.9, height=0.5, corner_radius=0.11,
                                     color=SIENNA, stroke_width=3*SW)
            r_box.set_fill(SIENNA, opacity=0.15)
            coord_labels[i].move_to(r_box)
            coords.add(VGroup(r_box, coord_labels[i]))
        coords.arrange(RIGHT, buff=0.12).shift(UP * 2)

        lvl0 = Text("Level 0", font_size=18, color="#bbbbbb", font=FONT)
        lvl0.next_to(coords, LEFT, buff=0.4)

        self.play(LaggedStart(*[FadeIn(c, shift=DOWN * 0.2) for c in coords],
                              lag_ratio=0.08), Write(lvl0), run_time=2.0)
        self.wait(1)

        # Angle count tracker
        count_tex = MathTex(
            r"\text{Angles extracted: } 0", color=ACCENT,
        ).scale(0.65).to_edge(DOWN, buff=0.5)
        self.play(Write(count_tex), run_time=0.8)
        self.wait(0.5)

        # Level 1: 4 pairs -> 4r + 4psi
        level1 = VGroup()
        lines_01 = VGroup()
        r1_names = [r"r_1", r"r_2", r"r_3", r"r_4"]
        p1_names = [r"\psi_1^{(1)}", r"\psi_2^{(1)}",
                    r"\psi_3^{(1)}", r"\psi_4^{(1)}"]
        for i in range(4):
            # Radius box
            r_rect = RoundedRectangle(width=0.65, height=0.45, corner_radius=0.11,
                                      color=OLIVE, stroke_width=3*SW)
            r_rect.set_fill(OLIVE, opacity=0.15)
            r_tex = MathTex(r1_names[i], color=OLIVE).scale(0.5).move_to(r_rect)
            r_b = VGroup(r_rect, r_tex)

            # Angle box
            p_rect = RoundedRectangle(width=0.85, height=0.45, corner_radius=0.11,
                                      color=ACCENT, stroke_width=3*SW)
            p_rect.set_fill(ACCENT, opacity=0.15)
            p_tex = MathTex(p1_names[i], color=ACCENT).scale(0.42).move_to(p_rect)
            p_b = VGroup(p_rect, p_tex)

            cx = (coords[2 * i].get_center()[0] + coords[2 * i + 1].get_center()[0]) / 2
            r_b.move_to(np.array([cx - 0.4, 0.55, 0]))
            p_b.move_to(np.array([cx + 0.45, 0.55, 0]))
            level1.add(VGroup(r_b, p_b))
            for src in [coords[2 * i], coords[2 * i + 1]]:
                for tgt in [r_b, p_b]:
                    lines_01.add(Line(src.get_bottom(), tgt.get_top(),
                                      color=TXT, stroke_width=2*SW, stroke_opacity=0.5))

        lvl1 = Text("Level 1", font_size=18, color="#bbbbbb", font=FONT)
        lvl1.move_to(np.array([lvl0.get_center()[0], 0.55, 0]))

        self.play(*[Create(l) for l in lines_01], run_time=1.2)
        self.play(*[FadeIn(g) for g in level1], Write(lvl1), run_time=1.5)

        c1 = MathTex(
            r"\text{Angles extracted: } 4", color=ACCENT,
        ).scale(0.65).to_edge(DOWN, buff=0.5)
        self.play(FadeTransform(count_tex, c1), run_time=0.8)
        self.wait(1.5)

        # Level 2: 2 pairs of radii -> 2R + 2psi
        level2 = VGroup()
        lines_12 = VGroup()
        r2_names = [r"R_1", r"R_2"]
        p2_names = [r"\psi_1^{(2)}", r"\psi_2^{(2)}"]
        for i in range(2):
            r_rect = RoundedRectangle(width=0.7, height=0.45, corner_radius=0.11,
                                      color=OLIVE, stroke_width=3*SW)
            r_rect.set_fill(OLIVE, opacity=0.15)
            r_tex = MathTex(r2_names[i], color=OLIVE).scale(0.5).move_to(r_rect)
            r_b = VGroup(r_rect, r_tex)

            p_rect = RoundedRectangle(width=0.9, height=0.45, corner_radius=0.11,
                                      color=ACCENT, stroke_width=3*SW)
            p_rect.set_fill(ACCENT, opacity=0.15)
            p_tex = MathTex(p2_names[i], color=ACCENT).scale(0.42).move_to(p_rect)
            p_b = VGroup(p_rect, p_tex)

            cx = (level1[2 * i][0].get_center()[0] + level1[2 * i + 1][0].get_center()[0]) / 2
            r_b.move_to(np.array([cx - 0.45, -0.85, 0]))
            p_b.move_to(np.array([cx + 0.5, -0.85, 0]))
            level2.add(VGroup(r_b, p_b))
            for src_grp in [level1[2 * i], level1[2 * i + 1]]:
                for tgt in [r_b, p_b]:
                    lines_12.add(Line(src_grp[0].get_bottom(), tgt.get_top(),
                                      color=TXT, stroke_width=2*SW, stroke_opacity=0.5))

        lvl2 = Text("Level 2", font_size=18, color="#bbbbbb", font=FONT)
        lvl2.move_to(np.array([lvl0.get_center()[0], -0.85, 0]))

        self.play(*[Create(l) for l in lines_12], run_time=1.0)
        self.play(*[FadeIn(g) for g in level2], Write(lvl2), run_time=1.5)

        c2 = MathTex(
            r"\text{Angles extracted: } 6", color=ACCENT,
        ).scale(0.65).to_edge(DOWN, buff=0.5)
        self.play(FadeTransform(c1, c2), run_time=0.8)
        self.wait(1.5)

        # Level 3: final radius + final angle
        cx = (level2[0][0].get_center()[0] + level2[1][0].get_center()[0]) / 2

        fr_rect = RoundedRectangle(width=1.2, height=0.5, corner_radius=0.11,
                                   color=OLIVE, stroke_width=3*SW)
        fr_rect.set_fill(OLIVE, opacity=0.15)
        fr_tex = MathTex(r"\|\mathbf{x}\|", color=OLIVE).scale(0.55).move_to(fr_rect)
        fr = VGroup(fr_rect, fr_tex)

        fp_rect = RoundedRectangle(width=1.0, height=0.5, corner_radius=0.11,
                                   color=ACCENT, stroke_width=3*SW)
        fp_rect.set_fill(ACCENT, opacity=0.15)
        fp_tex = MathTex(r"\psi^{(3)}", color=ACCENT).scale(0.55).move_to(fp_rect)
        fp = VGroup(fp_rect, fp_tex)

        fr.move_to(np.array([cx - 0.8, -2.2, 0]))
        fp.move_to(np.array([cx + 0.8, -2.2, 0]))

        lines_23 = VGroup()
        for src_grp in [level2[0], level2[1]]:
            for tgt in [fr, fp]:
                lines_23.add(Line(src_grp[0].get_bottom(), tgt.get_top(),
                                  color=TXT, stroke_width=2*SW, stroke_opacity=0.5))

        lvl3 = Text("Level 3", font_size=18, color="#bbbbbb", font=FONT)
        lvl3.move_to(np.array([lvl0.get_center()[0], -2.2, 0]))

        self.play(*[Create(l) for l in lines_23], run_time=1.0)
        self.play(FadeIn(fr), FadeIn(fp), Write(lvl3), run_time=1.5)

        c3 = MathTex(
            r"\text{Angles extracted: } 7", color=ACCENT,
        ).scale(0.65).to_edge(DOWN, buff=0.5)
        self.play(FadeTransform(c2, c3), run_time=0.8)
        self.wait(1.5)

        # Summary
        summary = MathTex(
            r"1 \;\text{radius}"
            r"\;+\; 7 \;\text{angles}"
            r"\;=\; 8 \;\text{coordinates}",
            color=TXT,
        ).scale(0.75)
        payoff = MathTex(
            r"\text{Angles follow known distributions}"
            r"\;\Rightarrow\;\text{universal codebook}",
            color=ACCENT,
        ).scale(0.6)
        VGroup(summary, payoff).arrange(DOWN, buff=0.15).to_edge(DOWN, buff=0.6)
        self.play(FadeTransform(c3, summary), run_time=1.2)
        self.wait(1)
        self.play(Write(payoff), run_time=1.5)
        self.wait(2.5)


# ─────────────────────────────────────────────────────────────────
# Scene 4
# ─────────────────────────────────────────────────────────────────
class BetaConcentration(Scene):
    """Beta density morphing with Gaussian overlay."""

    def construct(self):
        title = Text("Coordinate Distribution: Beta Concentration",
                     font_size=38, color=TXT, font=FONT).to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=1.2)
        self.wait(0.8)

        from scipy.special import gammaln

        def beta_density(x, d):
            if abs(x) >= 0.999:
                return 0
            log_norm = gammaln(d / 2) - 0.5 * np.log(np.pi) - gammaln((d - 1) / 2)
            log_val = log_norm + ((d - 3) / 2) * np.log(max(1 - x ** 2, 1e-30))
            return np.exp(min(log_val, 10))

        # Formula — proper LaTeX rendering
        formula = MathTex(
            r"f_X(x) = \frac{\Gamma(d/2)}{\sqrt{\pi}\,\Gamma((d-1)/2)}"
            r"(1-x^2)^{(d-3)/2}",
            color=ACCENT,
        ).scale(0.75)
        formula.next_to(title, DOWN, buff=0.3)
        self.play(Write(formula), run_time=1.5)
        self.wait(1.0)

        # Subtitle explaining the domain
        domain_note = MathTex(
            r"x \in [-1,\,1], \quad d = \text{embedding dimension}",
            color=TXT,
        ).scale(0.55)
        domain_note.next_to(formula, DOWN, buff=0.2)
        self.play(FadeIn(domain_note, shift=UP * 0.1), run_time=1.0)
        self.wait(1.2)

        dims = [4, 8, 32, 128, 512]
        colors_list = [SIENNA, ACCENT, OLIVE, BLUE, PINK]

        peak_512 = beta_density(0, 512)
        y_max = min(peak_512 * 1.15, 30)

        ax, ax_labels = make_axes_with_labels(
            [-1, 1, 0.25], [0, y_max, 5], 10, 4.0,
            x_ticks=[(-0.8, "-0.8"), (-0.4, "-0.4"), (0, "0"),
                     (0.4, "0.4"), (0.8, "0.8")],
            y_ticks=[(v, str(int(v))) for v in np.arange(5, y_max, 5)],
        )
        ax.shift(DOWN * 0.7)
        ax_labels.shift(DOWN * 0.7)
        self.play(Create(ax), *[Write(l) for l in ax_labels], run_time=1.0)
        self.wait(0.5)

        # Draw curves one-by-one with dimension labels in MathTex
        prev_curve = None
        legend = VGroup()

        for idx, d in enumerate(dims):
            x_lo = -0.98 if d <= 8 else (-0.5 if d >= 128 else -0.85)
            curve = ax.plot(lambda x, d=d: beta_density(x, d),
                            x_range=[x_lo, -x_lo],
                            color=colors_list[idx], stroke_width=4.5*SW)
            lbl = MathTex(f"d = {d}", color=colors_list[idx]).scale(0.65)
            lbl.to_corner(UR, buff=1.0).shift(DOWN * (idx * 0.45))
            legend.add(lbl)

            if prev_curve is None:
                self.play(Create(curve), Write(lbl), run_time=1.5)
            else:
                self.play(Create(curve), Write(lbl), run_time=1.5)
            self.wait(0.8)
            prev_curve = curve

        # Annotation: concentration narrative
        conc_note = Text("As d grows, density concentrates sharply around 0",
                         font_size=20, color=TXT, font=FONT)
        conc_note.to_edge(DOWN, buff=0.35)
        self.play(Write(conc_note), run_time=1.2)
        self.wait(1.5)

        # Gaussian overlay for d=512
        sigma2 = 1.0 / 512.0
        gauss_curve = ax.plot(
            lambda x: np.exp(-x ** 2 / (2 * sigma2)) / np.sqrt(2 * np.pi * sigma2),
            x_range=[-0.15, 0.15],
            color="#aaaaaa", stroke_width=3*SW)
        gauss_curve.set_stroke(opacity=0.8)
        gauss_dash = DashedVMobject(gauss_curve, num_dashes=30)
        gauss_lbl = MathTex(
            r"\mathcal{N}(0,\, 1/d)", color="#aaaaaa"
        ).scale(0.6)
        gauss_lbl.to_corner(UR, buff=1.0).shift(DOWN * (len(dims) * 0.45 + 0.15))

        self.play(Create(gauss_dash), Write(gauss_lbl), run_time=1.5)
        self.wait(1.0)

        # Bottom note with proper math
        self.play(FadeOut(conc_note), run_time=0.5)
        note = MathTex(
            r"\text{Concentrated} \;\Rightarrow\; "
            r"\text{2-bit Lloyd-Max achieves low distortion}",
            color=ACCENT,
        ).scale(0.6)
        note.to_edge(DOWN, buff=0.3)
        self.play(Write(note), run_time=1.5)
        self.wait(2.5)


# ─────────────────────────────────────────────────────────────────
# Scene 5
# ─────────────────────────────────────────────────────────────────
class LloydMaxConvergence(Scene):
    """Lloyd-Max with region shading and 2-step visualization."""

    def construct(self):
        title = Text("Lloyd-Max Quantizer Convergence", font_size=38,
                     color=TXT, font=FONT).to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=1.2)
        self.wait(0.8)

        from scipy.special import gammaln
        from scipy.integrate import quad

        d_p = 128

        def beta_d(x):
            if abs(x) >= 0.999:
                return 0.0
            ln = gammaln(d_p / 2) - 0.5 * np.log(np.pi) - gammaln((d_p - 1) / 2)
            lv = ln + ((d_p - 3) / 2) * np.log(max(1 - x ** 2, 1e-30))
            return np.exp(min(lv, 10))

        def lloyd_max(cents, n_iter=15):
            cents = sorted(cents)
            traj = [list(cents)]
            for _ in range(n_iter):
                bds = [-0.999]
                for i in range(len(cents) - 1):
                    bds.append((cents[i] + cents[i + 1]) / 2)
                bds.append(0.999)
                new = []
                for i in range(len(cents)):
                    num, _ = quad(lambda x: x * beta_d(x), bds[i], bds[i + 1])
                    den, _ = quad(lambda x: beta_d(x), bds[i], bds[i + 1])
                    new.append(num / den if den > 1e-15 else cents[i])
                cents = new
                traj.append(list(cents))
            return traj

        init_c = [-0.375, -0.125, 0.125, 0.375]
        traj = lloyd_max(init_c, n_iter=12)

        peak = beta_d(0)
        y_top = peak * 1.15

        # --- Algorithm description annotations ---
        algo_desc = Text("Iterative optimal scalar quantizer", font_size=22,
                         color=ACCENT, font=FONT)
        algo_desc.next_to(title, DOWN, buff=0.25)
        self.play(Write(algo_desc), run_time=0.8)
        self.wait(0.5)

        ax, ax_labels = make_axes_with_labels(
            [-0.5, 0.5, 0.1], [0, y_top, 2], 10, 3.8,
            x_ticks=[(-0.4, "-0.4"), (-0.2, "-0.2"), (0, "0"),
                     (0.2, "0.2"), (0.4, "0.4")],
            y_ticks=[(v, str(int(v))) for v in np.arange(2, y_top, 2)],
        )
        ax.shift(DOWN * 0.7)
        ax_labels.shift(DOWN * 0.7)

        density_curve = ax.plot(lambda x: beta_d(x), x_range=[-0.49, 0.49],
                                color=OLIVE, stroke_width=4*SW)

        self.play(Create(ax), *[Write(l) for l in ax_labels],
                  Create(density_curve), run_time=1.2)
        self.wait(0.5)

        # Region shading helper
        region_colors = [ACCENT, BLUE, BLUE, ACCENT]

        def make_regions(cents):
            bds = [-0.5] + [(cents[i] + cents[i + 1]) / 2
                            for i in range(len(cents) - 1)] + [0.5]
            rg = VGroup()
            for i in range(len(cents)):
                area = ax.get_area(density_curve,
                                   x_range=[max(bds[i], -0.49),
                                            min(bds[i + 1], 0.49)],
                                   color=region_colors[i], opacity=0.15)
                rg.add(area)
            return rg

        def make_bounds(cents):
            bds = VGroup()
            for i in range(len(cents) - 1):
                mid = (cents[i] + cents[i + 1]) / 2
                bl = DashedLine(ax.c2p(mid, 0),
                                ax.c2p(mid, min(beta_d(mid), y_top * 0.9)),
                                color=SIENNA, stroke_width=3.5*SW, dash_length=0.12)
                bds.add(bl)
            return bds

        # Initial state
        regions = make_regions(traj[0])
        bounds = make_bounds(traj[0])
        cdots = VGroup(*[Dot(ax.c2p(c, 0), radius=0.20, color=ACCENT)
                         for c in traj[0]])

        iter_lbl = Text("Iteration 0  (uniform initialization)", font_size=22,
                        color=TXT, font=FONT).to_edge(DOWN, buff=0.5)

        self.play(FadeIn(regions), *[Create(b) for b in bounds],
                  *[FadeIn(d) for d in cdots], Write(iter_lbl), run_time=1.2)
        self.wait(0.8)

        # Centroid labels: c_1, c_2, ...
        c_mathtex_lbls = VGroup()
        directions_init = [DOWN, DOWN, DOWN, DOWN]
        for i, c in enumerate(traj[0]):
            cl = MathTex(f"c_{{{i+1}}}", color=ACCENT).scale(0.5)
            cl.next_to(cdots[i], DOWN, buff=0.18)
            c_mathtex_lbls.add(cl)
        self.play(*[Write(l) for l in c_mathtex_lbls], run_time=0.8)
        self.wait(0.5)

        # Voronoi boundary annotation
        bd_formula = MathTex(
            r"t_i = \frac{c_i + c_{i+1}}{2}", color=SIENNA
        ).scale(0.6)
        bd_formula.to_corner(UL, buff=0.8).shift(DOWN * 0.8)
        self.play(Write(bd_formula), run_time=1.0)
        self.wait(1.0)

        # Iterate with 2-step visualization (slower, more pauses)
        show_iters = [1, 2, 4, 8, 12]
        for it_idx in show_iters:
            new_c = traj[min(it_idx, len(traj) - 1)]
            prev_c = traj[min(it_idx - 1, len(traj) - 1)]
            diff = max(abs(a - b) for a, b in zip(new_c, prev_c))
            converged = diff < 1e-4

            # Step A: Assign — update boundaries
            new_bounds = make_bounds(new_c)
            new_regions = make_regions(new_c)

            step_a_txt = Text(f"Iter {it_idx}: Assign", font_size=20,
                              color=SIENNA, font=FONT)
            step_a_txt.to_edge(DOWN, buff=0.5)

            # Show "Assign" formula on first visible iteration
            if it_idx == 1:
                assign_formula = MathTex(
                    r"\text{Assign } x \to \arg\min_{c_i} |x - c_i|",
                    color=SIENNA,
                ).scale(0.55)
                assign_formula.next_to(bd_formula, DOWN, buff=0.3)
                self.play(Write(assign_formula), run_time=1.0)
                self.wait(0.5)

            self.play(Transform(iter_lbl, step_a_txt),
                      Transform(bounds, new_bounds),
                      Transform(regions, new_regions), run_time=1.2)
            self.wait(0.5)

            # Step B: Update — move centroids
            suffix = "  (converged!)" if converged else ""
            step_b_txt = Text(f"Iter {it_idx}: Update{suffix}",
                              font_size=20,
                              color=ACCENT if converged else TXT, font=FONT)
            step_b_txt.to_edge(DOWN, buff=0.5)

            # Show "Update" formula on first visible iteration
            if it_idx == 1:
                update_formula = MathTex(
                    r"c_i = \mathbb{E}[X \mid X \in [t_{i-1},\, t_i]]",
                    color=ACCENT,
                ).scale(0.55)
                update_formula.next_to(
                    assign_formula if it_idx == 1 else bd_formula, DOWN, buff=0.3
                )
                self.play(Write(update_formula), run_time=1.0)
                self.wait(0.5)

            self.play(
                Transform(iter_lbl, step_b_txt),
                *[cdots[i].animate.move_to(ax.c2p(c, 0))
                  for i, c in enumerate(new_c)],
                *[c_mathtex_lbls[i].animate.next_to(
                    ax.c2p(c, 0) + DOWN * 0.13, DOWN, buff=0.12)
                  for i, c in enumerate(new_c)],
                run_time=1.2)
            self.wait(0.5)

        # Final centroid values — alternate UP/DOWN to avoid overlap
        final_c = traj[-1]
        c_value_labels = VGroup()
        directions = [UP, DOWN, UP, DOWN]
        for i, c in enumerate(final_c):
            cl = MathTex(f"c_{{{i+1}}} = {c:.3f}", color=ACCENT).scale(0.45)
            cl.next_to(cdots[i], directions[i], buff=0.22)
            c_value_labels.add(cl)
        self.play(
            FadeOut(c_mathtex_lbls),
            *[Write(l) for l in c_value_labels],
            run_time=1.0,
        )
        self.wait(1.0)

        # Bit encoding with MathTex
        bits_txt = MathTex(
            r"2^2 = 4 \text{ regions} = 2 \text{ bits}",
            color=OLIVE,
        ).scale(0.55)
        bits_txt.to_edge(DOWN, buff=0.35)
        self.play(Write(bits_txt), run_time=1.0)
        self.wait(2.0)


# ─────────────────────────────────────────────────────────────────
# Scene 6
# ─────────────────────────────────────────────────────────────────
class TurboQuantPipeline(Scene):
    """TurboQuant MSE + prod pipeline animated flow."""

    def construct(self):
        title = Text("TurboQuant Pipeline", font_size=42,
                     color=TXT, font=FONT).to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=1.0)
        self.wait(0.5)

        # ── Stage 1: MSE pipeline ────────────────────────────────
        mse_title = Text("Stage 1: TurboQuant-MSE", font_size=26,
                         color=OLIVE, font=FONT)
        mse_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(mse_title), run_time=0.8)
        self.wait(0.5)

        # Build boxes — use box() for text names, add MathTex annotations separately
        bx = box("x", TXT, 0.8, 0.5, 20)

        # Rotation box: text label + math annotation
        b_rot = box("Rotate", OLIVE, 1.4, 0.5, 16)
        rot_math = MathTex(r"\mathbf{\Pi x} = \mathbf{y}", color=OLIVE).scale(0.45)

        # Quantize box
        b_quant = box("Lloyd-Max", ACCENT, 1.4, 0.5, 16)

        # Index box
        b_idx = box("idx", SIENNA, 0.8, 0.5, 18)

        # Dequantize box
        b_deq = box("Dequantize", ACCENT, 1.5, 0.5, 16)

        # y_hat box
        b_yhat = box("y_hat", OLIVE, 0.9, 0.5, 18)

        # Inverse rotation box
        b_rot_back = box("Rotate back", OLIVE, 1.5, 0.5, 16)
        rot_back_math = MathTex(
            r"\mathbf{\Pi}^\top \hat{\mathbf{y}}", color=OLIVE
        ).scale(0.45)

        # Output
        b_xhat = box("x_hat", TXT, 0.9, 0.5, 18)

        # Arrange in 2 rows
        row1 = VGroup(bx, b_rot, b_quant, b_idx).arrange(RIGHT, buff=0.4)
        row1.move_to(ORIGIN + UP * 0.3)
        row2 = VGroup(b_deq, b_yhat, b_rot_back, b_xhat).arrange(RIGHT, buff=0.4)
        row2.move_to(ORIGIN + DOWN * 1.2)

        # Position math annotations below their boxes
        rot_math.next_to(b_rot, DOWN, buff=0.08)
        rot_back_math.next_to(b_rot_back, DOWN, buff=0.08)

        arr1 = VGroup()
        for a, b in [(bx, b_rot), (b_rot, b_quant), (b_quant, b_idx)]:
            arr1.add(Arrow(a.get_right(), b.get_left(),
                           color=TXT, stroke_width=3*SW, buff=0.08))

        # Down arrow from idx to deq
        arr_down = Arrow(b_idx.get_bottom(), b_deq.get_top(),
                         color=TXT, stroke_width=3*SW, buff=0.08)

        arr2 = VGroup()
        for a, b in [(b_deq, b_yhat), (b_yhat, b_rot_back),
                     (b_rot_back, b_xhat)]:
            arr2.add(Arrow(a.get_right(), b.get_left(),
                           color=TXT, stroke_width=3*SW, buff=0.08))

        # Storage annotation with MathTex
        store_lbl = MathTex(r"b \cdot d \text{ bits}", color=SIENNA).scale(0.5)
        store_lbl.next_to(b_idx, UP, buff=0.15)

        # Animate row by row (slower reveals)
        self.play(FadeIn(bx), run_time=0.8)
        self.wait(0.3)
        self.play(GrowArrow(arr1[0]), FadeIn(b_rot), Write(rot_math),
                  run_time=1.0)
        self.wait(0.5)
        self.play(GrowArrow(arr1[1]), FadeIn(b_quant), run_time=1.0)
        self.wait(0.5)
        self.play(GrowArrow(arr1[2]), FadeIn(b_idx), Write(store_lbl),
                  run_time=1.0)
        self.wait(0.5)
        self.play(GrowArrow(arr_down), FadeIn(b_deq), run_time=0.8)
        self.play(GrowArrow(arr2[0]), FadeIn(b_yhat), run_time=0.8)
        self.play(GrowArrow(arr2[1]), FadeIn(b_rot_back), Write(rot_back_math),
                  run_time=0.8)
        self.play(GrowArrow(arr2[2]), FadeIn(b_xhat), run_time=0.8)
        self.wait(0.5)

        mse_note = Text("Data-oblivious: rotation and codebook fixed before any data",
                        font_size=20, color=TXT, font=FONT)
        mse_note.to_edge(DOWN, buff=0.5)
        self.play(Write(mse_note), run_time=1.2)
        self.wait(2.0)

        # ── Stage 2: Prod pipeline ───────────────────────────────
        self.play(*[FadeOut(m) for m in self.mobjects if m is not title],
                  run_time=1.0)

        prod_title = Text("Stage 2: TurboQuant-Prod  (adds QJL residual)",
                          font_size=26, color=ACCENT, font=FONT)
        prod_title.next_to(title, DOWN, buff=0.3)
        self.play(Write(prod_title), run_time=1.0)
        self.wait(0.5)

        # MSE stage box (collapsed)
        mse_box = box("TQ-MSE(x)", OLIVE, 2.4, 0.6, 18)
        mse_box.shift(UP * 1.0 + LEFT * 3.0)

        # x_hat output label
        xhat_lbl = MathTex(r"\hat{\mathbf{x}}", color=OLIVE).scale(0.55)
        xhat_lbl.next_to(mse_box, RIGHT, buff=0.15)

        # Residual
        res_box = box("Residual", SIENNA, 1.8, 0.6, 18)
        res_box.next_to(xhat_lbl, RIGHT, buff=0.8)
        res_math = MathTex(
            r"\mathbf{r} = \mathbf{x} - \hat{\mathbf{x}}", color=SIENNA
        ).scale(0.5)
        res_math.next_to(res_box, DOWN, buff=0.08)

        # QJL on residual
        qjl_box = box("QJL Sign", ACCENT, 1.8, 0.6, 18)
        qjl_box.shift(DOWN * 0.5 + RIGHT * 1.0)
        qjl_math = MathTex(
            r"\text{sign}(\mathbf{S r})", color=ACCENT
        ).scale(0.5)
        qjl_math.next_to(qjl_box, DOWN, buff=0.08)

        # Norm
        norm_box = box("Norm", SIENNA, 1.6, 0.6, 18)
        norm_box.next_to(qjl_box, LEFT, buff=1.2)
        norm_math = MathTex(
            r"\gamma = \|\mathbf{r}\|", color=SIENNA
        ).scale(0.5)
        norm_math.next_to(norm_box, DOWN, buff=0.08)

        # Output
        out_box = box("Stored representation", TXT, 3.6, 0.6, 16)
        out_box.shift(DOWN * 2.0)
        out_math = MathTex(
            r"\bigl(\,\text{idx},\;\text{sign}(\mathbf{Sr}),\;\gamma\,\bigr)",
            color=TXT,
        ).scale(0.45)
        out_math.next_to(out_box, DOWN, buff=0.08)

        # Animate stage 2
        self.play(FadeIn(mse_box), Write(xhat_lbl), run_time=1.0)
        self.wait(0.5)

        a1 = Arrow(xhat_lbl.get_right() + RIGHT * 0.05, res_box.get_left(),
                    color=TXT, stroke_width=3*SW, buff=0.08)
        self.play(GrowArrow(a1), FadeIn(res_box), Write(res_math), run_time=1.0)
        self.wait(0.5)

        a2 = Arrow(res_box.get_bottom(), qjl_box.get_top(),
                    color=TXT, stroke_width=3*SW, buff=0.08)
        a3 = Arrow(res_box.get_bottom(), norm_box.get_top(),
                    color=TXT, stroke_width=3*SW, buff=0.08)
        self.play(GrowArrow(a2), GrowArrow(a3),
                  FadeIn(qjl_box), Write(qjl_math),
                  FadeIn(norm_box), Write(norm_math), run_time=1.2)
        self.wait(0.5)

        a4 = Arrow(qjl_box.get_bottom(), out_box.get_top(),
                    color=TXT, stroke_width=3*SW, buff=0.08)
        a5 = Arrow(norm_box.get_bottom(), out_box.get_top(),
                    color=TXT, stroke_width=3*SW, buff=0.08)
        self.play(GrowArrow(a4), GrowArrow(a5),
                  FadeIn(out_box), Write(out_math), run_time=1.0)
        self.wait(0.5)

        # Storage annotation
        store2 = MathTex(
            r"b \cdot d + k + 32 \text{ bits}", color=SIENNA
        ).scale(0.5)
        store2.next_to(out_box, RIGHT, buff=0.3)
        self.play(Write(store2), run_time=0.8)
        self.wait(0.8)

        # IP estimation formula
        est = MathTex(
            r"\hat{\langle \mathbf{q},\mathbf{x}\rangle}"
            r"= \langle \mathbf{q}, \tilde{\mathbf{x}}\rangle"
            r"+ \gamma \frac{\sqrt{\pi/2}}{k}"
            r"\langle \mathbf{Sq}, \text{sign}(\mathbf{Sr})\rangle",
            color=ACCENT,
        ).scale(0.6)
        est.to_edge(DOWN, buff=0.4)
        self.play(Write(est), run_time=2.0)
        self.wait(3.0)


# ─────────────────────────────────────────────────────────────────
# Scene 7
# ─────────────────────────────────────────────────────────────────
class RandomRotation(Scene):
    """Before/after random rotation on coordinate distribution."""

    def construct(self):
        from scipy.special import gammaln

        # ── Title ────────────────────────────────────────────────
        title = Text("Random Rotation Induces Beta Distribution",
                     font_size=38, color=TXT, font=FONT).to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=1.0)
        self.wait(0.5)

        # ── Beta density helper ──────────────────────────────────
        def beta_density(x, d):
            if abs(x) >= 0.999:
                return 0
            ln = gammaln(d / 2) - 0.5 * np.log(np.pi) - gammaln((d - 1) / 2)
            lv = ln + ((d - 3) / 2) * np.log(max(1 - x ** 2, 1e-30))
            return np.exp(min(lv, 10))

        d = 128

        # ── Left panel: "Before rotation" ────────────────────────
        ax_l, lbl_l = make_axes_with_labels(
            [-1, 1, 0.5], [0, 8, 2], 4.5, 3.5,
            x_ticks=[(-0.5, "-0.5"), (0, "0"), (0.5, "0.5")],
            y_ticks=[(2, "2"), (4, "4"), (6, "6")],
        )
        ax_l.shift(LEFT * 3.5 + DOWN * 0.5)
        lbl_l.shift(LEFT * 3.5 + DOWN * 0.5)

        # Before label: Text + MathTex for x
        before_text = Text("Before rotation", font_size=22,
                           color=SIENNA, font=FONT)
        before_math = MathTex(r"\mathbf{x}", color=SIENNA).scale(0.85)
        before_label = VGroup(before_text, before_math).arrange(RIGHT, buff=0.15)
        before_label.next_to(ax_l, UP, buff=0.2)

        # Simulate an irregular distribution (bimodal)
        np.random.seed(99)
        samples_before = np.concatenate([
            np.random.normal(-0.5, 0.15, 200),
            np.random.normal(0.3, 0.25, 300),
        ])
        samples_before = samples_before[(samples_before > -1) & (samples_before < 1)]

        # Build histogram bars
        n_bins = 20
        hist_b, bin_edges = np.histogram(samples_before, bins=n_bins, range=(-1, 1))
        hist_b = hist_b / hist_b.max() * 6  # scale
        bars_before = VGroup()
        for i in range(n_bins):
            x0, x1 = bin_edges[i], bin_edges[i + 1]
            h = hist_b[i]
            if h > 0.1:
                rect = Rectangle(
                    width=ax_l.x_length / n_bins * 0.9,
                    height=h / 8 * 3.5,
                    color=SIENNA, fill_color=SIENNA, fill_opacity=0.4,
                    stroke_width=2*SW)
                rect.move_to(ax_l.c2p((x0 + x1) / 2, h / 2))
                bars_before.add(rect)

        # Animate left panel
        self.play(Create(ax_l), *[Write(l) for l in lbl_l],
                  Write(before_label), run_time=1.0)
        self.play(LaggedStart(*[FadeIn(b, shift=UP * 0.2) for b in bars_before],
                              lag_ratio=0.04), run_time=1.5)
        self.wait(1.0)

        # ── Central arrow with proper MathTex ────────────────────
        rot_arrow = Arrow(LEFT * 0.8, RIGHT * 0.8, color=TXT, stroke_width=5*SW)
        rot_arrow.shift(DOWN * 0.5)
        pi_label = MathTex(r"\mathbf{\Pi}", color=TXT).scale(0.9)
        pi_label.next_to(rot_arrow, UP, buff=0.2)
        ortho_label = Text("(random orthogonal)", font_size=16,
                           color=TXT, font=FONT)
        ortho_label.next_to(pi_label, UP, buff=0.1)

        self.play(GrowArrow(rot_arrow), Write(pi_label),
                  Write(ortho_label), run_time=1.0)
        self.wait(1.0)

        # ── Right panel: "After rotation" with Beta curve ────────
        ax_r, lbl_r = make_axes_with_labels(
            [-1, 1, 0.5], [0, 8, 2], 4.5, 3.5,
            x_ticks=[(-0.5, "-0.5"), (0, "0"), (0.5, "0.5")],
            y_ticks=[(2, "2"), (4, "4"), (6, "6")],
        )
        ax_r.shift(RIGHT * 3.5 + DOWN * 0.5)
        lbl_r.shift(RIGHT * 3.5 + DOWN * 0.5)

        # After label: Text + MathTex
        after_text = Text("After rotation", font_size=22,
                          color=OLIVE, font=FONT)
        after_math = MathTex(r"\mathbf{\Pi x} = \mathbf{y}",
                             color=OLIVE).scale(0.85)
        after_label = VGroup(after_text, after_math).arrange(RIGHT, buff=0.15)
        after_label.next_to(ax_r, UP, buff=0.2)

        beta_curve = ax_r.plot(lambda x: beta_density(x, d),
                               x_range=[-0.49, 0.49],
                               color=OLIVE, stroke_width=4.5*SW)
        beta_fill = ax_r.get_area(beta_curve, x_range=[-0.49, 0.49],
                                  color=OLIVE, opacity=0.15)

        # Beta annotation on the curve peak
        beta_annot = MathTex(
            r"\mathrm{Beta}\!\left(\tfrac{d-1}{2},\,\tfrac{d-1}{2}\right)",
            color=OLIVE,
        ).scale(0.55)
        beta_annot.next_to(ax_r.c2p(0, beta_density(0, d)), UR, buff=0.15)

        # Animate right panel
        self.play(Create(ax_r), *[Write(l) for l in lbl_r],
                  Write(after_label), run_time=1.0)
        self.play(Create(beta_curve), FadeIn(beta_fill), run_time=1.5)
        self.play(FadeIn(beta_annot, shift=UP * 0.15), run_time=0.8)
        self.wait(1.5)

        # ── Bottom note with proper MathTex ──────────────────────
        note = MathTex(
            r"\text{Any } \mathbf{x} \in \mathbb{S}^{d-1}"
            r" \text{ produces the same Beta distribution}",
            color=ACCENT,
        ).scale(0.85)
        note.to_edge(DOWN, buff=0.4)
        self.play(Write(note), run_time=1.2)
        self.wait(2.0)


# ─────────────────────────────────────────────────────────────────
# Scene 8
# ─────────────────────────────────────────────────────────────────
class DistortionBounds(Scene):
    """TurboQuant upper bound vs lower bound with 2.7x gap."""

    def construct(self):
        # ── Title ────────────────────────────────────────────────
        title = Text("Distortion vs. Bit-Width: Near-Optimality",
                     font_size=38, color=TXT, font=FONT).to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=1.0)
        self.wait(0.8)

        # ── Data ─────────────────────────────────────────────────
        bits = [1, 2, 3, 4]
        upper = [np.sqrt(3) * np.pi / 2 * 4 ** (-b) for b in bits]
        lower = [4 ** (-b) for b in bits]
        numerical = [0.36, 0.117, 0.030, 0.009]

        # ── Log-scale axes ───────────────────────────────────────
        ax, ax_labels = make_axes_with_labels(
            [0.5, 4.5, 1], [-3, 0, 1], 8, 4.5,
            x_ticks=[(1, "1"), (2, "2"), (3, "3"), (4, "4")],
            y_ticks=[(-3, "0.001"), (-2, "0.01"), (-1, "0.1"), (0, "1")],
        )
        ax.shift(DOWN * 0.3)
        ax_labels.shift(DOWN * 0.3)

        # Axis labels: MathTex for x, Text for y
        x_lbl = MathTex(r"b \text{ (bits per coordinate)}",
                        color=TXT).scale(0.7)
        x_lbl.next_to(ax, DOWN, buff=0.35)
        y_lbl = Text("MSE distortion (log scale)", font_size=18,
                     color=TXT, font=FONT)
        y_lbl.rotate(PI / 2).next_to(ax, LEFT, buff=0.35)

        self.play(Create(ax), *[Write(l) for l in ax_labels],
                  Write(x_lbl), Write(y_lbl), run_time=1.2)
        self.wait(0.8)

        # ── Lower bound: 4^{-b} ─────────────────────────────────
        lower_pts = [ax.c2p(b, np.log10(4 ** (-b))) for b in bits]
        lower_line = VMobject(color=BLUE, stroke_width=4.5*SW)
        lower_line.set_points_smoothly(lower_pts)
        lower_dots = VGroup(*[Dot(p, radius=0.1, color=BLUE) for p in lower_pts])
        lower_lbl = MathTex(r"\text{Lower bound: } 4^{-b}",
                            color=BLUE).scale(0.75)
        lower_lbl.to_corner(UR, buff=1.2)

        self.play(Create(lower_line), *[FadeIn(d) for d in lower_dots],
                  run_time=1.5)
        self.play(Write(lower_lbl), run_time=0.8)
        self.wait(0.8)

        # ── Upper bound: (sqrt(3) pi / 2) * 4^{-b} ─────────────
        upper_pts = [ax.c2p(b, np.log10(upper[i])) for i, b in enumerate(bits)]
        upper_line = VMobject(color=ACCENT, stroke_width=4.5*SW)
        upper_line.set_points_smoothly(upper_pts)
        upper_dots = VGroup(*[Dot(p, radius=0.1, color=ACCENT) for p in upper_pts])
        upper_lbl = MathTex(
            r"\text{TQ bound: } \frac{\sqrt{3}\pi}{2} \cdot 4^{-b}",
            color=ACCENT,
        ).scale(0.75)
        upper_lbl.next_to(lower_lbl, DOWN, buff=0.3)

        self.play(Create(upper_line), *[FadeIn(d) for d in upper_dots],
                  run_time=1.5)
        self.play(Write(upper_lbl), run_time=0.8)
        self.wait(0.8)

        # ── Numerical (actual) values ────────────────────────────
        num_pts = [ax.c2p(b, np.log10(numerical[i]))
                   for i, b in enumerate(bits)]
        num_dots = VGroup(*[Dot(p, radius=0.16, color=OLIVE) for p in num_pts])
        num_lbl = MathTex(r"\text{Actual (numerical)}", color=OLIVE).scale(0.75)
        num_lbl.next_to(upper_lbl, DOWN, buff=0.3)

        # Small colored squares as legend keys
        lower_key = Square(side_length=0.18, color=BLUE,
                           fill_color=BLUE, fill_opacity=1.0)
        lower_key.next_to(lower_lbl, LEFT, buff=0.12)
        upper_key = Square(side_length=0.18, color=ACCENT,
                           fill_color=ACCENT, fill_opacity=1.0)
        upper_key.next_to(upper_lbl, LEFT, buff=0.12)
        num_key = Square(side_length=0.18, color=OLIVE,
                         fill_color=OLIVE, fill_opacity=1.0)
        num_key.next_to(num_lbl, LEFT, buff=0.12)

        self.play(*[FadeIn(d, scale=0.5) for d in num_dots],
                  Write(num_lbl), FadeIn(lower_key), FadeIn(upper_key),
                  FadeIn(num_key), run_time=1.5)
        self.wait(0.8)

        # ── Gap annotation at b = 2 ─────────────────────────────
        gap_top = ax.c2p(2, np.log10(upper[1]))
        gap_bot = ax.c2p(2, np.log10(lower[1]))
        gap_line = DashedLine(
            gap_bot + RIGHT * 0.35, gap_top + RIGHT * 0.35,
            color=SIENNA, stroke_width=4*SW, dash_length=0.1,
        )
        gap_brace = Brace(gap_line, direction=RIGHT, color=SIENNA)
        gap_txt = MathTex(r"\approx 2.7\times \text{ gap}",
                          color=SIENNA).scale(0.7)
        gap_txt.next_to(gap_brace, RIGHT, buff=0.15)

        self.play(Create(gap_line), GrowFromCenter(gap_brace), run_time=1.0)
        self.play(Write(gap_txt), run_time=0.8)
        self.wait(0.8)

        # ── Bottom note ──────────────────────────────────────────
        note = MathTex(
            r"\text{Within constant factor of information-theoretic optimum}",
            color=TXT,
        ).scale(0.8)
        note.to_edge(DOWN, buff=0.4)
        self.play(Write(note), run_time=1.2)
        self.wait(2.5)
