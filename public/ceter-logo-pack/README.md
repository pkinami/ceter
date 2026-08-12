# Ceter Technologies — Logo & Icon Pack

Primary mark, alternates, lockups and every export size you need for web, print
and social. All artwork is original vector, created for Ceter Technologies.

---

## 1. The mark

**"Document C"** — a page silhouette with a bold **C** counter cut out of it,
and a teal folded corner.

Why this one, out of the four concepts explored:

- **It says what you do.** The page is the output of every product you
  sell — printers, copiers, duplicators, toner. The C is the company.
- **It survives at 16 px.** The counter is wide and the outer silhouette is a
  simple portrait rectangle, so it stays legible as a favicon and as a WhatsApp
  or LinkedIn avatar, where thin or detailed marks collapse into mush.
- **It works in one colour.** Fold and counter are knock-outs, not overlays, so
  the mono version is a straight silhouette — needed for stamps, engraving,
  invoices, embroidery and single-colour tender printing.
- **It is not a printer.** A literal printer icon dates the moment you expand
  into CCTV, networking and cloud. A document is format-neutral.
- **The teal fold reads as forward motion** without adding a second idea.

Three alternates are included in `alternate-concepts/` if you want to compare:
**Continuum C** (C carrying a document), **CT Monogram** (C with a T inside),
**Network C** (C drawn as connected nodes). Say the word and any of them can be
built out into the same full asset set.

---

## 2. What is in the pack

| Folder | Files |
|---|---|
| `icon/` | Primary icon — SVG + PNG at 512, 256, 128, 64, 48, 32, 16. Plus mono navy, mono white, and a reversed (white-on-navy) plate. |
| `lockup/` | Horizontal and stacked logo with wordmark, each in standard and reversed, SVG + PNG. |
| `app-icon/` | Rounded navy tile at 1024 / 512 / 192 / 180 for app stores, PWA and social profiles, plus `apple-touch-icon-180.png`. |
| `favicon/` | `favicon.ico` (16/32/48 bundled) and PNG favicons at 16, 32, 48, 96. |
| `alternate-concepts/` | The three unused concepts, SVG + PNG. |
| `source/` | The parametric generator that produced everything. |

SVG is the master. Every PNG can be regenerated from it at any size.

---

## 3. Colour

| Role | Hex | Use |
|---|---|---|
| Ceter Navy | `#0B1E39` | Primary mark, wordmark, dark backgrounds |
| Ceter Teal | `#14B8A6` | Fold, counter terminal, "TECHNOLOGIES" |
| White | `#FFFFFF` | Reversed mark, counter on dark |
| Slate | `#334155` | Secondary text (not part of the logo) |

CMYK for print, approximate — ask your printer to match to these:
Navy C 95 / M 80 / Y 45 / K 45 · Teal C 75 / M 0 / Y 45 / K 5.
Pantone nearest: Navy ≈ 539 C, Teal ≈ 3275 C.

---

## 4. Usage rules

**Clear space.** Keep free space around the logo equal to the width of the fold
(roughly one third of the icon's width) on all sides. Nothing — text, rules,
photo edges — inside that.

**Minimum sizes.**
- Icon alone: 16 px on screen, 8 mm in print.
- Horizontal lockup: 120 px wide on screen, 30 mm in print. Below that, use the
  stacked lockup or the icon alone.

**Backgrounds.** Use the standard version on white and light backgrounds; use
the reversed version on navy, on photography, and on any dark surface. On busy
photography, place the reversed lockup over a solid or gradient panel — never
straight onto detail.

**Do not:** recolour outside the palette, add drop shadows, bevels or outlines,
stretch or condense, rotate, redraw the fold, place the icon inside another
shape (the app tile already does this), or set the wordmark in a different
typeface.

---

## 5. Favicon installation

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
<meta name="theme-color" content="#0B1E39">
```

Put `favicon.ico` at the site root. The `theme-color` tag tints the browser
chrome on Android and matches the mark.

---

## 6. Typography

The wordmark is supplied as **outlined vector paths**, so it carries no font
dependency — it renders identically everywhere and nobody needs the typeface
installed to open the files.

It is drawn in **Liberation Sans Bold**, which is licensed under the SIL Open
Font License and free for commercial use, including outlining in a logo.
"CETER" is set solid; "TECHNOLOGIES" is tracked out to align to the same width.

For the website and documents, pair it with **Inter**, **Manrope** or
**Public Sans** (all SIL OFL, free, on Google Fonts). If you later want the
wordmark refined by a type designer, that is the natural next step — the mark
itself needs no change.

---

## 7. Licensing

Every element here is original artwork made for Ceter Technologies. No stock
assets, no third-party illustration, no trademarked shapes. You own it outright
and can use, modify and reproduce it across any medium without fees,
attribution or expiry.

Two practical notes:

- **Register the mark.** In Kenya, trade mark registration is handled by KIPI.
  Registration is what actually protects the logo from being copied, and it is
  worth doing before the mark appears on tenders and vehicle branding.
- **Run a clearance check** against existing Kenyan marks in your class before
  registering. This design was created independently, not searched against the
  register — that search is a legal step, not a design one.

---

## 8. Regenerating or editing

```bash
pip install pillow numpy fonttools
cd source
python assets.py            # rebuilds the entire pack
```

`icons.py` holds the four concepts, `assets.py` holds the mark geometry and
every export, `engine.py` is the SVG + raster renderer. Change `NAVY` or `TEAL`
at the top of `icons.py` and every file in the pack recolours consistently.

Or just open any SVG in Illustrator, Figma or Inkscape and edit the shapes
directly.
