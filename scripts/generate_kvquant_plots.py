#!/usr/bin/env python3
"""Generate SVG figures for the KVQuant / vector quantization article.

Produces 3 publication-quality matplotlib SVGs:
  1. polar_angle_concentration.svg  -- PolarQuant angle densities
  2. beta_distribution_coordinates.svg -- coordinate density on the sphere
  3. distortion_rate_comparison.svg -- MSE distortion vs bit-width

All outputs land in ../static/images/kvquant/.
"""

import os
import numpy as np
import matplotlib
matplotlib.use("Agg")                       # headless backend
import matplotlib.pyplot as plt
from scipy.special import gamma, gammaln

# ── Output directory ───────────────────────────────────────────
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "images", "kvquant")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Palette ────────────────────────────────────────────────────
ACCENT  = "#D4A843"
OLIVE   = "#8B9A6B"
SIENNA  = "#C97A50"
TEXT    = "#2C2418"
BLUE    = "#4878d0"
GRAY    = "#888888"

# ── Global rcParams for publication quality ────────────────────
plt.rcParams.update({
    "font.family":       "serif",
    "font.serif":        ["Georgia"],
    "font.size":         11,
    "axes.labelsize":    12,
    "axes.titlesize":    13,
    "legend.fontsize":   10,
    "xtick.labelsize":   10,
    "ytick.labelsize":   10,
    "axes.edgecolor":    TEXT,
    "axes.labelcolor":   TEXT,
    "xtick.color":       TEXT,
    "ytick.color":       TEXT,
    "text.color":        TEXT,
    "legend.framealpha":  0.0,
    "legend.edgecolor":  "none",
    "axes.spines.top":   False,
    "axes.spines.right": False,
    "axes.linewidth":    0.8,
    "xtick.major.width": 0.8,
    "ytick.major.width": 0.8,
    "lines.linewidth":   1.8,
    "savefig.transparent": True,
})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Plot 1 -- Polar Angle Densities
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def polar_angle_density(psi, ell):
    """
    f_ell(psi) = Gamma(2^{ell-1}) / (2^{2^{ell-1}-2} * Gamma(2^{ell-2})^2)
                 * sin^{2^{ell-1}-1}(2*psi)
    for psi in [0, pi/2].
    """
    n = 2 ** (ell - 1)          # exponent parameter
    m = 2 ** (ell - 2)          # half-parameter
    coeff = gamma(n) / (2.0 ** (n - 2) * gamma(m) ** 2)
    return coeff * np.sin(2.0 * psi) ** (n - 1)


def gen_polar_angle_concentration():
    psi = np.linspace(1e-8, np.pi / 2 - 1e-8, 2000)

    colors = {2: ACCENT, 3: OLIVE, 4: SIENNA, 5: BLUE}

    fig, ax = plt.subplots(figsize=(5.5, 3.5), constrained_layout=True)

    for ell in [2, 3, 4, 5]:
        y = polar_angle_density(psi, ell)
        ax.plot(psi, y, color=colors[ell], label=rf"$\ell = {ell}$")

    # Vertical dashed line at pi/4
    ax.axvline(np.pi / 4, color=GRAY, ls="--", lw=0.9, zorder=0)

    ax.set_xlim(0, np.pi / 2)
    ax.set_ylim(bottom=0)
    ax.set_xlabel(r"$\psi$")
    ax.set_ylabel(r"$f_\ell(\psi)$")

    # Custom x-ticks
    ax.set_xticks([0, np.pi / 8, np.pi / 4, 3 * np.pi / 8, np.pi / 2])
    ax.set_xticklabels(["0", r"$\pi/8$", r"$\pi/4$", r"$3\pi/8$", r"$\pi/2$"])

    ax.legend(loc="upper right")

    out = os.path.join(OUT_DIR, "polar_angle_concentration.svg")
    fig.savefig(out, format="svg")
    plt.close(fig)
    print(f"  wrote {out}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Plot 2 -- Beta Distribution of Coordinates
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def coord_density(x, d):
    """
    f_X(x) = Gamma(d/2) / (sqrt(pi) * Gamma((d-1)/2)) * (1 - x^2)^{(d-3)/2}
    for x in [-1, 1].

    Uses log-gamma to avoid overflow for large d (e.g. d=512).
    """
    log_coeff = gammaln(d / 2.0) - 0.5 * np.log(np.pi) - gammaln((d - 1) / 2.0)
    exponent = (d - 3) / 2.0
    # Compute in log-space to handle large exponents gracefully
    val = 1.0 - x ** 2
    # Clip to avoid log(0) at boundaries
    val = np.clip(val, 1e-300, None)
    return np.exp(log_coeff + exponent * np.log(val))


def gen_beta_distribution_coordinates():
    x = np.linspace(-0.6, 0.6, 2000)

    dims = [8, 32, 128, 512]
    colors_d = {8: ACCENT, 32: OLIVE, 128: SIENNA, 512: BLUE}

    fig, ax = plt.subplots(figsize=(5.5, 3.5), constrained_layout=True)

    for d in dims:
        y = coord_density(x, d)
        ax.plot(x, y, color=colors_d[d], label=rf"$d = {d}$")

    # Gaussian overlay for d=512
    sigma2 = 1.0 / 512.0
    gaussian = (1.0 / np.sqrt(2 * np.pi * sigma2)) * np.exp(-x ** 2 / (2 * sigma2))
    ax.plot(x, gaussian, color=GRAY, ls="--", lw=1.5,
            label=r"$\mathcal{N}(0,\, 1/512)$")

    ax.set_xlim(-0.6, 0.6)
    ax.set_ylim(bottom=0)
    ax.set_xlabel(r"$x$")
    ax.set_ylabel("Density")

    ax.legend(loc="upper right")

    out = os.path.join(OUT_DIR, "beta_distribution_coordinates.svg")
    fig.savefig(out, format="svg")
    plt.close(fig)
    print(f"  wrote {out}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Plot 3 -- Distortion vs Bit-width
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def gen_distortion_rate_comparison():
    b = np.array([1, 2, 3, 4, 5, 6])
    turbo_mse = np.array([0.36, 0.117, 0.030, 0.009, 0.0025, 0.0006])

    b_fine = np.linspace(1, 6, 300)
    upper = np.sqrt(3 * np.pi / 2) * (1.0 / 4.0 ** b_fine)
    lower = 1.0 / 4.0 ** b_fine

    fig, ax = plt.subplots(figsize=(5.5, 3.5), constrained_layout=True)

    # Fill between TurboQuant and lower bound (interpolate TurboQuant for fill)
    turbo_interp = np.interp(b_fine, b, turbo_mse)
    ax.fill_between(b_fine, lower, turbo_interp,
                    color=GRAY, alpha=0.08, zorder=0)

    # TurboQuant numerical
    ax.plot(b, turbo_mse, color=ACCENT, marker="o", markersize=5,
            markeredgecolor=ACCENT, markerfacecolor=ACCENT, zorder=3,
            label="TurboQuant (numerical)")

    # Asymptotic upper bound
    ax.plot(b_fine, upper, color=SIENNA, ls="--", lw=1.5, zorder=2,
            label=r"Upper bound ($\sqrt{3\pi/2}\;\cdot\;4^{-b}$)")

    # Information-theoretic lower bound
    ax.plot(b_fine, lower, color=OLIVE, ls=":", lw=1.5, zorder=2,
            label=r"Lower bound ($4^{-b}$)")

    ax.set_yscale("log")
    ax.set_xlim(1, 6)
    ax.set_xticks(b)
    ax.set_xlabel("Bits per coordinate ($b$)")
    ax.set_ylabel(r"MSE distortion $D_{\mathrm{mse}}$")

    ax.legend(loc="upper right")

    out = os.path.join(OUT_DIR, "distortion_rate_comparison.svg")
    fig.savefig(out, format="svg")
    plt.close(fig)
    print(f"  wrote {out}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    print("Generating KVQuant SVGs...")
    gen_polar_angle_concentration()
    gen_beta_distribution_coordinates()
    gen_distortion_rate_comparison()
    print("Done! 3 SVGs generated.")
