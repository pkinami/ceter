"""Build the Ceter Technologies logo asset pack."""
import os
import math
from PIL import Image
from engine import Scene, render, to_svg
from icons import (CONCEPTS, S, NAVY, TEAL, WHITE, LIGHT, SLATE,
                   arc, ring_band, rot, rrect_pts, sheet, outlined_text, text_width)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DOC_W, DOC_H, FOLD = 262.0, 364.0, 88.0


# ------------------------------------------------------------------ the mark
def mark(sc, x, y, s, body=NAVY, accent=TEAL):
    """Primary mark — document with a C counter. Local box 262 x 364."""
    w, h, f = DOC_W * s, DOC_H * s, FOLD * s
    r = 26 * s
    doc = [(x + r, y), (x + w - f, y), (x + w, y + f), (x + w, y + h - r),
           (x + w - r, y + h), (x + r, y + h), (x, y + h - r), (x, y + r)]
    cx, cy = x + 140 * s, y + 182 * s
    hole = ring_band(cx, cy, 122 * s, 60 * s, 42, 318, 90)
    sc.path([doc, hole], body)
    sc.path([[(x + w - f, y), (x + w, y + f), (x + w - f, y + f)]], accent)
    sc.path([ring_band(cx, cy, 122 * s, 60 * s, 264, 318, 40)], accent)


def mark_mono(sc, x, y, s, col=NAVY):
    """Single-colour mark — fold and C terminal knocked out."""
    w, h, f = DOC_W * s, DOC_H * s, FOLD * s
    r = 26 * s
    doc = [(x + r, y), (x + w - f, y), (x + w, y + f), (x + w, y + h - r),
           (x + w - r, y + h), (x + r, y + h), (x, y + h - r), (x, y + r)]
    cx, cy = x + 140 * s, y + 182 * s
    hole = ring_band(cx, cy, 122 * s, 60 * s, 42, 318, 90)
    fold = [(x + w - f, y), (x + w, y + f), (x + w - f, y + f)]
    sc.path([doc, hole, fold], col)


def icon_scene(body=NAVY, accent=TEAL, mono=None, pad=74):
    """Square icon canvas, mark centred with even optical padding."""
    sc = Scene(S, S)
    s = (S - 2 * pad) / DOC_H
    x = (S - DOC_W * s) / 2
    if mono:
        mark_mono(sc, x, pad, s, mono)
    else:
        mark(sc, x, pad, s, body, accent)
    return sc


def app_tile_scene(size=1024, bg=NAVY):
    sc = Scene(size, size)
    sc.path([rrect_pts(0, 0, size, size, size * 0.22, 22)], bg)
    s = size * 0.50 / DOC_H
    mark(sc, (size - DOC_W * s) / 2, size * 0.25, s, WHITE, TEAL)
    return sc


# ------------------------------------------------------------------ lockups
def lockup(orientation="horizontal", on_dark=False):
    word_col = WHITE if on_dark else NAVY
    sub_col = TEAL if on_dark else TEAL
    body = WHITE if on_dark else NAVY
    name_size, sub_size, track = 132, 41, 15.5
    w_name = text_width("CETER", name_size)
    w_sub = text_width("TECHNOLOGIES", sub_size, track) - track

    if orientation == "horizontal":
        icon_h = 200.0
        s = icon_h / DOC_H
        gap = 58
        pad = 56
        W = int(pad * 2 + DOC_W * s + gap + max(w_name, w_sub))
        H = int(icon_h + pad * 2)
        sc = Scene(W, H)
        if on_dark:
            sc.rect(0, 0, W, H, NAVY)
        mark(sc, pad, pad, s, body, TEAL) if not on_dark else mark(sc, pad, pad, s, WHITE, TEAL)
        tx = pad + DOC_W * s + gap
        outlined_text(sc, "CETER", name_size, tx, pad + 118, word_col)
        outlined_text(sc, "TECHNOLOGIES", sub_size, tx + 3, pad + 186, sub_col, track)
    else:
        icon_h = 250.0
        s = icon_h / DOC_H
        pad = 60
        W = int(max(DOC_W * s, w_name, w_sub) + pad * 2)
        H = int(icon_h + 60 + 150 + pad * 2)
        sc = Scene(W, H)
        if on_dark:
            sc.rect(0, 0, W, H, NAVY)
        mark(sc, (W - DOC_W * s) / 2, pad, s, WHITE if on_dark else NAVY, TEAL)
        outlined_text(sc, "CETER", name_size, (W - w_name) / 2, pad + icon_h + 152, word_col)
        outlined_text(sc, "TECHNOLOGIES", sub_size, (W - w_sub) / 2, pad + icon_h + 218,
                      sub_col, track)
    return sc


# ------------------------------------------------------------------ export
def save(sc, path, sizes=None, transparent=True):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + ".svg", "w") as f:
        f.write(to_svg(sc))
    img = render(sc, 2, transparent=transparent)
    img.save(path + ".png")
    for px in (sizes or []):
        ratio = px / sc.w
        img.resize((px, max(1, int(round(sc.h * ratio)))), Image.LANCZOS).save(f"{path}-{px}.png")
    return img


def main():
    # 1. primary icon
    icon = save(icon_scene(), f"{OUT}/icon/ceter-icon", [256, 128, 64, 48, 32, 16])
    save(icon_scene(mono=NAVY), f"{OUT}/icon/ceter-icon-mono-navy", [128, 64, 32])
    save(icon_scene(mono=WHITE), f"{OUT}/icon/ceter-icon-mono-white", [128, 64, 32])

    # icon on navy plate (for light-on-dark use)
    sc = Scene(S, S)
    sc.rect(0, 0, S, S, NAVY)
    s = (S - 148) / DOC_H
    mark(sc, (S - DOC_W * s) / 2, 74, s, WHITE, TEAL)
    save(sc, f"{OUT}/icon/ceter-icon-reversed", [256, 128, 64], transparent=False)

    # 2. app / favicon
    save(app_tile_scene(1024), f"{OUT}/app-icon/ceter-app-icon", [512, 192, 180],
         transparent=False)
    apple = render(app_tile_scene(1024), 1, transparent=False).resize((180, 180), Image.LANCZOS)
    apple.save(f"{OUT}/app-icon/apple-touch-icon-180.png")
    os.makedirs(f"{OUT}/favicon", exist_ok=True)
    ico_src = render(icon_scene(pad=40), 2, transparent=True)
    ico_src.save(f"{OUT}/favicon/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for px in (16, 32, 48, 96):
        ico_src.resize((px, px), Image.LANCZOS).save(f"{OUT}/favicon/favicon-{px}.png")

    # 3. lockups
    save(lockup("horizontal"), f"{OUT}/lockup/ceter-logo-horizontal", [1200, 600, 300])
    save(lockup("horizontal", on_dark=True), f"{OUT}/lockup/ceter-logo-horizontal-reversed",
         [1200, 600], transparent=False)
    save(lockup("stacked"), f"{OUT}/lockup/ceter-logo-stacked", [800, 400])
    save(lockup("stacked", on_dark=True), f"{OUT}/lockup/ceter-logo-stacked-reversed",
         [800, 400], transparent=False)

    # 4. alternate concepts
    for slug, name, fn in CONCEPTS:
        if slug == "d-document-c":
            continue
        sc = Scene(S, S)
        fn(sc)
        save(sc, f"{OUT}/alternate-concepts/ceter-concept-{slug}", [256, 64])
    print("assets written")


if __name__ == "__main__":
    main()
