#!/usr/bin/env python3
"""
Generate og-V121: like og-V12 but with zoomed shark.
Zooms ~1.4x centered on the shark, then adds text on the right.
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
OUTPUT_IMG = IMAGES_DIR / "og-V121.png"

# === TEXT ===
TITLE = "Zakaria Laabsi"
SUBTITLE = "Notes on AI & mathematics"
URL = "zlaabsi.github.io"

# === COLORS ===
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GOLD = (218, 165, 32)
GRAY = (180, 180, 180)

# === COMPOSITION (same as og-V12) ===
ACCENT_LINE_WIDTH = 61
ACCENT_LINE_HEIGHT = 4
TITLE_SIZE = 52
SUBTITLE_SIZE = 22
URL_SIZE = 16

# Spacing (calibrated to match og-v1)
GAP_BAR_TITLE = 18
GAP_TITLE_SUBTITLE = 20
GAP_SUBTITLE_URL = 28

TEXT_BLOCK_LEFT = 720
MARGIN_BOTTOM = 55

# === ZOOM PARAMETERS ===
ZOOM_FACTOR = 1.4
# Shark center in og-v1: (674, 219)
# We'll crop around this center, then scale back up
SHARK_CENTER_X = 674
SHARK_CENTER_Y = 250  # Slightly lower to keep shark in frame after zoom


def load_font(role: str, size: int) -> ImageFont.FreeTypeFont:
    """Load font for the given role."""
    font_map = {
        "title": "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
        "subtitle": "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "url": "/System/Library/Fonts/SFNSMono.ttf",
    }
    path = font_map.get(role)
    if path and Path(path).exists():
        try:
            return ImageFont.truetype(path, size)
        except:
            pass
    return ImageFont.load_default()


def create_zoomed_background():
    """Create a zoomed version of og-v1 background (shark only, no text)."""
    img = Image.open(SOURCE_IMG).convert("RGB")

    # First, black out the old text area (left side, y > 400)
    # to get clean background
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 400, 520, H), fill=BLACK)

    # Calculate crop box for zoom
    # After zoom, the visible area is smaller: W/zoom × H/zoom
    crop_w = int(W / ZOOM_FACTOR)
    crop_h = int(H / ZOOM_FACTOR)

    # Center the crop on the shark, but adjust to keep it in frame
    crop_left = SHARK_CENTER_X - crop_w // 2
    crop_top = SHARK_CENTER_Y - crop_h // 2

    # Clamp to image bounds
    crop_left = max(0, min(W - crop_w, crop_left))
    crop_top = max(0, min(H - crop_h, crop_top))

    crop_right = crop_left + crop_w
    crop_bottom = crop_top + crop_h

    print(f"Zoom {ZOOM_FACTOR}x: crop ({crop_left}, {crop_top}, {crop_right}, {crop_bottom})")

    # Crop and resize back to full canvas
    cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))
    zoomed = cropped.resize((W, H), Image.LANCZOS)

    return zoomed


def main():
    print(f"Creating zoomed background from {SOURCE_IMG}...")
    img = create_zoomed_background()
    draw = ImageDraw.Draw(img)

    # Clear the text area on the right (in case zoom brought in old text)
    # Actually, since we zoomed, the old text area is now in a different place
    # Let's just draw a black rectangle where our new text will go
    draw.rectangle((700, 400, W, H), fill=BLACK)

    # Load fonts
    title_font = load_font("title", TITLE_SIZE)
    subtitle_font = load_font("subtitle", SUBTITLE_SIZE)
    url_font = load_font("url", URL_SIZE)

    # Measure text
    title_bbox = draw.textbbox((0, 0), TITLE, font=title_font)
    title_h = title_bbox[3] - title_bbox[1]

    subtitle_bbox = draw.textbbox((0, 0), SUBTITLE, font=subtitle_font)
    subtitle_h = subtitle_bbox[3] - subtitle_bbox[1]

    url_bbox = draw.textbbox((0, 0), URL, font=url_font)
    url_h = url_bbox[3] - url_bbox[1]

    # Calculate Y positions
    url_y = H - MARGIN_BOTTOM - url_h
    subtitle_y = url_y - GAP_SUBTITLE_URL - subtitle_h
    title_y = subtitle_y - GAP_TITLE_SUBTITLE - title_h
    bar_y = title_y - GAP_BAR_TITLE

    # X position (left-aligned in block)
    text_x = TEXT_BLOCK_LEFT
    bar_x = TEXT_BLOCK_LEFT

    print(f"Text at x={TEXT_BLOCK_LEFT}")

    # Draw
    draw.rectangle((bar_x, bar_y, bar_x + ACCENT_LINE_WIDTH - 1, bar_y + ACCENT_LINE_HEIGHT - 1), fill=GOLD)
    draw.text((text_x, title_y), TITLE, font=title_font, fill=WHITE)
    draw.text((text_x, subtitle_y), SUBTITLE, font=subtitle_font, fill=GRAY)
    draw.text((text_x, url_y), URL, font=url_font, fill=GOLD)

    img.save(OUTPUT_IMG, "PNG")
    print(f"Saved: {OUTPUT_IMG}")


if __name__ == "__main__":
    main()
