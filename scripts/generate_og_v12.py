#!/usr/bin/env python3
"""
Generate og-V12: variant of og-v1 with text on the right side.

COMPOSITION (from og-v1):
- Accent bar: 61px wide × 4px tall, LEFT-aligned with text block
- Title: Source Serif 4 Bold, ~40px rendered height
- Subtitle: Source Serif 4 Regular, gray
- URL: JetBrains Mono (or SF Mono), gold
- All text LEFT-aligned within the block (not right-aligned!)
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# === CANVAS ===
W, H = 1200, 630

# === PATHS ===
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
IMAGES_DIR = ROOT_DIR / "static" / "images"
SOURCE_IMG = IMAGES_DIR / "og-v1.png"
OUTPUT_IMG = IMAGES_DIR / "og-V12.png"

# === TEXT ===
TITLE = "Zakaria Laabsi"
SUBTITLE = "Notes on AI & mathematics"
URL = "zlaabsi.github.io"

# === COLORS ===
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GOLD = (218, 165, 32)
GRAY = (180, 180, 180)

# === COMPOSITION (from og-v1 analysis) ===
ACCENT_LINE_WIDTH = 61
ACCENT_LINE_HEIGHT = 4

# Font sizes (calibrated to match og-v1 rendered heights)
TITLE_SIZE = 52
SUBTITLE_SIZE = 22
URL_SIZE = 16  # Calibrated to match og-v1 URL width (~166px)

# Spacing (calibrated to match og-v1 rendered output)
GAP_BAR_TITLE = 18           # Target: 23px rendered
GAP_TITLE_SUBTITLE = 20      # Target: 15px rendered
GAP_SUBTITLE_URL = 28        # Target: 28px rendered (OK)

# Position: text block starts at this X (LEFT-aligned from here)
# og-v1 starts at x=80, og-v2 starts at x=480
# For og-V12, we want text on the right, so start around x=720
TEXT_BLOCK_LEFT = 720
MARGIN_BOTTOM = 55

# Zone to clear (old text on left side of og-v1)
TEXT_CLEAR_ZONE = (0, 400, 520, H)


def load_font(role: str, size: int) -> ImageFont.FreeTypeFont:
    """Load font for the given role."""

    # Use Georgia as it's a reliable serif with proper bold weight
    # (Source Serif 4 variable font doesn't load bold weight correctly in PIL)
    font_map = {
        "title": "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
        "subtitle": "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "url": "/System/Library/Fonts/SFNSMono.ttf",
    }

    path = font_map.get(role)
    if path and Path(path).exists():
        try:
            return ImageFont.truetype(path, size)
        except Exception as e:
            print(f"Warning loading {role}: {e}")

    return ImageFont.load_default()


def main():
    print(f"Loading: {SOURCE_IMG}")
    img = Image.open(SOURCE_IMG).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Clear old text area
    draw.rectangle(TEXT_CLEAR_ZONE, fill=BLACK)

    # Load fonts
    title_font = load_font("title", TITLE_SIZE)
    subtitle_font = load_font("subtitle", SUBTITLE_SIZE)
    url_font = load_font("url", URL_SIZE)

    # Measure text heights
    title_bbox = draw.textbbox((0, 0), TITLE, font=title_font)
    title_h = title_bbox[3] - title_bbox[1]

    subtitle_bbox = draw.textbbox((0, 0), SUBTITLE, font=subtitle_font)
    subtitle_h = subtitle_bbox[3] - subtitle_bbox[1]

    url_bbox = draw.textbbox((0, 0), URL, font=url_font)
    url_h = url_bbox[3] - url_bbox[1]

    # Calculate Y positions (from bottom up)
    url_y = H - MARGIN_BOTTOM - url_h
    subtitle_y = url_y - GAP_SUBTITLE_URL - subtitle_h
    title_y = subtitle_y - GAP_TITLE_SUBTITLE - title_h
    bar_y = title_y - GAP_BAR_TITLE

    # X position: ALL elements LEFT-aligned at TEXT_BLOCK_LEFT
    # (This is how og-v1 and og-v2 work - text is left-aligned within the block)
    text_x = TEXT_BLOCK_LEFT
    bar_x = TEXT_BLOCK_LEFT

    print(f"Text block starts at x={TEXT_BLOCK_LEFT}")
    print(f"Bar: y={bar_y}")
    print(f"Title: y={title_y}, h={title_h}")
    print(f"Subtitle: y={subtitle_y}, h={subtitle_h}")
    print(f"URL: y={url_y}, h={url_h}")

    # Draw accent bar (LEFT-aligned with text)
    draw.rectangle(
        (bar_x, bar_y, bar_x + ACCENT_LINE_WIDTH - 1, bar_y + ACCENT_LINE_HEIGHT - 1),
        fill=GOLD
    )

    # Draw text (all LEFT-aligned at text_x)
    draw.text((text_x, title_y), TITLE, font=title_font, fill=WHITE)
    draw.text((text_x, subtitle_y), SUBTITLE, font=subtitle_font, fill=GRAY)
    draw.text((text_x, url_y), URL, font=url_font, fill=GOLD)

    # Save
    img.save(OUTPUT_IMG, "PNG")
    print(f"Saved: {OUTPUT_IMG}")


if __name__ == "__main__":
    main()
