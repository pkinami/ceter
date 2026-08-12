"""Ceter Technologies — icon concepts, wordmark outlining and asset export."""
import math
import numpy as np
from PIL import Image
from engine import Scene, render, to_svg, lin, hex2rgb

NAVY = "#0B1E39"
NAVY_L = "#16345C"
TEAL = "#14B8A6"
TEAL_D = "#0D9488"
WHITE = "#FFFFFF"
LIGHT = "#F7F8FA"
AMBER = "#D97706"
SLATE = "#334155"


# ------------------------------------------------------------------ helpers
def arc(cx, cy, r, a0, a1, n=90):
    """Points along a circular arc, degrees, clockwise-positive screen space."""
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
            for a in np.linspace(a0, a1, n)]


def ring_band(cx, cy, r_out, r_in, a0, a1, n=90):
    """Closed contour for a thick arc segment (a filled band, flat ends)."""
    out = arc(cx, cy, r_out, a0, a1, n)
    back = arc(cx, cy, r_in, a1, a0, n)
    return out + back


def rot(pts, cx, cy, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return [((x - cx) * ca - (y - cy) * sa + cx, (x - cx) * sa + (y - cy) * ca + cy)
            for x, y in pts]


def rrect_pts(x, y, w, h, r, n=10):
    """Rounded-rectangle contour as points (so it can be rotated)."""
    pts = []
    for (cx, cy, a0, a1) in [(x + w - r, y + r, -90, 0), (x + w - r, y + h - r, 0, 90),
                             (x + r, y + h - r, 90, 180), (x + r, y + r, 180, 270)]:
        pts += arc(cx, cy, r, a0, a1, n)
    return pts


def sheet(x, y, w, h, fold, r=10):
    """Document outline with a folded top-right corner."""
    return [(x + r, y), (x + w - fold, y), (x + w, y + fold), (x + w, y + h - r),
            (x + w - r, y + h), (x + r, y + h), (x, y + h - r), (x, y + r)]


# ------------------------------------------------------------------ concepts
S = 512
CX = CY = 256


def concept_continuum(sc):
    """A: open C carrying a document in the aperture."""
    sc.path([ring_band(CX, CY, 188, 124, 50, 310)], NAVY)
    pg = sheet(238, 154, 156, 200, 54, 12)
    sc.path([rot(pg, 305, 256, -7)], TEAL)
    fold = [(238 + 156 - 54, 154), (238 + 156, 154 + 54), (238 + 156 - 54, 154 + 54)]
    sc.path([rot(fold, 305, 256, -7)], NAVY, 0.30)
    for i2, wd in enumerate([86, 86, 60]):
        sc.path([rot(rrect_pts(264, 232 + i2 * 42, wd, 18, 9), 305, 256, -7)], WHITE)


def concept_monogram(sc):
    """B: C aperture with a T built from the paper feed."""
    sc.path([ring_band(CX, CY, 190, 126, 46, 314)], NAVY)
    sc.path([rrect_pts(150, 176, 212, 46, 20)], TEAL)
    sc.path([rrect_pts(232, 176, 48, 168, 20)], TEAL)
    sc.path([ring_band(CX, CY, 190, 126, 46, 84)], TEAL)


def concept_nodes(sc):
    """C: the C drawn as a network of graduated nodes."""
    angles = list(np.linspace(62, 298, 8))
    pts = [(CX + 170 * math.cos(math.radians(a)), CY + 170 * math.sin(math.radians(a)))
           for a in angles]
    for i in range(len(pts) - 1):
        sc.line([pts[i], pts[i + 1]], NAVY, 15, 0.95)
    for i, q in enumerate(pts):
        t = i / (len(pts) - 1)
        sc.circ(q[0], q[1], 17 + 15 * t, TEAL if t > 0.7 else NAVY)
    sc.circ(CX, CY, 40, TEAL)


def concept_sheet_c(sc):
    """D: a document with a C counter knocked out of it."""
    doc = sheet(126, 74, 262, 364, 88, 26)
    hole = ring_band(266, 256, 122, 60, 42, 318, 90)
    sc.path([doc, hole], NAVY)
    sc.path([[(126 + 262 - 88, 74), (126 + 262, 74 + 88), (126 + 262 - 88, 74 + 88)]], TEAL)
    sc.path([ring_band(266, 256, 122, 60, 264, 318, 40)], TEAL)


def concept_cycle(sc):
    """E: managed-service loop — a C that closes into a cycle."""
    sc.path([ring_band(CX, CY, 184, 120, 66, 296)], NAVY)
    sc.path([ring_band(CX, CY, 184, 120, 258, 296)], TEAL)
    a_tip, a_base = 8, 62
    tip = [(CX + 152 * math.cos(math.radians(a_tip)), CY + 152 * math.sin(math.radians(a_tip))),
           (CX + 212 * math.cos(math.radians(a_base)), CY + 212 * math.sin(math.radians(a_base))),
           (CX + 92 * math.cos(math.radians(a_base)), CY + 92 * math.sin(math.radians(a_base)))]
    sc.path([tip], NAVY)


CONCEPTS = [
    ("a-continuum", "Continuum C", concept_continuum),
    ("b-monogram-ct", "CT Monogram", concept_monogram),
    ("c-network-c", "Network C", concept_nodes),
    ("d-document-c", "Document C", concept_sheet_c),
]


# ------------------------------------------------------------------ wordmark
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def glyph_contours(text, size, tracking=0.0, x=0.0, y=0.0):
    """Outline text into flattened contours (no font dependency in output)."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.recordingPen import RecordingPen
    font = TTFont(FONT)
    upm = font["head"].unitsPerEm
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    k = size / upm
    pen_x = x
    contours = []
    for ch in text:
        if ch == " ":
            pen_x += size * 0.30 + tracking
            continue
        gname = cmap[ord(ch)]
        rp = RecordingPen()
        gs[gname].draw(rp)
        cur = []
        start = None
        for op, args in rp.value:
            if op == "moveTo":
                if cur:
                    contours.append(cur)
                start = args[0]
                cur = [start]
            elif op == "lineTo":
                cur.append(args[0])
            elif op == "qCurveTo":
                pts = list(args)
                on = pts[-1]
                offs = pts[:-1]
                prev = cur[-1]
                if on is None:
                    on = ((offs[0][0] + offs[-1][0]) / 2, (offs[0][1] + offs[-1][1]) / 2)
                for i, c in enumerate(offs):
                    end = on if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2,
                                                         (c[1] + offs[i + 1][1]) / 2)
                    for t in np.linspace(0, 1, 14)[1:]:
                        u = 1 - t
                        cur.append((u * u * prev[0] + 2 * u * t * c[0] + t * t * end[0],
                                    u * u * prev[1] + 2 * u * t * c[1] + t * t * end[1]))
                    prev = end
            elif op == "curveTo":
                p1, p2, p3 = args
                prev = cur[-1]
                for t in np.linspace(0, 1, 18)[1:]:
                    u = 1 - t
                    cur.append((u**3 * prev[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                                u**3 * prev[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
                prev = p3
            elif op == "closePath" and cur:
                contours.append(cur)
                cur = []
        if cur:
            contours.append(cur)
        adv = hmtx[gname][0]
        # convert this glyph's contours to canvas space
        n_new = len(contours)
        contours[:n_new] = [[(pen_x + px * k, y - py * k) for px, py in c] for c in contours[:n_new]] \
            if False else contours[:n_new]
        pen_x += adv * k + tracking
    return contours, pen_x


def outlined_text(sc, text, size, x, y, fill, tracking=0.0):
    """Draw text as outlined vector paths. Returns advance width."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.recordingPen import RecordingPen
    font = TTFont(FONT)
    upm = font["head"].unitsPerEm
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    k = size / upm
    pen_x = x
    for ch in text:
        if ch == " ":
            pen_x += size * 0.30 + tracking
            continue
        gname = cmap[ord(ch)]
        cs, _ = _glyph_paths(gs, gname)
        cs = [[(pen_x + px * k, y - py * k) for px, py in c] for c in cs]
        if cs:
            sc.path(cs, fill)
        pen_x += hmtx[gname][0] * k + tracking
    return pen_x - x


def _glyph_paths(gs, gname):
    from fontTools.pens.recordingPen import RecordingPen
    rp = RecordingPen()
    gs[gname].draw(rp)
    contours, cur = [], []
    for op, args in rp.value:
        if op == "moveTo":
            if cur:
                contours.append(cur)
            cur = [args[0]]
        elif op == "lineTo":
            cur.append(args[0])
        elif op == "qCurveTo":
            pts = list(args)
            on, offs, prev = pts[-1], pts[:-1], cur[-1]
            if on is None:
                on = ((offs[0][0] + offs[-1][0]) / 2, (offs[0][1] + offs[-1][1]) / 2)
            for i, c in enumerate(offs):
                end = on if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2,
                                                     (c[1] + offs[i + 1][1]) / 2)
                for t in np.linspace(0, 1, 14)[1:]:
                    u = 1 - t
                    cur.append((u * u * prev[0] + 2 * u * t * c[0] + t * t * end[0],
                                u * u * prev[1] + 2 * u * t * c[1] + t * t * end[1]))
                prev = end
        elif op == "curveTo":
            p1, p2, p3 = args
            prev = cur[-1]
            for t in np.linspace(0, 1, 18)[1:]:
                u = 1 - t
                cur.append((u**3 * prev[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                            u**3 * prev[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
            prev = p3
        elif op == "closePath" and cur:
            contours.append(cur)
            cur = []
    if cur:
        contours.append(cur)
    return contours, None


def text_width(text, size, tracking=0.0):
    from fontTools.ttLib import TTFont
    font = TTFont(FONT)
    upm = font["head"].unitsPerEm
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    k = size / upm
    w = 0.0
    for ch in text:
        if ch == " ":
            w += size * 0.30 + tracking
        else:
            w += hmtx[cmap[ord(ch)]][0] * k + tracking
    return w
