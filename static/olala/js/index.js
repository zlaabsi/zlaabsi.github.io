// Mounts every <figure data-olala="name"> on the page, lazily, the first
// time it approaches the viewport. One module per figure, loaded on demand.

const FIGURES = {
  stack: () => import("./fig-stack.js"),
  placement: () => import("./fig-placement.js"),
  memory: () => import("./fig-memory.js"),
  ssmax: () => import("./fig-ssmax.js"),
  diff: () => import("./fig-diff.js"),
  gate: () => import("./fig-gate.js"),
  tpa: () => import("./fig-tpa.js"),
  moe: () => import("./fig-moe.js"),
  norms: () => import("./fig-norms.js"),
  geonorm: () => import("./fig-geonorm.js"),
  ratchet: () => import("./fig-ratchet.js"),
};

async function mount(fig) {
  const stage = fig.querySelector(".ol-stage");
  const name = fig.dataset.olala;
  if (!stage || stage.dataset.mounted) return;
  stage.dataset.mounted = "1";
  try {
    if (!FIGURES[name]) throw new Error(`unknown figure "${name}"`);
    const mod = await FIGURES[name]();
    stage.classList.remove("is-loading");
    await mod.default(stage, { ...fig.dataset });
  } catch (err) {
    stage.classList.remove("is-loading");
    stage.innerHTML = `<div class="ol-error">This interactive figure could not be loaded (${String(err.message || err)}). The surrounding text describes what it shows.</div>`;
    console.error("[olala]", name, err);
  }
}

function init() {
  const figs = [...document.querySelectorAll("figure[data-olala]")];
  if (!("IntersectionObserver" in window)) return figs.forEach(mount);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          mount(e.target);
        }
      }
    },
    { rootMargin: "600px 0px" }
  );
  figs.forEach((f) => io.observe(f));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
