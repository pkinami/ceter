Work on the existing Ceter Technologies project. Banner images have failed to render across several rounds of fixes. Before any new artwork is commissioned, settle the architecture, then write the brief that tells a designer exactly what to produce and where it goes.

Deliverables: a root-cause statement, a new canonical asset scheme, working code that renders correctly with placeholders, and a rewritten `BANNER_DESIGN_BRIEF.md`.

---

# PART 1 — Root cause, stated plainly

Do not skip to the redesign. With the dev server running:

1. Print the exact image URLs the running code emits into `src` and `srcset`.
2. Print a recursive directory listing of the current banner folder with exact capitalisation.
3. `curl -I` each emitted URL and report the status code.
4. Inspect the rendered HTML for the banner element and report which `<source>` the browser actually selects.

State in one paragraph what was wrong, and why the earlier build-time validation passed while the browser got nothing. If an earlier diagnosis was wrong, say which.

This matters because the answer determines whether new assets will render. If the fault is in the rendering layer rather than the paths, re-cutting artwork changes nothing.

---

# PART 2 — Canonical asset scheme

Replace the current `Ceter_Technologies_Banners_Photorealistic/01_Homepage_Hero/` structure. Long mixed-case underscored paths are a standing hazard on a Windows-to-Linux pipeline and have now cost several rounds.

New rules, applied everywhere:

- Root: `public/banners/`
- Groups: `hero/`, `category/`, `services/`
- Filenames: lowercase, hyphen-separated, no underscores, no capitals, no spaces, no diacritics.
- Pattern: `<slug>-<shape>-<width>.webp` — for example `public/banners/hero/office-printer-wide-1920.webp`
- Shapes: `wide` (desktop), `mid` (tablet), `tall` (mobile)
- WebP only. Every browser this site targets supports it; JPG fallbacks have been adding failure paths for no benefit. Remove them unless Part 1 proves otherwise.

Keep the original supplied pack in the repository untouched for reference. Copy into the new scheme, never move.

Add a lint or CI check that fails on any file under `public/banners/` containing an uppercase letter, space or underscore.

---

# PART 3 — Sizes to specify in the brief

Use these. They follow the breakpoints already in the Tailwind config — verify them and adjust if the project's breakpoints differ, reporting any change.

**Homepage hero** — full-bleed, above the fold, the LCP element on the page.

| Shape | Aspect | Widths to deliver | Used at |
|---|---|---|---|
| `tall` | 4:5 | 720, 1080, 1440 | ≤767px, phones |
| `mid` | 16:9 | 1024, 1280, 1600 | 768–1023px, tablets |
| `wide` | 8:3 | 1280, 1920, 2560 | ≥1024px, laptops and desktops |

**Category strip** — introduces a product family, shorter than the hero.

| Shape | Aspect | Widths | Used at |
|---|---|---|---|
| `tall` | 9:5 | 720, 1080 | ≤767px |
| `mid` | 21:9 | 1024, 1280 | 768–1023px |
| `wide` | 32:9 | 1280, 1600, 2400 | ≥1024px |

**Services banner** — supports a service section, slightly taller than a category strip.

| Shape | Aspect | Widths | Used at |
|---|---|---|---|
| `tall` | 5:3 | 720, 1080 | ≤767px |
| `mid` | 2:1 | 1024, 1280 | 768–1023px |
| `wide` | 16:5 | 1280, 1600, 2400 | ≥1024px |

Multiple widths per shape feed a `srcset`, which handles high-DPR screens without shipping a 2560px file to a phone on mobile data.

**Constraints for every asset:** sRGB, WebP quality 78–85, subject and any critical detail inside the central 78% of the frame, one side kept visually calm for site-rendered copy, no text or buttons baked into the image, and the file-size ceilings below — these are hard limits, since the hero is the LCP element and this site is browsed on Kenyan mobile data.

| Shape | Ceiling |
|---|---|
| tall ≤1080 | 180 KB |
| mid ≤1280 | 220 KB |
| wide ≤1920 | 280 KB |
| wide 2400–2560 | 400 KB |

---

# PART 4 — Placement, mapped to real routes

Inspect every route in the project and produce a table in the brief with one row per banner slot:

`Route · Component · Slot · Banner slug · Shapes required · Loading priority · Headline · Supporting text · Primary CTA · CTA destination`

Rules:

- Only real, existing routes. No banner slot may imply a page that does not exist, and no CTA may point at a route that is not in the router.
- The homepage hero is the LCP element: `priority` / `fetchpriority="high"`, preloaded, never lazy-loaded. Every other banner is lazy.
- One banner per section maximum, except inside an intentional carousel.
- Do not add a banner slot to a page that does not currently have a sensible place for one.

Report any route you judged unsuitable and why.

---

# PART 5 — Code that cannot fail silently

- One typed manifest module as the single source of truth: slug, group, shapes, widths, alt text, headline, supporting text, CTA label and destination. No banner path written inline in any component.
- A build-time check that reads the directory and compares strings exactly — not `fs.existsSync`, which is case-insensitive on Windows and will pass for a path that 404s on Linux. It must fail the build listing every missing or mismatched path.
- In development, log the failing URL to the console when an image fails to load. The current fallback hides failures, which is how this shipped broken more than once.
- A runtime fallback that keeps the headline, supporting text and CTA readable over the brand gradient if an image is unavailable — a banner must never collapse the section.
- Fixed aspect-ratio containers so nothing shifts as images load.
- Generate placeholder assets at every required size and slot now, so the site renders correctly before the real artwork exists and the designer's files can be dropped in without touching code.

---

# PART 6 — Rewrite `BANNER_DESIGN_BRIEF.md`

Written for a designer who has never seen the codebase. Include:

1. Company and audience in two paragraphs — a Nairobi supplier of office printing equipment, consumables and IT services, selling to government, county, institutional and corporate buyers.
2. Brand palette and rules: navy `#0B1E39`, teal `#14B8A6`, white, light `#F7F8FA`, slate `#334155`, amber `#D97706` used sparingly.
3. The exact size tables from Part 3, with aspect ratios, widths and file-size ceilings.
4. The exact naming convention and folder structure from Part 2, with a worked example filename per group.
5. The placement table from Part 4, so the designer knows what each image is for and what copy sits over it.
6. Safe areas and text zones per shape, with the reserved side stated per slot.
7. What not to do: no baked-in text or buttons, no cropping a desktop composition for mobile, no logos, no stock watermarks, no important detail near the edges.
8. Delivery checklist: WebP at every listed width, sRGB, correct filenames, plus editable source files.
9. Licensing: originals or licensed for commercial use, with the licence recorded per asset — this site represents the company in tender submissions.
10. A one-page summary table a designer can work from without reading the rest.

---

# Verify

Load the homepage, every category page and every services section in the browser at 375px, 834px and 1440px, and confirm a banner renders at each. Confirm the correct shape is served at each width — not a cropped desktop image on a phone. Confirm the build fails if a manifest path is deleted. Then run lint, type-check and a production build.

Report the root cause from Part 1, the files changed, the placement table, and the verification result at each width.
