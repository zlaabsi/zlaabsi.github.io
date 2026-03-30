#!/usr/bin/env python3
"""Generate all SVG figures for the Combinatorial Game Theory blog post.

Outputs 10 SVGs to ../static/images/cgt/ with:
- Uniform palette matching the blog theme
- Embedded dark-mode CSS (@media prefers-color-scheme + .dark class)
- Georgia serif for labels, monospace for numbers
"""

import math
import os

# ── Palette ──────────────────────────────────────────────────
BG      = "#FAF7F2"
TEXT    = "#2C2418"
ACCENT  = "#B8860B"
OLIVE   = "#6B705C"
BORDER  = "#D4C9B8"
SIENNA  = "#A0522D"

# Dark mode overrides (matches darioamodei.com style)
DARK_BG     = "#111111"
DARK_TEXT   = "#f0f0f0"
DARK_ACCENT = "#D4A843"
DARK_OLIVE  = "#8B9A6B"
DARK_BORDER = "#2a2a2a"
DARK_SIENNA = "#C97A50"

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "images", "cgt")

# ── Dark mode CSS block ──────────────────────────────────────
DARK_CSS = f"""<style>
  @media (prefers-color-scheme: dark) {{
    .bg {{ fill: {DARK_BG}; }}
    .txt {{ fill: {DARK_TEXT}; }}
    .txt-sec {{ fill: {DARK_OLIVE}; }}
    .accent {{ fill: {DARK_ACCENT}; }}
    .accent-stroke {{ stroke: {DARK_ACCENT}; }}
    .sienna {{ fill: {DARK_SIENNA}; }}
    .sienna-stroke {{ stroke: {DARK_SIENNA}; }}
    .olive {{ fill: {DARK_OLIVE}; }}
    .olive-stroke {{ stroke: {DARK_OLIVE}; }}
    .border-stroke {{ stroke: {DARK_BORDER}; }}
    .line {{ stroke: {DARK_TEXT}; }}
    .line-light {{ stroke: {DARK_BORDER}; }}
    .node-fill {{ fill: {DARK_BG}; }}
    .node-stroke {{ stroke: {DARK_TEXT}; }}
    .accent-bg {{ fill: {DARK_ACCENT}; fill-opacity: 0.2; }}
    .olive-bg {{ fill: {DARK_OLIVE}; fill-opacity: 0.2; }}
    .sienna-bg {{ fill: {DARK_SIENNA}; fill-opacity: 0.2; }}
    .marker-dark {{ fill: {DARK_TEXT}; }}
    .marker-accent {{ fill: {DARK_ACCENT}; }}
    .marker-olive {{ fill: {DARK_OLIVE}; }}
    .marker-sienna {{ fill: {DARK_SIENNA}; }}
    .xor-bg {{ fill: {DARK_ACCENT}; fill-opacity: 0.12; }}
    .highlight-bg {{ fill: {DARK_ACCENT}; fill-opacity: 0.08; }}
    .kernel-fill {{ fill: {DARK_ACCENT}; }}
    .p-fill {{ fill: {DARK_OLIVE}; }}
    .n-fill {{ fill: {DARK_SIENNA}; }}
  }}
  .dark .bg {{ fill: {DARK_BG}; }}
  .dark .txt {{ fill: {DARK_TEXT}; }}
  .dark .txt-sec {{ fill: {DARK_OLIVE}; }}
  .dark .accent {{ fill: {DARK_ACCENT}; }}
  .dark .accent-stroke {{ stroke: {DARK_ACCENT}; }}
  .dark .sienna {{ fill: {DARK_SIENNA}; }}
  .dark .sienna-stroke {{ stroke: {DARK_SIENNA}; }}
  .dark .olive {{ fill: {DARK_OLIVE}; }}
  .dark .olive-stroke {{ stroke: {DARK_OLIVE}; }}
  .dark .border-stroke {{ stroke: {DARK_BORDER}; }}
  .dark .line {{ stroke: {DARK_TEXT}; }}
  .dark .line-light {{ stroke: {DARK_BORDER}; }}
  .dark .node-fill {{ fill: {DARK_BG}; }}
  .dark .node-stroke {{ stroke: {DARK_TEXT}; }}
  .dark .accent-bg {{ fill: {DARK_ACCENT}; fill-opacity: 0.2; }}
  .dark .olive-bg {{ fill: {DARK_OLIVE}; fill-opacity: 0.2; }}
  .dark .sienna-bg {{ fill: {DARK_SIENNA}; fill-opacity: 0.2; }}
  .dark .marker-dark {{ fill: {DARK_TEXT}; }}
  .dark .marker-accent {{ fill: {DARK_ACCENT}; }}
  .dark .marker-olive {{ fill: {DARK_OLIVE}; }}
  .dark .marker-sienna {{ fill: {DARK_SIENNA}; }}
  .dark .xor-bg {{ fill: {DARK_ACCENT}; fill-opacity: 0.12; }}
  .dark .highlight-bg {{ fill: {DARK_ACCENT}; fill-opacity: 0.08; }}
  .dark .kernel-fill {{ fill: {DARK_ACCENT}; }}
  .dark .p-fill {{ fill: {DARK_OLIVE}; }}
  .dark .n-fill {{ fill: {DARK_SIENNA}; }}
</style>"""

MARKERS = """<defs>
  <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    <polygon points="0 0, 8 3, 0 6" class="marker-dark" fill="{text}"/>
  </marker>
  <marker id="arr-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    <polygon points="0 0, 8 3, 0 6" class="marker-accent" fill="{accent}"/>
  </marker>
  <marker id="arr-olive" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    <polygon points="0 0, 8 3, 0 6" class="marker-olive" fill="{olive}"/>
  </marker>
  <marker id="arr-sienna" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    <polygon points="0 0, 8 3, 0 6" class="marker-sienna" fill="{sienna}"/>
  </marker>
  <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
    <feDropShadow dx="1" dy="1" stdDeviation="1.5" flood-opacity="0.1"/>
  </filter>
</defs>""".format(text=TEXT, accent=ACCENT, olive=OLIVE, sienna=SIENNA)


def svg_header(w, h):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n{DARK_CSS}\n{MARKERS}'


def svg_footer():
    return "</svg>"


def text(x, y, label, size=14, color_class="txt", color=TEXT, anchor="middle",
         weight="normal", style="normal", font="Georgia, serif"):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
            f'font-family="{font}" font-size="{size}" '
            f'class="{color_class}" fill="{color}" '
            f'font-weight="{weight}" font-style="{style}">{label}</text>')


def circle(cx, cy, r, fill=BG, stroke=TEXT, sw=1.5, fill_class="node-fill",
           stroke_class="node-stroke", opacity=1, shadow=False):
    filt = ' filter="url(#shadow)"' if shadow else ""
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" '
            f'class="{fill_class} {stroke_class}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" '
            f'fill-opacity="{opacity}"{filt}/>')


def line(x1, y1, x2, y2, stroke=TEXT, sw=1.5, marker="", stroke_class="line",
         opacity=1, dash=""):
    m = f' marker-end="url(#{marker})"' if marker else ""
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'class="{stroke_class}" stroke="{stroke}" stroke-width="{sw}" '
            f'stroke-opacity="{opacity}" stroke-linecap="round"{m}{d}/>')


def rect(x, y, w, h, fill=BG, rx=3, fill_class="node-fill", opacity=1):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
            f'class="{fill_class}" fill="{fill}" fill-opacity="{opacity}" rx="{rx}"/>')


def path(d, stroke=TEXT, sw=1.5, fill="none", marker="", stroke_class="line", opacity=1):
    m = f' marker-end="url(#{marker})"' if marker else ""
    return (f'<path d="{d}" fill="{fill}" '
            f'class="{stroke_class}" stroke="{stroke}" stroke-width="{sw}" '
            f'stroke-opacity="{opacity}"{m}/>')


def arrow_between(x1, y1, x2, y2, r1=0, r2=18, marker="arr", stroke=TEXT,
                  sw=1.5, stroke_class="line", opacity=1):
    """Line from edge of circle at (x1,y1) r=r1 to edge of circle at (x2,y2) r=r2."""
    dx = x2 - x1
    dy = y2 - y1
    dist = math.sqrt(dx*dx + dy*dy)
    if dist == 0:
        return ""
    ux, uy = dx/dist, dy/dist
    sx = x1 + ux * r1
    sy = y1 + uy * r1
    ex = x2 - ux * (r2 + 2)  # +2 for marker
    ey = y2 - uy * (r2 + 2)
    return line(f"{sx:.1f}", f"{sy:.1f}", f"{ex:.1f}", f"{ey:.1f}",
                stroke=stroke, sw=sw, marker=marker, stroke_class=stroke_class,
                opacity=opacity)


def curved_arrow(x1, y1, x2, y2, r1=18, r2=18, bend=30, marker="arr",
                 stroke=TEXT, sw=1.5, stroke_class="line", opacity=1):
    """Quadratic bezier arrow between two circle centers, offset by bend."""
    dx = x2 - x1
    dy = y2 - y1
    dist = math.sqrt(dx*dx + dy*dy)
    if dist == 0:
        return ""
    ux, uy = dx/dist, dy/dist
    nx, ny = -uy, ux
    mx = (x1+x2)/2 + nx*bend
    my = (y1+y2)/2 + ny*bend
    # Compute start/end on circle edges towards control point
    d1x, d1y = mx - x1, my - y1
    d1 = math.sqrt(d1x**2 + d1y**2)
    sx = x1 + (d1x/d1)*r1
    sy = y1 + (d1y/d1)*r1
    d2x, d2y = mx - x2, my - y2
    d2 = math.sqrt(d2x**2 + d2y**2)
    ex = x2 + (d2x/d2)*(r2+2)
    ey = y2 + (d2y/d2)*(r2+2)
    d_str = f"M {sx:.1f},{sy:.1f} Q {mx:.1f},{my:.1f} {ex:.1f},{ey:.1f}"
    return path(d_str, stroke=stroke, sw=sw, marker=marker,
                stroke_class=stroke_class, opacity=opacity)


def token(cx, cy, r=14):
    """A Nim token: outer circle + inner dot with shadow."""
    return (circle(cx, cy, r, fill=ACCENT, stroke=TEXT, sw=1.5,
                   fill_class="accent-bg", stroke_class="node-stroke",
                   opacity=0.2, shadow=True) + "\n" +
            circle(cx, cy, 4, fill=ACCENT, stroke="none", sw=0,
                   fill_class="accent", stroke_class="", opacity=0.8))


def write_svg(filename, content):
    filepath = os.path.join(OUT_DIR, filename)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"  wrote {filepath}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. nim_heaps.svg — (1,3,5) heap visualization
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_nim_heaps():
    W, H = 600, 290
    parts = [svg_header(W, H)]
    heaps = [(1, "Heap 1", "n\u2081 = 1"), (3, "Heap 2", "n\u2082 = 3"), (5, "Heap 3", "n\u2083 = 5")]
    xs = [120, 300, 480]
    for i, (n, label, sub) in enumerate(heaps):
        x = xs[i]
        parts.append(f'<g transform="translate({x}, 30)">')
        parts.append(text(0, 0, label, 16, weight="bold"))
        parts.append(text(0, 18, f"({sub})", 13, color_class="txt-sec", color=OLIVE))
        for j in range(n):
            cy = 190 - j * 32
            parts.append(token(0, cy))
        parts.append(line(-25, 210, 25, 210, sw=1.5))
        parts.append("</g>")
    parts.append(text(300, 275, "Nim position: (1, 3, 5)", 14, style="italic"))
    parts.append(svg_footer())
    write_svg("nim_heaps.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. binary_matrix.svg — Binary decomposition of (1,3,5) with XOR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_binary_matrix():
    W, H = 500, 250
    parts = [svg_header(W, H)]
    parts.append('<g transform="translate(120, 20)">')
    # Column headers
    headers = ["2\u00b2", "2\u00b9", "2\u2070"]
    for j, h in enumerate(headers):
        parts.append(text(30 + j*60, 18, h, 14, color_class="txt-sec", color=OLIVE, weight="bold"))
    # Grid lines
    for r in range(5):
        y = 28 + r * 40
        parts.append(line(0, y, 180, y, stroke=TEXT, sw=0.5, stroke_class="line-light", opacity=0.3))
    for c in range(4):
        x = c * 60
        parts.append(line(x, 28, x, 188, stroke=TEXT, sw=0.5, stroke_class="line-light", opacity=0.3))
    # Matrix data
    matrix = [[0, 0, 1], [0, 1, 1], [1, 0, 1]]
    heap_labels = [1, 3, 5]
    for r, row in enumerate(matrix):
        for c, val in enumerate(row):
            x = 30 + c * 60
            y = 54 + r * 40
            cls = "accent" if val == 1 else "txt"
            clr = ACCENT if val == 1 else TEXT
            w = "bold" if val == 1 else "normal"
            parts.append(text(x, y, str(val), 20, color_class=cls, color=clr, weight=w))
        parts.append(text(195, 54 + r*40, f"\u2190 {heap_labels[r]}", 13,
                          color_class="txt-sec", color=OLIVE, anchor="start"))
    # XOR separator
    parts.append(line(0, 148, 180, 148, stroke=TEXT, sw=2))
    parts.append(rect(0, 150, 180, 38, fill=ACCENT, rx=3, fill_class="xor-bg", opacity=0.12))
    parts.append(text(-35, 174, "XOR", 13, color_class="accent", color=ACCENT, weight="bold", anchor="end"))
    xor_row = [1, 1, 1]
    for c, val in enumerate(xor_row):
        parts.append(text(30 + c*60, 174, str(val), 20, color_class="accent", color=ACCENT, weight="bold"))
    parts.append(text(195, 174, "= 7", 13, color_class="accent", color=ACCENT, weight="bold", anchor="start"))
    parts.append("</g>")
    parts.append(text(250, 235, "n\u2081 \u2295 n\u2082 \u2295 n\u2083 = 1 \u2295 3 \u2295 5 = 7 \u2260 0 \u21d2 N-position (first player wins)", 14, style="italic"))
    parts.append(svg_footer())
    write_svg("binary_matrix.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. kernel_examples.svg — Graph kernel examples with P/N labels
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_kernel_examples():
    W, H = 700, 320
    parts = [svg_header(W, H)]

    def draw_graph(ox, oy, title, subtitle, nodes, edges, kernel_set, note="",
                   curved_edges=None):
        if curved_edges is None:
            curved_edges = set()
        parts.append(f'<g transform="translate({ox}, {oy})">')
        parts.append(text(75, 0, title, 12, weight="bold"))
        parts.append(text(75, 15, subtitle, 10, color_class="txt-sec", color=OLIVE))
        # Draw edges first
        for (a, b) in edges:
            ax, ay = nodes[a][:2]
            bx, by = nodes[b][:2]
            if (a, b) in curved_edges:
                parts.append(curved_arrow(ax, ay, bx, by, 16, 16, bend=-30))
            else:
                parts.append(arrow_between(ax, ay, bx, by, 16, 16))
        # Draw nodes
        for nid, (nx, ny, label) in nodes.items():
            if nid in kernel_set:
                parts.append(circle(nx, ny, 16, fill=ACCENT, stroke=ACCENT, sw=2,
                                    fill_class="kernel-fill", stroke_class="accent-stroke"))
                parts.append(text(nx, ny+5, label, 13, weight="bold"))
                parts.append(text(nx, ny-20, "P", 9, color_class="olive", color=OLIVE, weight="bold"))
            else:
                parts.append(circle(nx, ny, 16))
                parts.append(text(nx, ny+5, label, 13))
                parts.append(text(nx, ny-20, "N", 9, color_class="sienna", color=SIENNA, weight="bold"))
        if note:
            parts.append(text(75, 175, note, 9, color_class="sienna", color=SIENNA, style="italic"))
        parts.append("</g>")

    # (a) Not a kernel: stable but not absorbing
    nodes_a = {1: (25,65,"1"), 2: (75,65,"2"), 3: (125,65,"3"),
               4: (25,130,"4"), 5: (75,130,"5"), 6: (125,130,"6")}
    edges_a = [(1,2),(3,6),(4,1),(5,4),(6,5),(2,5)]
    draw_graph(10, 15, "(a) S = {1, 6}", "stable, not absorbing",
               nodes_a, edges_a, {1,6}, "2, 5 cannot reach {1,6}")

    # (b) Not a kernel: absorbing but not stable
    # S={1,2,3}: 1\u21922 breaks stability; 4\u21921, 5\u21923, 6\u21922 ensures absorbing
    nodes_b = {1: (25,65,"1"), 2: (75,65,"2"), 3: (125,65,"3"),
               4: (25,130,"4"), 5: (75,130,"5"), 6: (125,130,"6")}
    edges_b = [(1,2),(4,1),(5,3),(6,2),(4,5)]
    draw_graph(180, 15, "(b) S = {1, 2, 3}", "absorbing, not stable",
               nodes_b, edges_b, {1,2,3}, "arc 1\u21922 : not stable")

    # (c) Kernel K = {2, 6}
    nodes_c = {1: (25,65,"1"), 2: (75,65,"2"), 3: (125,65,"3"),
               4: (25,130,"4"), 5: (75,130,"5"), 6: (125,130,"6")}
    edges_c = [(1,2),(3,6),(4,2),(5,6),(1,4),(3,5)]
    draw_graph(350, 15, "(c) K = {2, 6}", "kernel (stable + absorbing)",
               nodes_c, edges_c, {2,6})

    # (d) Kernel K = {3, 6}
    nodes_d = {1: (25,65,"1"), 2: (75,65,"2"), 3: (125,65,"3"),
               4: (25,130,"4"), 5: (75,130,"5"), 6: (125,130,"6")}
    edges_d = [(1,3),(2,3),(4,6),(5,6),(1,5),(2,4)]
    draw_graph(520, 15, "(d) K = {3, 6}", "kernel (stable + absorbing)",
               nodes_d, edges_d, {3,6})

    # Legend
    parts.append('<g transform="translate(120, 250)">')
    parts.append(circle(0, 0, 9, fill=ACCENT, stroke=ACCENT, sw=1.5,
                        fill_class="kernel-fill", stroke_class="accent-stroke"))
    parts.append(text(15, 4, "Vertex in K (P-position)", 12, anchor="start"))
    parts.append(circle(250, 0, 9))
    parts.append(text(265, 4, "Vertex outside K (N-position)", 12, anchor="start"))
    parts.append("</g>")
    parts.append('<g transform="translate(20, 280)">')
    parts.append(text(0, 0, "Stable: no arc between vertices of K", 11,
                      color_class="txt-sec", color=OLIVE, style="italic", anchor="start"))
    parts.append(text(0, 16, "Absorbing: every vertex outside K has a successor in K", 11,
                      color_class="txt-sec", color=OLIVE, style="italic", anchor="start"))
    parts.append(text(0, 32, "Kernel = stable + absorbing = set of P-positions", 11,
                      color_class="txt-sec", color=OLIVE, style="italic", anchor="start"))
    parts.append("</g>")
    parts.append(svg_footer())
    write_svg("kernel_examples.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. nim_linear_graph.svg — Restricted Nim graph with Grundy values
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_nim_linear_graph():
    W, H = 750, 280
    parts = [svg_header(W, H)]
    parts.append(text(375, 22, "Restricted Nim (remove 1, 2, or 3 tokens)", 15, weight="bold"))

    n_nodes = 9  # 0..8 — enough to show the pattern
    spacing = 80
    start_x = 700
    cy = 100
    r = 20

    node_xs = [start_x - i * spacing for i in range(n_nodes)]

    # Arrows: from position n to n-k (remove k tokens).
    # node_xs[i] is rightmost for i=0, leftmost for i=8.
    # So arrows go from left (high n) to right (low n).

    # "remove 1": n → n-1 for all n
    for i in range(1, n_nodes):
        parts.append(arrow_between(node_xs[i], cy, node_xs[i-1], cy, r, r, sw=1.5))

    # "remove 2": representative arcs (curves above the line)
    for i in [3, 5, 7]:
        j = i - 2
        if j >= 0:
            parts.append(curved_arrow(node_xs[i], cy, node_xs[j], cy, r, r,
                                      bend=35, sw=1.2, stroke=OLIVE,
                                      stroke_class="olive-stroke", opacity=0.6,
                                      marker="arr-olive"))

    # "remove 3": representative arcs (wider curves above)
    for i in [4, 7]:
        j = i - 3
        if j >= 0:
            parts.append(curved_arrow(node_xs[i], cy, node_xs[j], cy, r, r,
                                      bend=55, sw=1.0, stroke=SIENNA,
                                      stroke_class="sienna-stroke", opacity=0.45,
                                      marker="arr-sienna"))

    # Draw nodes with Grundy values
    kernel = {0, 4, 8}
    for i in range(n_nodes):
        x = node_xs[i]
        label = str(i)
        grundy = i % 4
        if i in kernel:
            parts.append(circle(x, cy, r, fill=ACCENT, stroke=ACCENT, sw=2.5,
                                fill_class="kernel-fill", stroke_class="accent-stroke"))
            parts.append(text(x, cy+5, label, 16, weight="bold"))
        else:
            parts.append(circle(x, cy, r))
            parts.append(text(x, cy+5, label, 16))
        parts.append(text(x, cy+38, f"\u03b3 = {grundy}", 11, color_class="txt-sec", color=OLIVE))

    parts.append(text(375, 175, "K = {0, 4, 8}", 16, color_class="accent", color=ACCENT, weight="bold"))
    parts.append(text(375, 196, "P-positions (losing): multiples of p+1 = 4  |  \u03b3(n) = n mod 4", 12,
                      color_class="txt-sec", color=OLIVE, style="italic"))

    # Legend
    parts.append('<g transform="translate(150, 235)">')
    parts.append(line(0, 0, 25, 0, marker="arr", sw=1.5))
    parts.append(text(32, 4, "remove 1", 11, anchor="start"))
    parts.append(line(130, 0, 155, 0, stroke=OLIVE, sw=1.2, stroke_class="olive-stroke", opacity=0.6))
    parts.append(text(162, 4, "remove 2", 11, color_class="olive", color=OLIVE, anchor="start"))
    parts.append(line(260, 0, 285, 0, stroke=SIENNA, sw=1.0, stroke_class="sienna-stroke", opacity=0.45))
    parts.append(text(292, 4, "remove 3", 11, color_class="sienna", color=SIENNA, anchor="start"))
    parts.append("</g>")
    parts.append(text(375, 270, "Representative arcs shown — every node n can move to n\u22121, n\u22122, n\u22123", 10,
                      color_class="txt-sec", color=OLIVE, style="italic"))
    parts.append(svg_footer())
    write_svg("nim_linear_graph.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. grundy_values.svg — Game DAG with Grundy values
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_grundy_values():
    W, H = 580, 370
    parts = [svg_header(W, H)]
    parts.append(text(290, 22, "Grundy values on a game DAG", 15, weight="bold"))

    nodes = {
        "A": (140, 60, 2), "B": (420, 60, 1),
        "C": (80, 155, 1), "D": (280, 155, 0), "E": (460, 155, 2),
        "F": (160, 255, 0), "G": (380, 255, 1),
        "H": (280, 330, 0),
    }
    edges = [
        ("A","C"), ("A","D"), ("A","E"),
        ("B","D"), ("B","E"),
        ("C","F"), ("C","G"),
        ("D","H"),
        ("E","F"), ("E","H"),
        ("F","H"), ("G","H"),
    ]
    r = 18

    # Draw edges
    for (a, b) in edges:
        ax, ay, _ = nodes[a]
        bx, by, _ = nodes[b]
        parts.append(arrow_between(ax, ay, bx, by, r, r))

    # Draw nodes
    for nid, (nx, ny, gv) in nodes.items():
        if gv == 0:
            parts.append(circle(nx, ny, r, fill=OLIVE, stroke=OLIVE, sw=2,
                                fill_class="olive-bg", stroke_class="olive-stroke", opacity=0.2))
            gcls, gclr = "olive", OLIVE
        else:
            parts.append(circle(nx, ny, r, fill=SIENNA, stroke=SIENNA, sw=2,
                                fill_class="sienna-bg", stroke_class="sienna-stroke", opacity=0.2))
            gcls, gclr = "sienna", SIENNA
        parts.append(text(nx, ny+5, nid, 14, weight="bold"))
        parts.append(text(nx+24, ny-4, f"\u03b3 = {gv}", 12, color_class=gcls, color=gclr,
                          weight="bold", anchor="start"))
        if nid == "H":
            parts.append(text(nx+24, ny+13, "(terminal)", 10, color_class="txt-sec",
                              color=OLIVE, style="italic", anchor="start"))

    parts.append(svg_footer())
    write_svg("grundy_values.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. nim_game_tree.svg — Nim(m+1) partial game tree
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_nim_game_tree():
    W, H = 560, 250
    parts = [svg_header(W, H)]

    # Root node m+1
    root = (280, 50)
    children = [(70, 175, "m", "remove 1"), (180, 175, "m\u22121", "remove 2"),
                (390, 175, "1", f"remove m"), (500, 175, "0", f"remove m+1")]
    r_root = 24
    r_child = 20

    # Edges
    for i, (cx, cy, _, _) in enumerate(children):
        if i < 3:
            parts.append(arrow_between(root[0], root[1], cx, cy, r_root, r_child))
        else:
            parts.append(arrow_between(root[0], root[1], cx, cy, r_root, r_child))
    # Dotted edge for "..."
    parts.append(line(280, 74, 280, 155, dash="4,3", stroke_class="line"))

    parts.append(text(280, 178, "\u22ef", 22, color_class="txt-sec", color=OLIVE))

    # Root
    parts.append(circle(root[0], root[1], r_root, fill=ACCENT, stroke=ACCENT, sw=2,
                         fill_class="accent-bg", stroke_class="accent-stroke", opacity=0.15))
    parts.append(text(root[0], root[1]+5, "m+1", 15, weight="bold", style="italic"))
    parts.append(text(root[0], root[1]-30, "\u03b3 = m+1", 11, color_class="accent", color=ACCENT, weight="bold"))

    # Children
    for cx, cy, label, action in children:
        gv = {"m": "m", "m\u22121": "m\u22121", "1": "1", "0": "0"}[label]
        if label == "0":
            parts.append(circle(cx, cy, r_child, fill=OLIVE, stroke=OLIVE, sw=2,
                                fill_class="olive-bg", stroke_class="olive-stroke"))
        else:
            parts.append(circle(cx, cy, r_child, sw=1.8))
        parts.append(text(cx, cy+5, label, 14))
        parts.append(text(cx, cy+38, action, 11, color_class="txt-sec", color=OLIVE))
        parts.append(text(cx, cy-26, f"\u03b3 = {gv}", 10, color_class="txt-sec", color=OLIVE))

    parts.append(text(280, 242, "Succ(m+1) = {0, 1, 2, ..., m}", 13, style="italic"))
    parts.append(svg_footer())
    write_svg("nim_game_tree.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. successor_sum.svg — Sum of games successor visualization
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_successor_sum():
    W, H = 560, 280
    parts = [svg_header(W, H)]
    parts.append(text(280, 22, "Successors in the sum G\u2081 + G\u2082", 15, weight="bold"))

    root = (280, 80)
    r_root = 26
    r_child = 22

    # Root
    parts.append(circle(root[0], root[1], r_root, fill=ACCENT, stroke=TEXT, sw=2,
                         fill_class="accent-bg", stroke_class="node-stroke", opacity=0.1))
    parts.append(text(root[0], root[1]+5, "(y\u2081, y\u2082)", 15, weight="bold"))

    # Left children (move in G1)
    left = [(100, 200, "(z\u2081, y\u2082)"), (210, 210, "(z'\u2081, y\u2082)")]
    for cx, cy, label in left:
        parts.append(arrow_between(root[0], root[1], cx, cy, r_root, r_child,
                                   marker="arr-accent", stroke=ACCENT, sw=2,
                                   stroke_class="accent-stroke"))
        parts.append(circle(cx, cy, r_child, stroke=ACCENT, sw=1.8,
                            stroke_class="accent-stroke"))
        parts.append(text(cx, cy+5, label, 12))
    parts.append(text(80, 150, "move in G\u2081", 13, color_class="accent",
                      color=ACCENT, weight="bold", anchor="start"))

    # Right children (move in G2)
    right = [(460, 200, "(y\u2081, z\u2082)"), (350, 210, "(y\u2081, z'\u2082)")]
    for cx, cy, label in right:
        parts.append(arrow_between(root[0], root[1], cx, cy, r_root, r_child,
                                   marker="arr-olive", stroke=OLIVE, sw=2,
                                   stroke_class="olive-stroke"))
        parts.append(circle(cx, cy, r_child, stroke=OLIVE, sw=1.8,
                            stroke_class="olive-stroke"))
        parts.append(text(cx, cy+5, label, 12))
    parts.append(text(475, 150, "move in G\u2082", 13, color_class="olive",
                      color=OLIVE, weight="bold", anchor="start"))

    parts.append(text(280, 265, "Succ(y\u2081, y\u2082) = { (z\u2081, y\u2082) : z\u2081 \u2208 Succ(y\u2081) } \u222a { (y\u2081, z\u2082) : z\u2082 \u2208 Succ(y\u2082) }",
                      13, style="italic"))
    parts.append(svg_footer())
    write_svg("successor_sum.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. nim_gameplay_steps.svg — Step-by-step Nim game from (1,3,5)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_nim_gameplay_steps():
    W, H = 850, 340
    parts = [svg_header(W, H)]
    parts.append(text(425, 22, "Playing out a Nim game from (1, 3, 5)", 15, weight="bold"))

    steps = [
        ("Start: (1, 3, 5)", [[0,0,1],[0,1,1],[1,0,1]], [1,1,1], 7, None),
        ("P1: (1, 3, 5)\u2192(1, 3, 2)", [[0,0,1],[0,1,1],[0,1,0]], [0,0,0], 0,
         "P1 reduces heap 3: 5\u21922"),
        ("P2: (1, 3, 2)\u2192(1, 2, 2)", [[0,0,1],[0,1,0],[0,1,0]], [0,0,1], 1,
         "P2 reduces heap 2: 3\u21922"),
        ("P1: (1, 2, 2)\u2192(0, 2, 2)", [[0,0,0],[0,1,0],[0,1,0]], [0,0,0], 0,
         "P1 removes heap 1: 1\u21920"),
    ]

    panel_w = 190
    gap = 15
    start_x = 30

    for idx, (title, matrix, xor_row, xor_val, move) in enumerate(steps):
        ox = start_x + idx * (panel_w + gap)
        parts.append(f'<g transform="translate({ox}, 35)">')

        # Panel background
        parts.append(rect(-5, -5, panel_w, 290, fill=BG, rx=6,
                          fill_class="highlight-bg" if idx % 2 == 0 else "node-fill",
                          opacity=0.05 if idx % 2 == 0 else 0))

        # Title
        color_cls = "accent" if xor_val == 0 else "sienna"
        color = ACCENT if xor_val == 0 else SIENNA
        parts.append(text(panel_w//2, 10, title, 11, weight="bold", color_class=color_cls, color=color))

        if move:
            parts.append(text(panel_w//2, 26, move, 9, color_class="txt-sec", color=OLIVE, style="italic"))

        # Mini matrix
        my = 50
        cell = 35
        headers = ["2\u00b2", "2\u00b9", "2\u2070"]
        heap_labels = ["n\u2081", "n\u2082", "n\u2083"]
        for j, h in enumerate(headers):
            parts.append(text(55 + j*cell, my, h, 10, color_class="txt-sec", color=OLIVE))
        for r in range(3):
            parts.append(text(25, my+18+r*28, heap_labels[r], 10, color_class="txt-sec",
                              color=OLIVE, anchor="end"))
            for c in range(3):
                val = matrix[r][c]
                x = 55 + c * cell
                y = my + 18 + r * 28
                cls = "accent" if val == 1 else "txt"
                clr = ACCENT if val == 1 else TEXT
                w = "bold" if val == 1 else "normal"
                parts.append(text(x, y, str(val), 16, color_class=cls, color=clr, weight=w))

        # XOR row
        xor_y = my + 18 + 3*28
        parts.append(line(35, xor_y - 15, 155, xor_y - 15, sw=1.5))
        parts.append(text(25, xor_y, "\u2295", 11, color_class="accent", color=ACCENT,
                          weight="bold", anchor="end"))
        for c in range(3):
            v = xor_row[c]
            parts.append(text(55 + c*cell, xor_y, str(v), 16, color_class="accent",
                              color=ACCENT, weight="bold"))
        parts.append(text(160, xor_y, f"= {xor_val}", 12, color_class="accent",
                          color=ACCENT, weight="bold", anchor="start"))

        # Status
        status_y = xor_y + 30
        if xor_val == 0:
            parts.append(text(panel_w//2, status_y, "P-position (\u2718)", 11,
                              color_class="olive", color=OLIVE, weight="bold"))
        else:
            parts.append(text(panel_w//2, status_y, "N-position (\u2714)", 11,
                              color_class="sienna", color=SIENNA, weight="bold"))

        parts.append("</g>")

        # Arrow between panels
        if idx < len(steps) - 1:
            ax = ox + panel_w + 2
            parts.append(text(ax + gap//2, 180, "\u2192", 20, color_class="txt-sec", color=OLIVE))

    parts.append(svg_footer())
    write_svg("nim_gameplay_steps.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 9. grundy_computation.svg — Worked Grundy computation on 6-node DAG
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_grundy_computation():
    W, H = 620, 500
    parts = [svg_header(W, H)]
    parts.append(text(310, 22, "Computing Grundy values bottom-up", 15, weight="bold"))

    # 6-node DAG:  0<-1, 0<-2, 1<-3, 2<-3, 1<-4, 3<-4, 0<-5, 4<-5
    # node 0: terminal, gamma=0
    # node 1: Succ={0}, gamma = mex{0} = 1
    # node 2: Succ={0}, gamma = mex{0} = 1
    # node 3: Succ={1,2}, gamma = mex{1,1} = mex{1} = 0
    # node 4: Succ={1,3}, gamma = mex{1,0} = 2
    # node 5: Succ={0,4}, gamma = mex{0,2} = 1
    nodes = {
        0: (310, 320, 0), 1: (160, 225, 1), 2: (460, 225, 1),
        3: (310, 145, 0), 4: (110, 70, 2), 5: (510, 70, 1),
    }
    edges = [(1,0),(2,0),(3,1),(3,2),(4,1),(4,3),(5,0),(5,4)]
    r = 22

    mex_correct = {
        0: "terminal \u21d2 \u03b3 = 0",
        1: "mex{\u03b3(0)} = mex{0} = 1",
        2: "mex{\u03b3(0)} = mex{0} = 1",
        3: "mex{\u03b3(1),\u03b3(2)} = mex{1} = 0",
        4: "mex{\u03b3(1),\u03b3(3)} = mex{1,0} = 2",
        5: "mex{\u03b3(0),\u03b3(4)} = mex{0,2} = 1",
    }
    order = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6}

    # Draw edges
    for (a, b) in edges:
        ax, ay, _ = nodes[a]
        bx, by, _ = nodes[b]
        parts.append(arrow_between(ax, ay, bx, by, r, r))

    # Draw nodes
    for nid in sorted(nodes.keys()):
        nx, ny, gv = nodes[nid]
        if gv == 0:
            parts.append(circle(nx, ny, r, fill=OLIVE, stroke=OLIVE, sw=2,
                                fill_class="olive-bg", stroke_class="olive-stroke", opacity=0.2))
            gcls, gclr = "olive", OLIVE
        else:
            parts.append(circle(nx, ny, r, fill=SIENNA, stroke=SIENNA, sw=2,
                                fill_class="sienna-bg", stroke_class="sienna-stroke", opacity=0.2))
            gcls, gclr = "sienna", SIENNA
        parts.append(text(nx, ny+5, str(nid), 15, weight="bold"))
        parts.append(text(nx, ny-28, f"\u03b3 = {gv}", 12, color_class=gcls,
                          color=gclr, weight="bold"))
        # Order badge
        parts.append(circle(nx+r+4, ny-r-4, 8, fill=ACCENT, stroke="none", sw=0,
                            fill_class="accent", stroke_class=""))
        parts.append(text(nx+r+4, ny-r-1, str(order[nid]), 8, color_class="bg",
                          color=BG, weight="bold"))

    # Mex annotations BELOW the graph
    ann_x = 40
    ann_y = 375
    parts.append(line(40, ann_y - 12, 580, ann_y - 12, sw=0.5, stroke_class="line-light", opacity=0.3))
    parts.append(text(ann_x, ann_y, "Computation order:", 12, weight="bold", anchor="start"))
    for nid in range(6):
        y = ann_y + 20 + nid * 17
        parts.append(text(ann_x, y, f"{order[nid]}. node {nid}: {mex_correct[nid]}", 10,
                          color_class="txt-sec", color=OLIVE, anchor="start",
                          font="'JetBrains Mono', monospace"))

    parts.append(svg_footer())
    write_svg("grundy_computation.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 10. winning_move_strategy.svg — Winning move from (1,3,5,5)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_winning_move_strategy():
    W, H = 700, 360
    parts = [svg_header(W, H)]
    parts.append(text(350, 22, "Winning move algorithm: (1, 3, 5, 5) with k = 2", 15, weight="bold"))

    # Step 1: Show binary decomposition
    parts.append('<g transform="translate(30, 45)">')
    parts.append(text(0, 0, "Step 1: Binary decomposition", 12, weight="bold", anchor="start"))

    cell = 35
    headers = ["2\u00b2", "2\u00b9", "2\u2070"]
    heap_vals = [1, 3, 5, 5]
    binary = [[0,0,1],[0,1,1],[1,0,1],[1,0,1]]

    for j, h in enumerate(headers):
        parts.append(text(80 + j*cell, 25, h, 10, color_class="txt-sec", color=OLIVE))
    for r in range(4):
        parts.append(text(35, 45+r*24, f"n{r+1}={heap_vals[r]}", 10, color_class="txt-sec",
                          color=OLIVE, anchor="start", font="'JetBrains Mono', monospace"))
        for c in range(3):
            val = binary[r][c]
            x = 80 + c * cell
            y = 45 + r * 24
            # Highlight column v=1 (middle column)
            if c == 1:
                cls = "accent" if val == 1 else "txt"
                clr = ACCENT if val == 1 else TEXT
                w = "bold"
            else:
                cls = "accent" if val == 1 else "txt"
                clr = ACCENT if val == 1 else TEXT
                w = "bold" if val == 1 else "normal"
            parts.append(text(x, y, str(val), 14, color_class=cls, color=clr, weight=w))
    # XOR
    xor_y = 45 + 4*24
    parts.append(line(60, xor_y-12, 185, xor_y-12, sw=1.5))
    parts.append(text(45, xor_y, "\u2295", 10, color_class="accent", color=ACCENT, weight="bold"))
    xor_vals = [0, 1, 0]
    for c in range(3):
        parts.append(text(80 + c*cell, xor_y, str(xor_vals[c]), 14,
                          color_class="accent", color=ACCENT, weight="bold"))
    parts.append(text(195, xor_y, "= k = 2 = 010\u2082", 11, color_class="accent",
                      color=ACCENT, weight="bold", anchor="start"))

    # Highlight column v=1
    parts.append(rect(63, 13, cell, 130, fill=ACCENT, rx=2, fill_class="xor-bg", opacity=0.08))
    parts.append(text(80, 170, "\u2191 v=1", 9, color_class="accent", color=ACCENT, weight="bold"))
    parts.append("</g>")

    # Step 2: Find heap with bit at position v
    parts.append('<g transform="translate(260, 45)">')
    parts.append(text(0, 0, "Step 2: Find heap with bit v=1", 12, weight="bold", anchor="start"))
    checks = [
        ("n\u2081 = 1 = 001\u2082", "bit 1 = 0", False),
        ("n\u2082 = 3 = 011\u2082", "bit 1 = 1 \u2714", True),
        ("n\u2083 = 5 = 101\u2082", "bit 1 = 0", False),
        ("n\u2084 = 5 = 101\u2082", "bit 1 = 0", False),
    ]
    for i, (heap_str, check, found) in enumerate(checks):
        y = 25 + i * 22
        cls = "accent" if found else "txt-sec"
        clr = ACCENT if found else OLIVE
        w = "bold" if found else "normal"
        parts.append(text(10, y, f"{heap_str}  {check}", 11, color_class=cls, color=clr,
                          weight=w, anchor="start", font="'JetBrains Mono', monospace"))
    parts.append(text(10, 120, "\u21d2 Choose heap 2 (n\u2082 = 3)", 11,
                      color_class="accent", color=ACCENT, weight="bold", anchor="start"))
    parts.append("</g>")

    # Step 3: Compute new value
    parts.append('<g transform="translate(260, 195)">')
    parts.append(text(0, 0, "Step 3: Compute winning move", 12, weight="bold", anchor="start"))
    lines_text = [
        "n\u2082* = n\u2082 \u2295 k = 3 \u2295 2",
        "     = 011\u2082 \u2295 010\u2082 = 001\u2082 = 1",
        "Verify: 1 < 3  \u2714",
        "Remove 2 tokens from heap 2",
    ]
    for i, lt in enumerate(lines_text):
        y = 25 + i * 20
        parts.append(text(10, y, lt, 11, color_class="txt-sec", color=OLIVE,
                          anchor="start", font="'JetBrains Mono', monospace"))
    parts.append("</g>")

    # Step 4: Result
    parts.append('<g transform="translate(30, 240)">')
    parts.append(text(0, 0, "Result:", 12, weight="bold", anchor="start"))

    # Before arrow After
    parts.append(rect(5, 10, 180, 50, fill=SIENNA, rx=6, fill_class="sienna-bg", opacity=0.1))
    parts.append(text(95, 30, "(1, 3, 5, 5)", 15, weight="bold"))
    parts.append(text(95, 50, "nim-sum = 2 \u2260 0", 11, color_class="sienna", color=SIENNA))

    parts.append(text(205, 40, "\u2192", 20, color_class="txt-sec", color=OLIVE))

    parts.append(rect(220, 10, 180, 50, fill=OLIVE, rx=6, fill_class="olive-bg", opacity=0.1))
    parts.append(text(310, 30, "(1, 1, 5, 5)", 15, weight="bold"))
    parts.append(text(310, 50, "nim-sum = 0  \u2714", 11, color_class="olive", color=OLIVE))
    parts.append("</g>")

    # Bottom note
    parts.append(text(350, 345, "The opponent is now in a P-position (losing with perfect play)", 12,
                      color_class="txt-sec", color=OLIVE, style="italic"))

    parts.append(svg_footer())
    write_svg("winning_move_strategy.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 11. formal_setup.svg — P/N position game tree
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_formal_setup():
    """Small game tree illustrating the recursive P/N classification."""
    W, H = 620, 380
    parts = [svg_header(W, H)]
    parts.append(text(310, 22, "Recursive classification of positions", 15, weight="bold"))

    # Tree structure:
    #         A (N)
    #        / \
    #      B(P)  C(N)
    #     / \    |
    #   D(N) E(N) F(P)
    #   |       |
    #   G(P)    H(P)
    #   (term)  (term)

    r = 20
    nodes_pos = {
        "A": (310, 70),
        "B": (170, 155), "C": (450, 155),
        "D": (100, 245), "E": (240, 245), "F": (450, 245),
        "G": (100, 320), "H": (240, 320),
    }
    # P or N
    pn = {"A": "N", "B": "P", "C": "N", "D": "N", "E": "N", "F": "P", "G": "P", "H": "P"}
    # Terminal nodes
    terminal = {"G", "H", "F"}
    edges = [("A","B"), ("A","C"), ("B","D"), ("B","E"), ("C","F"), ("D","G"), ("E","H")]

    # Draw edges
    for (a, b) in edges:
        ax, ay = nodes_pos[a]
        bx, by = nodes_pos[b]
        parts.append(arrow_between(ax, ay, bx, by, r, r))

    # Draw nodes
    for nid, (nx, ny) in nodes_pos.items():
        is_p = pn[nid] == "P"
        is_term = nid in terminal
        if is_p:
            parts.append(circle(nx, ny, r, fill=OLIVE, stroke=OLIVE, sw=2.5,
                                fill_class="olive-bg", stroke_class="olive-stroke", opacity=0.2))
            parts.append(text(nx, ny+5, nid, 15, weight="bold"))
            label_text = "P" if not is_term else "P (term.)"
            parts.append(text(nx + r + 6, ny + 5, label_text, 11,
                              color_class="olive", color=OLIVE, weight="bold", anchor="start"))
        else:
            parts.append(circle(nx, ny, r, fill=SIENNA, stroke=SIENNA, sw=2.5,
                                fill_class="sienna-bg", stroke_class="sienna-stroke", opacity=0.2))
            parts.append(text(nx, ny+5, nid, 15, weight="bold"))
            parts.append(text(nx + r + 6, ny + 5, "N", 11,
                              color_class="sienna", color=SIENNA, weight="bold", anchor="start"))

    # Annotations on the right
    ann_x = 510
    ann_y = 70
    parts.append(text(ann_x, ann_y, "Rules:", 12, weight="bold", anchor="start"))
    P_SYM = "\U0001D4AB"  # 𝒫
    N_SYM = "\U0001D4A9"  # 𝒩
    rules = [
        f"Terminal \u21d2 {P_SYM} (no move)",
        f"\u2203 child \u2208 {P_SYM} \u21d2 {N_SYM}",
        f"\u2200 children \u2208 {N_SYM} \u21d2 {P_SYM}",
    ]
    for i, rule in enumerate(rules):
        parts.append(text(ann_x, ann_y + 20 + i * 18, rule, 11,
                          color_class="txt-sec", color=OLIVE, anchor="start"))

    # Legend at bottom left
    parts.append('<g transform="translate(50, 365)">')
    parts.append(circle(0, 0, 8, fill=OLIVE, stroke=OLIVE, sw=1.5,
                        fill_class="olive-bg", stroke_class="olive-stroke", opacity=0.2))
    parts.append(text(14, 4, f"{P_SYM}-position (previous player wins)", 11, anchor="start"))
    parts.append(circle(280, 0, 8, fill=SIENNA, stroke=SIENNA, sw=1.5,
                        fill_class="sienna-bg", stroke_class="sienna-stroke", opacity=0.2))
    parts.append(text(294, 4, f"{N_SYM}-position (next player wins)", 11, anchor="start"))
    parts.append("</g>")

    parts.append(svg_footer())
    write_svg("formal_setup.svg", "\n".join(parts))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Generating CGT SVGs...")
    gen_nim_heaps()
    gen_binary_matrix()
    gen_kernel_examples()
    gen_nim_linear_graph()
    gen_grundy_values()
    gen_nim_game_tree()
    gen_successor_sum()
    gen_nim_gameplay_steps()
    gen_grundy_computation()
    gen_winning_move_strategy()
    gen_formal_setup()
    print("Done! 11 SVGs generated.")
