# Blog Refonte — zlaabsi.github.io

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformer le site portfolio statique en un blog scientifique Hugo + PaperMod, esthétique chaleureuse crème/anthracite, prêt pour des articles denses avec LaTeX, code, diagrammes et citations BibTeX.

**Architecture:** Hugo static site generator avec le thème PaperMod, customisé via CSS/layouts overrides. Déployé sur GitHub Pages via GitHub Actions. Contenu en Markdown avec support KaTeX, Mermaid, syntax highlighting.

**Tech Stack:** Hugo (extended), PaperMod theme, KaTeX, Mermaid, Fuse.js (search), GitHub Actions

**Référence design:** `BRIEF_CLAUDE_CODE_BLOG_REFONTE.md` (à la racine du repo)

---

## Task 1: Archiver le site existant

**But:** Compresser tout le contenu actuel dans une archive hors du site.

**Files:**
- Create: `_archive/legacy-site-2024.tar.gz`

**Step 1: Créer l'archive**

```bash
cd /Users/zlaabsi/Documents/GitHub/zlaabsi.github.io
mkdir -p _archive
tar -czf _archive/legacy-site-2024.tar.gz \
  index.html 404.html assets/ \
  CV_Zakaria_Laabsi_ENGFR.pdf \
  LAABSI_Zakaria_Resume_2024.pdf \
  README.md LICENSE
```

**Step 2: Supprimer les fichiers originaux**

```bash
rm -rf index.html 404.html assets/ \
  CV_Zakaria_Laabsi_ENGFR.pdf \
  LAABSI_Zakaria_Resume_2024.pdf \
  README.md LICENSE
```

**Step 3: Commit**

```bash
git add -A
git commit -m "archive: compress legacy portfolio site into _archive/"
```

---

## Task 2: Installer Hugo et initialiser le projet

**But:** Installer Hugo extended et créer la structure de base du site Hugo.

**Prérequis:** Homebrew doit être installé. Si non disponible, installer via `curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash`

**Step 1: Installer Hugo**

```bash
brew install hugo
hugo version  # Vérifier >= v0.112.4
```

**Step 2: Initialiser le site Hugo dans le repo existant**

Hugo nécessite un nouveau site. On va initialiser dans un dossier temporaire puis déplacer les fichiers.

```bash
cd /Users/zlaabsi/Documents/GitHub/zlaabsi.github.io
hugo new site . --force --format yaml
```

Cela crée la structure Hugo :
```
hugo.yaml
archetypes/
content/
data/
i18n/
layouts/
static/
themes/
```

**Step 3: Ajouter PaperMod comme git submodule**

```bash
git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize Hugo site with PaperMod theme submodule"
```

---

## Task 3: Configuration Hugo de base

**But:** Configurer hugo.yaml avec les paramètres du brief.

**Files:**
- Modify: `hugo.yaml`

**Step 1: Écrire la configuration complète**

```yaml
baseURL: "https://zlaabsi.github.io/"
languageCode: en-us
title: "Zakaria Laabsi"
paginate: 10
theme: PaperMod

enableRobotsTXT: true
buildDrafts: false
buildFuture: false
buildExpired: false

minify:
  disableXML: true
  minifyOutput: true

outputs:
  home:
    - HTML
    - RSS
    - JSON

params:
  env: production
  title: "Zakaria Laabsi"
  description: "Deep-dives on post-quantum cryptography, reasoning models, reinforcement learning, and applied mathematics."
  author: "Zakaria Laabsi"
  defaultTheme: light
  disableThemeToggle: false
  ShowReadingTime: true
  ShowShareButtons: false
  ShowPostNavLinks: true
  ShowBreadCrumbs: true
  ShowCodeCopyButtons: true
  ShowWordCount: false
  ShowRssButtonInSectionTermList: true
  UseHugoToc: true
  disableSpecial1stPost: false
  disableScrollToTop: false
  hidemeta: false
  hideSummary: false
  showtoc: true
  tocopen: true

  homeInfoParams:
    Title: "Zakaria Laabsi"
    Content: "Notes on AI, cryptography & mathematics"

  socialIcons:
    - name: github
      url: "https://github.com/zlaabsi"
    - name: x
      url: "https://x.com/ZakShark"
    - name: email
      url: "mailto:zakaria.laabsi@gmail.com"
    - name: rss
      url: "/index.xml"

  fuseOpts:
    isCaseSensitive: false
    shouldSort: true
    location: 0
    distance: 1000
    threshold: 0.4
    minMatchCharLength: 0
    keys: ["title", "permalink", "summary", "content"]

  assets:
    favicon: "/favicon.ico"
    disableFingerprinting: false

markup:
  goldmark:
    renderer:
      unsafe: true
  highlight:
    noClasses: false
    style: dracula

menu:
  main:
    - identifier: posts
      name: Posts
      url: /posts/
      weight: 10
    - identifier: projects
      name: Projects
      url: /projects/
      weight: 20
    - identifier: about
      name: About
      url: /about/
      weight: 30
    - identifier: tags
      name: Tags
      url: /tags/
      weight: 40
    - identifier: archives
      name: Archives
      url: /archives/
      weight: 50
    - identifier: search
      name: Search
      url: /search/
      weight: 60
```

**Step 2: Vérifier que Hugo compile**

```bash
hugo server -D
# Ouvrir http://localhost:1313 — doit afficher PaperMod par défaut
```

Arrêter le serveur (Ctrl+C).

**Step 3: Commit**

```bash
git add hugo.yaml
git commit -m "feat: configure Hugo with PaperMod theme settings"
```

---

## Task 4: Mettre à jour .gitignore pour Hugo

**But:** Ajouter les entrées Hugo au .gitignore existant.

**Files:**
- Modify: `.gitignore`

**Step 1: Ajouter les entrées Hugo**

Ajouter en haut du fichier :

```gitignore
# Hugo
public/
resources/
.hugo_build.lock
_archive/

# Node (si besoin futur)
node_modules/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update .gitignore for Hugo build artifacts"
```

---

## Task 5: Palette et typographie custom (CSS)

**But:** Implémenter la palette crème/anthracite et la typographie serif du brief.

**Files:**
- Create: `assets/css/extended/theme.css`
- Create: `layouts/partials/extend_head.html`

**Step 1: Créer le fichier CSS custom**

`assets/css/extended/theme.css` :

```css
/* ===== Google Fonts ===== */
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300..900;1,8..60,300..900&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ===== Light Mode (default) ===== */
:root {
  --theme-bg: #FAF7F2;
  --theme-bg-secondary: #F0EBE3;
  --theme-text: #2C2418;
  --theme-text-secondary: #5C4F3D;
  --theme-accent: #B8860B;
  --theme-accent-hover: #A0522D;
  --theme-accent-secondary: #6B705C;
  --theme-border: #D4C9B8;
  --theme-code-bg: #F0EBE3;
  --theme-code-border: #D4C9B8;
}

/* ===== Dark Mode ===== */
.dark {
  --theme-bg: #1C1917;
  --theme-bg-secondary: #292524;
  --theme-text: #E8E0D4;
  --theme-text-secondary: #A8998A;
  --theme-accent: #D4A843;
  --theme-accent-hover: #E0B84E;
  --theme-accent-secondary: #8B9A6B;
  --theme-border: #44403C;
  --theme-code-bg: #292524;
  --theme-code-border: #44403C;
}

/* ===== Override PaperMod CSS variables ===== */
:root {
  --gap: 24px;
  --content-gap: 24px;
  --nav-width: 1024px;
  --main-width: 750px;
  --header-height: 60px;
  --footer-height: 60px;
  --radius: 6px;

  --theme: var(--theme-bg);
  --entry: var(--theme-bg-secondary);
  --primary: var(--theme-text);
  --secondary: var(--theme-text-secondary);
  --tertiary: var(--theme-border);
  --content: var(--theme-text);
  --code-bg: var(--theme-code-bg);
  --border: var(--theme-border);
}

.dark {
  --theme: var(--theme-bg);
  --entry: var(--theme-bg-secondary);
  --primary: var(--theme-text);
  --secondary: var(--theme-text-secondary);
  --tertiary: var(--theme-border);
  --content: var(--theme-text);
  --code-bg: var(--theme-code-bg);
  --border: var(--theme-border);
}

/* ===== Typography ===== */
body {
  font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
  font-size: 18px;
  line-height: 1.75;
  color: var(--theme-text);
  background: var(--theme-bg);
}

h1, h2, h3, h4, h5, h6,
.post-title,
.first-entry .entry-title {
  font-family: 'Source Serif 4', Georgia, serif;
  font-weight: 700;
  color: var(--theme-text);
}

.post-content {
  font-size: 18px;
  line-height: 1.75;
}

/* ===== Code ===== */
code, pre {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
}

pre {
  background: var(--theme-code-bg) !important;
  border: 1px solid var(--theme-code-border);
  border-radius: var(--radius);
  padding: 1rem;
}

.post-content code:not(pre code) {
  background: var(--theme-code-bg);
  border: 1px solid var(--theme-code-border);
  border-radius: 3px;
  padding: 0.15em 0.35em;
  font-size: 0.85em;
}

/* ===== Links ===== */
.post-content a {
  color: var(--theme-accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.post-content a:hover {
  color: var(--theme-accent-hover);
}

/* ===== Blockquotes ===== */
blockquote {
  border-left: 3px solid var(--theme-accent);
  padding-left: 1rem;
  margin-left: 0;
  color: var(--theme-text-secondary);
  font-style: italic;
}

/* ===== Table of Contents (sidebar float on large screens) ===== */
@media (min-width: 1280px) {
  .toc {
    position: sticky;
    top: 5rem;
    float: right;
    margin-right: -250px;
    width: 220px;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    font-size: 0.85rem;
    border-left: 2px solid var(--theme-border);
    padding-left: 1rem;
  }

  .toc .inner {
    padding: 0;
  }
}

/* ===== "Cited as" block ===== */
.citation-block {
  background: var(--theme-code-bg);
  border: 1px solid var(--theme-code-border);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  margin-top: 2rem;
  font-size: 0.9rem;
}

.citation-block summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--theme-text);
}

.citation-block pre {
  margin-top: 0.75rem;
  border: none;
  background: transparent !important;
  padding: 0;
  font-size: 0.8rem;
}

/* ===== Footnotes ===== */
.footnotes {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--theme-border);
  font-size: 0.9rem;
  color: var(--theme-text-secondary);
}

/* ===== Header/Nav ===== */
.nav {
  font-family: 'Source Serif 4', Georgia, serif;
}

#menu a {
  color: var(--theme-text-secondary);
}

#menu a:hover,
#menu .active {
  color: var(--theme-accent);
}

/* ===== Tags ===== */
.post-tags a {
  background: var(--theme-bg-secondary);
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
  border-radius: var(--radius);
  padding: 0.2em 0.6em;
  font-size: 0.8rem;
  text-decoration: none;
}

.post-tags a:hover {
  color: var(--theme-accent);
  border-color: var(--theme-accent);
}

/* ===== Footer ===== */
.footer {
  font-size: 0.85rem;
  color: var(--theme-text-secondary);
}

/* ===== Reading time & meta ===== */
.post-meta {
  color: var(--theme-text-secondary);
  font-size: 0.9rem;
}
```

**Step 2: Commit**

```bash
git add assets/css/extended/theme.css
git commit -m "feat: add warm cream/anthracite palette and serif typography"
```

---

## Task 6: Support KaTeX (rendu mathématique)

**But:** Ajouter le rendu LaTeX via KaTeX sur toutes les pages.

**Files:**
- Create: `layouts/partials/extend_head.html`

**Step 1: Créer le partial extend_head.html**

`layouts/partials/extend_head.html` :

```html
<!-- KaTeX -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css"
  integrity="sha384-zh0CIslj3dQfHGBQOrfbMER9zCDTnRt64YtCBFQbJmRCaRPSdSMUre0+POWioxJz"
  crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js"
  integrity="sha384-bB0AutRIBz5uf+UPXO5XUyjpJyWnGDAEuVJMx1BMLC0lPY3y1IfpJEgHo24Isojn"
  crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/auto-render.min.js"
  integrity="sha384-hCXGrKn+s6gQpUFGKx/YkfKLMtD7vaNdoFeOCUGBizwVMEykt4eR0CbC4Uo1bOsV"
  crossorigin="anonymous"
  onload="renderMathInElement(document.body, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '$', right: '$', display: false},
      {left: '\\(', right: '\\)', display: false},
      {left: '\\[', right: '\\]', display: true}
    ],
    throwOnError: false
  });"></script>
```

**Step 2: Commit**

```bash
git add layouts/partials/extend_head.html
git commit -m "feat: add KaTeX math rendering support"
```

---

## Task 7: Support Mermaid (diagrammes)

**But:** Ajouter le rendu de diagrammes Mermaid.

**Files:**
- Create: `layouts/partials/extend_footer.html`

**Step 1: Créer le partial extend_footer.html**

`layouts/partials/extend_footer.html` :

```html
<!-- Mermaid -->
<script>
  document.addEventListener("DOMContentLoaded", function () {
    const mermaidBlocks = document.querySelectorAll("code.language-mermaid");
    if (mermaidBlocks.length > 0) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
      script.onload = function () {
        mermaid.initialize({
          startOnLoad: false,
          theme: document.body.classList.contains("dark") ? "dark" : "default",
        });
        mermaidBlocks.forEach(function (block) {
          const container = block.parentElement;
          const div = document.createElement("div");
          div.className = "mermaid";
          div.textContent = block.textContent;
          container.parentElement.replaceChild(div, container);
        });
        mermaid.run();
      };
      document.body.appendChild(script);
    }
  });
</script>
```

**Step 2: Commit**

```bash
git add layouts/partials/extend_footer.html
git commit -m "feat: add Mermaid diagram rendering support"
```

---

## Task 8: Pages statiques — About, Archives, Search

**But:** Créer les pages de contenu statiques du site.

**Files:**
- Create: `content/about.md`
- Create: `content/archives.md`
- Create: `content/search.md`

**Step 1: Créer la page About**

`content/about.md` :

```markdown
---
title: "About"
layout: "single"
url: "/about/"
summary: "About Zakaria Laabsi"
ShowToc: false
ShowReadingTime: false
ShowShareButtons: false
ShowPostNavLinks: false
hidemeta: true
---

I document here what I explore — post-quantum cryptography, reasoning models, reinforcement learning, interpretability, and the bridges between mathematics and artificial intelligence.

Applied mathematics & statistics (University of Montpellier). Amazigh, Aït Seghrouchen.

[GitHub](https://github.com/zlaabsi) · [X](https://x.com/ZakShark) · [Email](mailto:zakaria.laabsi@gmail.com)
```

**Step 2: Créer la page Archives**

`content/archives.md` :

```markdown
---
title: "Archives"
layout: "archives"
url: "/archives/"
summary: "archives"
ShowToc: false
ShowReadingTime: false
---
```

**Step 3: Créer la page Search**

`content/search.md` :

```markdown
---
title: "Search"
layout: "search"
url: "/search/"
summary: "search"
placeholder: "Search articles..."
ShowToc: false
ShowReadingTime: false
---
```

**Step 4: Commit**

```bash
git add content/
git commit -m "feat: add About, Archives and Search pages"
```

---

## Task 9: Page Projects

**But:** Créer la page vitrine des projets publics.

**Files:**
- Create: `content/projects.md`

**Step 1: Créer la page Projects**

`content/projects.md` :

```markdown
---
title: "Projects"
layout: "single"
url: "/projects/"
summary: "Open-source projects"
ShowToc: false
ShowReadingTime: false
hidemeta: true
---

## TurboQuant

Quantization benchmarks for efficient AI inference.

- [turboquant-embed](https://github.com/zlaabsi/turboquant-embed) — Embedding model quantization benchmarks
- [turboquant-wasm](https://github.com/zlaabsi/turboquant-wasm) — WASM-based inference for edge deployment
- [turboquant-bench](https://github.com/zlaabsi/turboquant-bench) — Quantization benchmark suite

## Other Projects

- [SelfMadeQA-Mistral7B-Tuning](https://github.com/zlaabsi/SelfMadeQA-Mistral7B-Tuning) — Fine-tuning Mistral 7B on self-generated QA data
- [SIMBAD](https://github.com/zlaabsi/simbad) — Growth marketing with AI agents and the AARRR framework
- [GenieFront](https://github.com/zlaabsi/geniefront) — Generative vision for front-end development
```

**Step 2: Commit**

```bash
git add content/projects.md
git commit -m "feat: add Projects page with public repositories"
```

---

## Task 10: Archetype article (template pour nouveaux posts)

**But:** Créer un archetype Hugo pour les articles de blog avec la structure complète : frontmatter, ToC, citation BibTeX.

**Files:**
- Modify: `archetypes/default.md`
- Create: `archetypes/posts.md`

**Step 1: Créer l'archetype posts**

`archetypes/posts.md` :

```markdown
---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
author: "Zakaria Laabsi"
tags: []
categories: []
description: ""
summary: ""
ShowToc: true
TocOpen: true
math: true
ShowReadingTime: true
ShowCodeCopyButtons: true
---

## Introduction

Write your introduction here.

---

## Section

Content here.

---

## References

[^1]: Author et al. "Paper Title." *Conference/Journal*, Year. [Link]()

---

<details class="citation-block">
<summary>Cited as</summary>

> Laabsi, Zakaria. "{{ replace .File.ContentBaseName "-" " " | title }}." *zlaabsi.github.io*, {{ dateFormat "Jan 2006" .Date }}.

```bibtex
@article{laabsi{{ dateFormat "2006" .Date }}{{ lower (index (split .File.ContentBaseName "-") 0) }},
  title   = "{{ replace .File.ContentBaseName "-" " " | title }}",
  author  = "Laabsi, Zakaria",
  journal = "zlaabsi.github.io",
  year    = "{{ dateFormat "2006" .Date }}",
  month   = "{{ dateFormat "Jan" .Date }}",
  url     = "https://zlaabsi.github.io/posts/{{ .File.ContentBaseName }}/"
}
```

</details>
```

**Step 2: Commit**

```bash
git add archetypes/
git commit -m "feat: add blog post archetype with ToC, citations and BibTeX"
```

---

## Task 11: Article exemple (vérification du rendu)

**But:** Créer un article de test pour valider le rendu complet : Markdown, LaTeX, code, Mermaid, citations, footnotes.

**Files:**
- Create: `content/posts/hello-world.md`

**Step 1: Créer le post de test**

`content/posts/hello-world.md` :

```markdown
---
title: "Hello World — Rendering Test"
date: 2026-03-29
draft: false
author: "Zakaria Laabsi"
tags: ["test", "meta"]
description: "A test post to validate rendering: LaTeX, code, Mermaid, blockquotes, footnotes."
summary: "Rendering test post — LaTeX, code, Mermaid, citations."
ShowToc: true
TocOpen: true
math: true
---

## Mathematics

Inline math: The loss function $\mathcal{L}(\theta) = -\mathbb{E}[\log p_\theta(x)]$ is minimized during training.

Display math:

$$
\nabla_\theta \mathcal{L}(\theta) = -\mathbb{E}_{x \sim p_{\text{data}}} \left[ \nabla_\theta \log p_\theta(x) \right]
$$

## Code

```python
import torch
import torch.nn as nn

class TransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, n_heads)
        self.norm = nn.LayerNorm(d_model)

    def forward(self, x):
        attn_out, _ = self.attn(x, x, x)
        return self.norm(x + attn_out)
`` `

## Diagrams

`` `mermaid
graph LR
    A[Input] --> B[Encoder]
    B --> C[Latent Space]
    C --> D[Decoder]
    D --> E[Output]
`` `

## Blockquotes

> "The key insight is that language models can be seen as implicit world models."
> — Sébastien Bubeck et al., *Sparks of AGI* [^1]

## Footnotes

This is a claim that needs a citation[^1].

[^1]: Bubeck et al. "Sparks of Artificial General Intelligence." *arXiv:2303.12712*, 2023.

---

<details class="citation-block">
<summary>Cited as</summary>

> Laabsi, Zakaria. "Hello World — Rendering Test." *zlaabsi.github.io*, Mar 2026.

`` `bibtex
@article{laabsi2026hello,
  title   = "Hello World — Rendering Test",
  author  = "Laabsi, Zakaria",
  journal = "zlaabsi.github.io",
  year    = "2026",
  month   = "Mar",
  url     = "https://zlaabsi.github.io/posts/hello-world/"
}
`` `

</details>
```

> **Note :** Les espaces dans `` ` ci-dessus sont un artefact du plan — dans le fichier réel, il n'y aura pas d'espace dans les triple backticks.

**Step 2: Vérifier le rendu localement**

```bash
hugo server -D
# Ouvrir http://localhost:1313/posts/hello-world/
# Vérifier :
#   ✓ LaTeX inline et display se rendent correctement
#   ✓ Code block avec syntax highlighting Python
#   ✓ Diagramme Mermaid se rend
#   ✓ Table des matières présente et flottante (desktop)
#   ✓ Blockquote stylisée
#   ✓ Footnotes en bas
#   ✓ Citation BibTeX dans le <details>
#   ✓ Reading time affiché
#   ✓ Tags cliquables
#   ✓ Dark mode toggle fonctionne
#   ✓ Typographie serif
#   ✓ Palette crème (light) / anthracite (dark)
```

**Step 3: Commit**

```bash
git add content/posts/hello-world.md
git commit -m "feat: add rendering test post (LaTeX, code, Mermaid, citations)"
```

---

## Task 12: Favicon

**But:** Ajouter un favicon simple (lettre Z stylisée).

**Files:**
- Create: `static/favicon.ico` (SVG converti)

**Step 1: Créer un favicon SVG minimaliste**

`static/favicon.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="12" fill="#2C2418"/>
  <text x="50" y="72" font-family="Georgia, serif" font-size="65" font-weight="700"
    fill="#FAF7F2" text-anchor="middle">Z</text>
</svg>
```

Puis mettre à jour `layouts/partials/extend_head.html` pour utiliser le SVG :

Ajouter en haut du fichier :
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

**Step 2: Commit**

```bash
git add static/favicon.svg layouts/partials/extend_head.html
git commit -m "feat: add Z favicon"
```

---

## Task 13: GitHub Actions — déploiement automatique

**But:** Configurer le CI/CD pour déployer sur GitHub Pages à chaque push sur main.

**Files:**
- Create: `.github/workflows/hugo.yaml`

**Step 1: Créer le workflow**

`.github/workflows/hugo.yaml` :

```yaml
name: Deploy Hugo site to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

defaults:
  run:
    shell: bash

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: "0.147.0"
    steps:
      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.deb \
          && sudo dpkg -i ${{ runner.temp }}/hugo.deb

      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build with Hugo
        env:
          HUGO_CACHEDIR: ${{ runner.temp }}/hugo_cache
          HUGO_ENVIRONMENT: production
          TZ: Europe/Paris
        run: |
          hugo \
            --gc \
            --minify \
            --baseURL "${{ steps.pages.outputs.base_url }}/"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/hugo.yaml
git commit -m "feat: add GitHub Actions workflow for Hugo deployment"
```

**Step 3: Configurer GitHub Pages (action manuelle)**

> **Action manuelle requise sur GitHub :**
> 1. Aller sur https://github.com/zlaabsi/zlaabsi.github.io/settings/pages
> 2. Sous "Source", sélectionner **GitHub Actions**
> 3. Sauvegarder

---

## Task 14: Pousser et vérifier le déploiement

**But:** Pousser tous les commits et vérifier que le site se déploie correctement.

**Step 1: Push**

```bash
git push origin main
```

**Step 2: Vérifier le build GitHub Actions**

```bash
gh run list --limit 1
# Attendre que le statut passe à "completed"
gh run view --log
```

**Step 3: Vérifier le site live**

Ouvrir https://zlaabsi.github.io/ et vérifier :
- ✓ Page d'accueil avec "Notes on AI, cryptography & mathematics"
- ✓ Navigation : Posts, Projects, About, Tags, Archives, Search
- ✓ Article test visible
- ✓ Dark/light toggle fonctionne
- ✓ Palette correcte
- ✓ Typographie serif
- ✓ Recherche fonctionne
- ✓ RSS feed accessible à /index.xml

---

## Task 15: Nettoyage post-déploiement

**But:** Supprimer le post de test et le brief, ne garder qu'un site propre.

**Step 1: Supprimer le post de test**

```bash
rm content/posts/hello-world.md
```

**Step 2: Déplacer le brief dans _archive (hors du site)**

```bash
mv BRIEF_CLAUDE_CODE_BLOG_REFONTE.md _archive/
```

**Step 3: Commit et push**

```bash
git add -A
git commit -m "chore: remove test post and archive brief"
git push origin main
```

---

## Résumé de l'ordre d'exécution

| Task | Description | Dépend de |
|------|-------------|-----------|
| 1 | Archiver le site existant | — |
| 2 | Installer Hugo + init projet | 1 |
| 3 | Configuration hugo.yaml | 2 |
| 4 | Mise à jour .gitignore | 2 |
| 5 | CSS custom (palette + typo) | 3 |
| 6 | Support KaTeX | 3 |
| 7 | Support Mermaid | 3 |
| 8 | Pages statiques (About, Archives, Search) | 3 |
| 9 | Page Projects | 3 |
| 10 | Archetype article | 3 |
| 11 | Article de test + validation visuelle | 5, 6, 7, 10 |
| 12 | Favicon | 6 |
| 13 | GitHub Actions workflow | 3 |
| 14 | Push + vérification déploiement | 11, 12, 13 |
| 15 | Nettoyage post-déploiement | 14 |
