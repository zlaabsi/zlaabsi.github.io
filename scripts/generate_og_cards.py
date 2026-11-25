#!/usr/bin/env python3
"""
Generate the link-preview cards (1200 x 630) shown when a page of the site is shared.

  static/images/og/site.png                     the site card: shark, name, tagline
  static/images/og/<section>-<file name>.png    one card per post and explorable:
                                                its title beside its thumbnail
  static/images/og/shark.png                    the shark alone, for the welcome email
  static/posts/<file name>/email.png            the illustration of the newsletter
                                                email for that post: its thumbnail

The cards are laid out as HTML and rasterised by headless Chrome, so they use
the same system font stack as the site and show each thumbnail exactly as the
post list shows it in dark mode.

Run it after adding a post, renaming one, or changing a title or thumbnail:

    python3 scripts/generate_og_cards.py

Needs Pillow, PyYAML and Google Chrome. layouts/partials/share-image.html picks
the card up by file name; no front matter is needed. The email templates in
workers/growth-api/templates/ load the illustration from the article's own URL,
and layouts/index.updates.xml stops the build when a post has none.
"""

import html
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml
from PIL import Image, ImageDraw

W, H = 1200, 630

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
OUT = STATIC / "images" / "og"
SHARK_SOURCE = STATIC / "images" / "og-v1.png"
SECTIONS = ["posts", "explorables"]

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

SITE_NAME = "Zakaria Laabsi"
TAGLINE = "Notes on AI & mathematics"

# The site's dark background, --theme-bg in dark mode. Every card uses it.
CARD_BG = "#141413"
# Same stack as --tc-sans in assets/css/extended/zz-theme-tc.css.
FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
# Same filter as .entry-thumb img in dark mode: white becomes #141414, hues are kept.
DARK_FILTER = "invert(0.92) hue-rotate(180deg)"

# X and LinkedIn show a card in a frame nearer 16:9 than 1200 x 630 and cut up to
# 40 px off each side. The side margin leaves 60 px after that cut. The room
# comes out of the title column, never out of the thumbnail frame.
MARGIN = 100
FRAME_W, FRAME_H = 564, 376
FRAME_TOP = (H - FRAME_H) // 2
GAP = 44

# Shown 600 px wide in the email, so drawn at twice that. One image serves light
# and dark mail alike, because Gmail cannot swap images by colour scheme.
EMAIL_W, EMAIL_H = 1200, 800

BASE_CSS = f"""
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; }}
body {{ position: relative; font-family: {FONT}; -webkit-font-smoothing: antialiased; }}
"""


def shark_background(path: Path) -> None:
    """The shark of og-v1.png without its text, zoomed 1.4x as in the previous card."""
    img = Image.open(SHARK_SOURCE).convert("RGB")
    ImageDraw.Draw(img).rectangle((0, 400, 520, H), fill=(0, 0, 0))
    zoom = 1.4
    cw, ch = int(W / zoom), int(H / zoom)
    left = max(0, min(W - cw, 674 - cw // 2))
    top = max(0, min(H - ch, 250 - ch // 2))
    img = img.crop((left, top, left + cw, top + ch)).resize((W, H), Image.LANCZOS)
    img.save(path)


def site_card(shark: Path) -> str:
    return f"""<!doctype html><meta charset="utf-8"><style>{BASE_CSS}
body {{ background: {CARD_BG}; }}
/* The shark is drawn on black: "lighten" lets the card background show through it. */
img {{ position: absolute; inset: 0; width: {W}px; height: {H}px; mix-blend-mode: lighten; }}
.text {{ position: absolute; left: 720px; bottom: 62px; }}
h1 {{ color: #fff; font-size: 58px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }}
p {{ color: #b4b4b4; font-size: 27px; font-weight: 400; margin-top: 12px; }}
</style>
<img src="{shark.as_uri()}">
<div class="text"><h1>{html.escape(SITE_NAME)}</h1><p>{html.escape(TAGLINE)}</p></div>"""


def shark_card() -> str:
    """The shark alone, centred, on the card background."""
    return f"""<!doctype html><meta charset="utf-8"><style>{BASE_CSS}
body {{ background: {CARD_BG}; }}
img {{ position: absolute; left: 0; top: 42px; width: {W}px; height: {H}px; mix-blend-mode: lighten; }}
</style>
<img src="SHARK">"""


def title_markup(title: str) -> str:
    """Escaped title in which a hyphenated word such as Mamba-3 never breaks at its hyphen."""
    words = [html.escape(word) for word in title.split(" ")]
    return " ".join(f'<span class="nb">{word}</span>' if "-" in word else word for word in words)


def page_card(title: str, thumb: Path | None) -> str:
    size = 64 if len(title) <= 24 else 48 if len(title) <= 45 else 44
    frame = ""
    column = W - 2 * MARGIN
    if thumb:
        column -= FRAME_W + GAP
        frame = f'<div class="frame"><img src="{thumb.as_uri()}"></div>'
    return f"""<!doctype html><meta charset="utf-8"><style>{BASE_CSS}
body {{ background: {CARD_BG}; }}
.text {{ position: absolute; left: {MARGIN}px; top: {FRAME_TOP}px; bottom: {FRAME_TOP}px; width: {column}px;
  display: flex; flex-direction: column; justify-content: space-between; }}
h1 {{ color: #faf9f5; font-size: {size}px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.14;
  text-wrap: balance; }}
.nb {{ white-space: nowrap; }}
p {{ color: rgba(255, 255, 255, 0.6); font-size: 27px; font-weight: 400; }}
.frame {{ position: absolute; right: {MARGIN}px; top: {FRAME_TOP}px; width: {FRAME_W}px; height: {FRAME_H}px;
  border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 10px; overflow: hidden; background: #141414; }}
.frame img {{ display: block; width: 100%; height: 100%; object-fit: contain; filter: {DARK_FILTER}; }}
</style>
<div class="text"><h1>{title_markup(title)}</h1><p>{html.escape(SITE_NAME)}</p></div>
{frame}"""


def email_figure(thumb: Path) -> str:
    return f"""<!doctype html><meta charset="utf-8"><style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {EMAIL_W}px; height: {EMAIL_H}px; overflow: hidden; background: #fff; }}
img {{ display: block; width: 100%; height: 100%; padding: 36px; object-fit: contain; }}
</style>
<img src="{thumb.as_uri()}">"""


def render(markup: str, out: Path, work: Path, size: tuple[int, int] = (W, H)) -> None:
    width, height = size
    page = work / f"{out.stem}.html"
    shot = work / f"{out.stem}.png"
    page.write_text(markup, encoding="utf-8")
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            f"--user-data-dir={work / 'chrome-profile'}",
            # Taller than the card: the window is cropped below, whatever Chrome reserves.
            f"--window-size={width},{height + 200}",
            "--virtual-time-budget=4000",
            f"--screenshot={shot}",
            page.as_uri(),
        ],
        check=True,
        capture_output=True,
        timeout=180,
    )
    img = Image.open(shot).convert("RGB")
    if img.width < width or img.height < height:
        sys.exit(f"{out}: Chrome returned {img.width} x {img.height}, expected at least {width} x {height}")
    img.crop((0, 0, width, height)).save(out, "PNG", optimize=True)


def front_matter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    return yaml.safe_load(text.split("---", 2)[1]) or {}


def thumbnail_of(name: str, meta: dict, table: dict) -> Path | None:
    """Same precedence as layouts/_default/list.html."""
    ref = meta.get("thumbnail") or table.get(name) or (meta.get("cover") or {}).get("image")
    if not ref:
        return None
    path = STATIC / ref.lstrip("/")
    if not path.exists():
        sys.exit(f"{name}: thumbnail {ref} not found under static/")
    return path


def main() -> None:
    if not Path(CHROME).exists():
        sys.exit(f"Google Chrome not found at {CHROME}")
    OUT.mkdir(parents=True, exist_ok=True)
    table = yaml.safe_load((ROOT / "data" / "thumbnails.yaml").read_text()) or {}

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        shark = work / "shark.png"
        shark_background(shark)
        render(site_card(shark), OUT / "site.png", work)
        print("site.png")
        render(shark_card().replace("SHARK", shark.as_uri()), OUT / "shark.png", work)
        print("shark.png")

        for section in SECTIONS:
            for path in sorted((ROOT / "content" / section).glob("*.md")):
                if path.name.startswith("_"):
                    continue
                meta = front_matter(path)
                if meta.get("draft"):
                    continue
                out = OUT / f"{section}-{path.stem}.png"
                thumb = thumbnail_of(path.stem, meta, table)
                render(page_card(meta["title"], thumb), out, work)
                print(f"{out.name}  {'with ' + thumb.name if thumb else 'no thumbnail'}")

                if section == "posts":
                    if not thumb:
                        sys.exit(f"{path.name}: a post needs a thumbnail for its newsletter email")
                    figure = STATIC / "posts" / path.stem / "email.png"
                    figure.parent.mkdir(parents=True, exist_ok=True)
                    render(email_figure(thumb), figure, work, (EMAIL_W, EMAIL_H))
                    print(f"posts/{path.stem}/email.png")


if __name__ == "__main__":
    main()
