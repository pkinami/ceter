"""
Ceter Technologies banner engine.

A tiny scene-graph with two backends:
  * SVG   -> editable vector source (opens in Illustrator / Figma / Inkscape)
  * Pillow -> antialiased raster (rendered at 2x, downsampled)

Both backends consume the same shape list, so the SVG source and the exported
WebP/JPG are guaranteed to match.
"""
import math
import numpy as np
from PIL import Image, ImageDraw

# ---------------------------------------------------------------- palette
NAVY = "#0B1E39"
DEEP = "#0F172A"
SLATE = "#334155"
SLATE_L = "#475569"
TEAL = "#14B8A6"
TEAL_D = "#0D9488"
WHITE = "#FFFFFF"
LIGHT = "#F7F8FA"
AMBER = "#D97706"
GREY = "#94A3B8"
GREY_D = "#64748B"
PAPER = "#F1F5F9"


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    ca, cb = hex2rgb(a), hex2rgb(b)
    return "#%02X%02X%02X" % tuple(int(round(ca[i] + (cb[i] - ca[i]) * t)) for i in range(3))


# ---------------------------------------------------------------- scene
class Scene:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.shapes = []

    # -- primitives -------------------------------------------------
    def rect(self, x, y, w, h, fill, opacity=1.0, r=0):
        self.shapes.append(dict(t="rect", x=x, y=y, w=w, h=h, fill=fill, op=opacity, r=r))

    def ell(self, cx, cy, rx, ry, fill, opacity=1.0):
        self.shapes.append(dict(t="ell", cx=cx, cy=cy, rx=rx, ry=ry, fill=fill, op=opacity))

    def poly(self, pts, fill, opacity=1.0):
        self.shapes.append(dict(t="poly", pts=list(pts), fill=fill, op=opacity))

    def path(self, contours, fill, opacity=1.0, evenodd=True):
        """Multi-contour filled shape; even-odd rule punches counters/holes."""
        self.shapes.append(dict(t="path", cs=[list(c) for c in contours],
                                fill=fill, op=opacity, eo=evenodd))

    def line(self, pts, color, width, opacity=1.0):
        self.shapes.append(dict(t="line", pts=list(pts), fill=color, op=opacity, sw=width))

    # -- helpers ----------------------------------------------------
    def circ(self, cx, cy, r, fill, opacity=1.0):
        self.ell(cx, cy, r, r, fill, opacity)


def lin(stops, direction="v"):
    """Gradient fill. stops = [(offset, colour, alpha), ...]; direction h|v|d."""
    return ("lin", stops, direction)


def bezier(p0, p1, p2, n=26):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return out


# ---------------------------------------------------------------- SVG backend
def to_svg(sc):
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{sc.w}" height="{sc.h}" '
        f'viewBox="0 0 {sc.w} {sc.h}">',
    ]
    defs, body, gid = [], [], 0

    def fill_attr(fill, tag_bbox):
        nonlocal gid
        if isinstance(fill, tuple) and fill[0] == "lin":
            _, stops, d = fill
            gid += 1
            name = f"g{gid}"
            coords = {"h": (0, 0, 1, 0), "v": (0, 0, 0, 1), "d": (0, 0, 1, 1)}[d]
            s = "".join(
                f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
            defs.append(
                f'<linearGradient id="{name}" x1="{coords[0]}" y1="{coords[1]}" '
                f'x2="{coords[2]}" y2="{coords[3]}">{s}</linearGradient>')
            return f'url(#{name})'
        return fill

    for s in sc.shapes:
        op = f' opacity="{round(s["op"], 4)}"' if s["op"] < 1 else ""
        if s["t"] == "rect":
            f = fill_attr(s["fill"], None)
            rr = f' rx="{s["r"]}" ry="{s["r"]}"' if s["r"] else ""
            body.append(f'<rect x="{s["x"]}" y="{s["y"]}" width="{s["w"]}" '
                        f'height="{s["h"]}"{rr} fill="{f}"{op}/>')
        elif s["t"] == "ell":
            f = fill_attr(s["fill"], None)
            body.append(f'<ellipse cx="{s["cx"]}" cy="{s["cy"]}" rx="{s["rx"]}" '
                        f'ry="{s["ry"]}" fill="{f}"{op}/>')
        elif s["t"] == "poly":
            f = fill_attr(s["fill"], None)
            pts = " ".join(f"{round(x, 2)},{round(y, 2)}" for x, y in s["pts"])
            body.append(f'<polygon points="{pts}" fill="{f}"{op}/>')
        elif s["t"] == "path":
            f = fill_attr(s["fill"], None)
            d = " ".join("M " + " L ".join(f"{round(x, 2)} {round(y, 2)}" for x, y in c) + " Z"
                         for c in s["cs"])
            rule = ' fill-rule="evenodd"' if s["eo"] else ""
            body.append(f'<path d="{d}" fill="{f}"{rule}{op}/>')
        elif s["t"] == "line":
            d = "M " + " L ".join(f"{round(x, 2)} {round(y, 2)}" for x, y in s["pts"])
            body.append(f'<path d="{d}" fill="none" stroke="{s["fill"]}" '
                        f'stroke-width="{s["sw"]}" stroke-linecap="round" '
                        f'stroke-linejoin="round"{op}/>')

    parts.append("<defs>" + "".join(defs) + "</defs>")
    parts.extend(body)
    parts.append("</svg>")
    return "\n".join(parts)


# ---------------------------------------------------------------- raster backend
def _grad_rgba(fill, w, h):
    """Return (rgb ndarray HxWx3, alpha ndarray HxW float 0..1) for a gradient."""
    _, stops, d = fill
    if d == "h":
        t = np.linspace(0, 1, w)[None, :].repeat(h, 0)
    elif d == "v":
        t = np.linspace(0, 1, h)[:, None].repeat(w, 1)
    else:
        gx = np.linspace(0, 1, w)[None, :]
        gy = np.linspace(0, 1, h)[:, None]
        t = (gx + gy) / 2.0
    stops = sorted(stops, key=lambda s: s[0])
    rgb = np.zeros((h, w, 3), np.float32)
    alpha = np.zeros((h, w), np.float32)
    for i in range(len(stops) - 1):
        o0, c0, a0 = stops[i]
        o1, c1, a1 = stops[i + 1]
        seg = (t >= o0) & (t <= o1) if i == len(stops) - 2 else (t >= o0) & (t < o1)
        if not seg.any():
            continue
        span = max(o1 - o0, 1e-6)
        k = ((t - o0) / span).clip(0, 1)
        r0, r1 = np.array(hex2rgb(c0), np.float32), np.array(hex2rgb(c1), np.float32)
        for ch in range(3):
            rgb[..., ch] = np.where(seg, r0[ch] + (r1[ch] - r0[ch]) * k, rgb[..., ch])
        alpha = np.where(seg, a0 + (a1 - a0) * k, alpha)
    lo = t < stops[0][0]
    if lo.any():
        c = np.array(hex2rgb(stops[0][1]), np.float32)
        for ch in range(3):
            rgb[..., ch] = np.where(lo, c[ch], rgb[..., ch])
        alpha = np.where(lo, stops[0][2], alpha)
    return rgb, alpha


def render(sc, ss=2, transparent=False):
    """Render at ss x supersampling; returns RGB, or RGBA when transparent."""
    W, H = sc.w * ss, sc.h * ss
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0) if transparent else (255, 255, 255, 255))

    for s in sc.shapes:
        # ---- bounding box in device pixels
        if s["t"] == "rect":
            x0, y0, x1, y1 = s["x"], s["y"], s["x"] + s["w"], s["y"] + s["h"]
        elif s["t"] == "ell":
            x0, y0 = s["cx"] - s["rx"], s["cy"] - s["ry"]
            x1, y1 = s["cx"] + s["rx"], s["cy"] + s["ry"]
        elif s["t"] == "path":
            pts = [q for c in s["cs"] for q in c]
            xs = [q[0] for q in pts]
            ys = [q[1] for q in pts]
            x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        else:
            xs = [p[0] for p in s["pts"]]
            ys = [p[1] for p in s["pts"]]
            pad = s.get("sw", 0) / 2 + 1
            x0, y0, x1, y1 = min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad

        bx0 = max(0, int(math.floor(x0 * ss)) - 2)
        by0 = max(0, int(math.floor(y0 * ss)) - 2)
        bx1 = min(W, int(math.ceil(x1 * ss)) + 2)
        by1 = min(H, int(math.ceil(y1 * ss)) + 2)
        bw, bh = bx1 - bx0, by1 - by0
        if bw <= 0 or bh <= 0:
            continue

        mask = Image.new("L", (bw, bh), 0)
        md = ImageDraw.Draw(mask)
        ox, oy = bx0, by0

        def P(x, y):
            return (x * ss - ox, y * ss - oy)

        if s["t"] == "rect":
            box = [P(s["x"], s["y"])[0], P(s["x"], s["y"])[1],
                   P(x1, y1)[0] - 1, P(x1, y1)[1] - 1]
            if s["r"]:
                md.rounded_rectangle(box, radius=s["r"] * ss, fill=255)
            else:
                md.rectangle(box, fill=255)
        elif s["t"] == "ell":
            md.ellipse([P(x0, y0)[0], P(x0, y0)[1], P(x1, y1)[0] - 1, P(x1, y1)[1] - 1], fill=255)
        elif s["t"] == "poly":
            md.polygon([P(*p) for p in s["pts"]], fill=255)
        elif s["t"] == "path":
            acc = np.zeros((bh, bw), bool)
            for c in s["cs"]:
                cm = Image.new("L", (bw, bh), 0)
                ImageDraw.Draw(cm).polygon([P(*q) for q in c], fill=255)
                arr = np.asarray(cm) > 127
                acc = np.logical_xor(acc, arr) if s["eo"] else np.logical_or(acc, arr)
            mask = Image.fromarray((acc * 255).astype(np.uint8), "L")
        else:
            pts = [P(*p) for p in s["pts"]]
            wpx = max(1, int(round(s["sw"] * ss)))
            md.line(pts, fill=255, width=wpx, joint="curve")
            rr = wpx / 2.0
            for p in (pts[0], pts[-1]):
                md.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=255)

        m = np.asarray(mask, np.float32) / 255.0
        if s["op"] < 1:
            m = m * s["op"]

        fill = s["fill"]
        if isinstance(fill, tuple) and fill[0] == "lin":
            gw = max(1, int(round((x1 - x0) * ss)))
            gh = max(1, int(round((y1 - y0) * ss)))
            rgb, ga = _grad_rgba(fill, gw, gh)
            canvas_rgb = np.zeros((bh, bw, 3), np.float32)
            canvas_a = np.zeros((bh, bw), np.float32)
            gx0 = int(round(x0 * ss)) - ox
            gy0 = int(round(y0 * ss)) - oy
            sx0, sy0 = max(0, gx0), max(0, gy0)
            ex1, ey1 = min(bw, gx0 + gw), min(bh, gy0 + gh)
            if ex1 > sx0 and ey1 > sy0:
                canvas_rgb[sy0:ey1, sx0:ex1] = rgb[sy0 - gy0:ey1 - gy0, sx0 - gx0:ex1 - gx0]
                canvas_a[sy0:ey1, sx0:ex1] = ga[sy0 - gy0:ey1 - gy0, sx0 - gx0:ex1 - gx0]
            src_rgb, a = canvas_rgb, m * canvas_a
        else:
            src_rgb = np.zeros((bh, bw, 3), np.float32)
            src_rgb[:] = np.array(hex2rgb(fill), np.float32)
            a = m

        region = np.asarray(base.crop((bx0, by0, bx1, by1)), np.float32)
        a3 = a[..., None]
        ra = region[..., 3:4] / 255.0
        oa = a3 + ra * (1 - a3)
        out = np.empty_like(region)
        safe = np.where(oa > 1e-6, oa, 1.0)
        out[..., :3] = (src_rgb * a3 + region[..., :3] * ra * (1 - a3)) / safe
        out[..., 3] = (oa[..., 0] * 255)
        base.paste(Image.fromarray(out.clip(0, 255).astype(np.uint8), "RGBA"), (bx0, by0))

    img = base.resize((sc.w, sc.h), Image.LANCZOS)
    return img if transparent else img.convert("RGB")
