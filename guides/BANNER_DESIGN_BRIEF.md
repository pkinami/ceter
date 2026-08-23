# Ceter Technologies Banner Design Brief

## One-Page Production Summary

| Banner slot | Route where it appears | Folder | Slug | Shapes and widths | Text zone | Priority |
|---|---|---|---|---|---|---|
| Homepage hero slide 1 | `/` | `public/banners/hero/` | `office-printer` | `tall`: 720, 1080, 1440. `mid`: 1024, 1280, 1600. `wide`: 1280, 1920, 2560 | Left 40% calm overlay zone | High, preloaded |
| Homepage hero slide 2 | `/` | `public/banners/hero/` | `toners-consumables` | `tall`: 720, 1080, 1440. `mid`: 1024, 1280, 1600. `wide`: 1280, 1920, 2560 | Left 40% calm overlay zone | High |
| Homepage hero slide 3 | `/` | `public/banners/hero/` | `business-it-support` | `tall`: 720, 1080, 1440. `mid`: 1024, 1280, 1600. `wide`: 1280, 1920, 2560 | Left 40% calm overlay zone | High |
| Category strip, printers | `/`, `/category/multifunction-printers` | `public/banners/category/` | `printers` | `tall`: 720, 1080. `mid`: 1024, 1280. `wide`: 1280, 1600, 2400 | Left 40% calm overlay zone | Lazy |
| Category strip, photocopiers | `/`, `/category/photocopiers` | `public/banners/category/` | `photocopiers` | `tall`: 720, 1080. `mid`: 1024, 1280. `wide`: 1280, 1600, 2400 | Left 40% calm overlay zone | Lazy |
| Category strip, toners | `/`, `/category/toners-and-ink` | `public/banners/category/` | `toners` | `tall`: 720, 1080. `mid`: 1024, 1280. `wide`: 1280, 1600, 2400 | Left 40% calm overlay zone | Lazy |
| Services slide, CCTV | `/` | `public/banners/services/` | `cctv` | `tall`: 720, 1080. `mid`: 1024, 1280. `wide`: 1280, 1600, 2400 | Left 40% calm overlay zone | Lazy |
| Services slide, networking | `/` | `public/banners/services/` | `networking` | `tall`: 720, 1080. `mid`: 1024, 1280. `wide`: 1280, 1600, 2400 | Left 40% calm overlay zone | Lazy |
| Services slide, maintenance support | `/` | `public/banners/services/` | `maintenance-support` | `tall`: 720, 1080. `mid`: 1024, 1280. `wide`: 1280, 1600, 2400 | Left 40% calm overlay zone | Lazy |

Final filenames must be lowercase WebP files using this pattern:

```text
public/banners/<group>/<slug>-<shape>-<width>.webp
```

Example:

```text
public/banners/hero/office-printer-wide-1920.webp
```

## Company And Audience

Ceter Technologies Limited is a Nairobi supplier of office printing equipment, photocopiers, printers, toner cartridges, consumables, spare parts, and related IT services. The site is a storefront and quote channel, not a lifestyle campaign page, so the banners must feel practical, credible, and procurement-ready.

The audience includes government offices, county teams, institutions, schools, corporate buyers, operations managers, procurement officers, and IT leads. These buyers need to quickly understand that Ceter can supply dependable equipment, consumables, installation, maintenance, and support for real business environments.

## Current Website Architecture

The website uses a typed banner manifest in `lib/banner-assets.ts`. Components do not look for random files in `public`; they generate exact URLs from each banner's `group`, `slug`, `shape`, and `width`.

The renderer is `components/BannerCarousel.tsx`. It emits a responsive `<picture>` with three shapes:

- `tall` for phones at `max-width: 767px`
- `mid` for tablets at `min-width: 768px` and `max-width: 1023px`
- `wide` for laptops and desktops at `min-width: 1024px`

Do not place new final artwork in the older folder:

```text
public/Ceter_Technologies_Banners_Photorealistic/
```

That older mixed-case folder can stay as reference material only. Final web assets must go under:

```text
public/banners/
```

Do not place banner images inside `app/`, `app/category/`, `app/product/`, or any other route folder. Route folders contain React pages and API handlers. Browser-served artwork belongs in `public/banners/`, because the website requests files as `/banners/<group>/<filename>.webp`.

## Brand Palette

Use a restrained business technology palette:

| Role | Colour |
|---|---|
| Navy | `#0B1E39` |
| Teal accent | `#14B8A6` |
| White | `#FFFFFF` |
| Light background | `#F7F8FA` |
| Slate | `#334155` |
| Deep slate | `#0F172A` |
| Amber highlight, sparingly | `#D97706` |

Use navy, slate, white, and teal as the main system. Amber should be a small accent only. Keep contrast high enough for white website-rendered text over a dark gradient overlay.

## Visual Rules

- Use licensed or original professional imagery.
- Show real office technology contexts: printers, photocopiers, toners, barcode equipment, CCTV, networking, structured cabling, cloud systems, maintenance, and technical support.
- Keep compositions corporate, clean, practical, and trustworthy.
- Leave a calm text zone on the left side for all current banner slots.
- Do not bake headlines, supporting copy, calls to action, phone numbers, website addresses, QR codes, or buttons into the image.
- Do not include Ceter logos in the artwork. The site header already carries the brand.
- Do not use stock watermarks, mock procurement stamps, fake government seals, or unlicensed supplier logos.
- Do not crop a desktop composition to make the phone version. Create a separate phone composition.
- Do not place important products, faces, hands, devices, labels, or visual anchors near the edges.
- Avoid cluttered collages. One strong subject is better than many small objects.

## Naming And Folder Structure

Use this exact naming pattern:

```text
public/banners/<group>/<slug>-<shape>-<width>.webp
```

Rules:

- Folder groups are only `hero`, `category`, and `services`.
- Filenames must be lowercase.
- Use hyphens only.
- No underscores.
- No spaces.
- No uppercase letters.
- No diacritics.
- WebP only for website delivery.
- Keep editable source files separately; do not place PSD, AI, or Figma exports in `public/banners/`.

Worked examples:

```text
public/banners/hero/office-printer-wide-1920.webp
public/banners/category/toners-mid-1280.webp
public/banners/services/networking-tall-1080.webp
```

## Responsive Sizes

These sizes match the active website breakpoints and `BannerCarousel` aspect ratios.

### Homepage Hero

The homepage hero is the first major visual on `/` and the likely LCP element.

| Shape | Aspect ratio | Pixel dimensions to deliver | Used at |
|---|---:|---|---|
| `tall` | 4:5 | 720 x 900, 1080 x 1350, 1440 x 1800 | Phones, `<=767px` |
| `mid` | 16:9 | 1024 x 576, 1280 x 720, 1600 x 900 | Tablets, `768-1023px` |
| `wide` | 8:3 | 1280 x 480, 1920 x 720, 2560 x 960 | Laptops and desktops, `>=1024px` |

### Category Strip

Category strips introduce a product family and are shorter than the homepage hero.

| Shape | Aspect ratio | Pixel dimensions to deliver | Used at |
|---|---:|---|---|
| `tall` | 9:5 | 720 x 400, 1080 x 600 | Phones, `<=767px` |
| `mid` | 21:9 | 1024 x 439, 1280 x 549 | Tablets, `768-1023px` |
| `wide` | 32:9 | 1280 x 360, 1600 x 450, 2400 x 675 | Laptops and desktops, `>=1024px` |

### Services Banner

Services banners support the services section and are slightly taller than category strips.

| Shape | Aspect ratio | Pixel dimensions to deliver | Used at |
|---|---:|---|---|
| `tall` | 5:3 | 720 x 432, 1080 x 648 | Phones, `<=767px` |
| `mid` | 2:1 | 1024 x 512, 1280 x 640 | Tablets, `768-1023px` |
| `wide` | 16:5 | 1280 x 400, 1600 x 500, 2400 x 750 | Laptops and desktops, `>=1024px` |

## File Size Limits

Use sRGB WebP, quality 78-85 as a starting point. These limits are hard targets because the storefront will be used on mobile data connections.

| Asset type | Maximum file size |
|---|---:|
| `tall` up to 1080 wide | 180 KB |
| `tall` 1440 wide | 240 KB |
| `mid` up to 1280 wide | 220 KB |
| `mid` 1600 wide | 280 KB |
| `wide` up to 1920 wide | 280 KB |
| `wide` 2400-2560 wide | 400 KB |

## Safe Areas And Text Zones

All current banner slots render text on the left. Reserve the left 40% of the frame as a calm zone for the website overlay text and buttons.

The website applies a dark left-to-right gradient over the image, so the artwork should still look good with the left side darkened. The main subject should generally live in the center-right area, not directly under the headline.

Safe area requirements:

| Shape | Keep critical detail inside | Reserved copy zone |
|---|---|---|
| `tall` | Central 78% width and central 78% height | Upper-left to mid-left area, with enough low-detail background behind copy |
| `mid` | Central 78% width and central 78% height | Left 40%, avoid busy highlights behind text |
| `wide` | Central 78% width and central 78% height | Left 40%, with subject weighted center-right |

Do not put important visual detail behind the carousel arrows at the left and right vertical center, or behind the small pagination dots near the bottom center.

## Placement Table

| Route | Component | Slot | Banner slug | Shapes required | Loading priority | Headline | Supporting text | Primary CTA | CTA destination |
|---|---|---|---|---|---|---|---|---|---|
| `/` | `BannerCarousel` | Homepage hero carousel slide 1 | `office-printer` | `tall`, `mid`, `wide` | High, first slide preloaded | Office Technology Supplied and Supported | Reliable printers, copiers and office equipment supplied with dependable technical support. | Shop Office Equipment | `/category` |
| `/` | `BannerCarousel` | Homepage hero carousel slide 2 | `toners-consumables` | `tall`, `mid`, `wide` | High | Printers, Copiers and Toners Ready | Find dependable printing equipment, toner cartridges, consumables and essential office supplies. | Browse Products | `/category` |
| `/` | `BannerCarousel` | Homepage hero carousel slide 3 | `business-it-support` | `tall`, `mid`, `wide` | High | Business IT Equipment From One Partner | Networking, office technology and responsive technical support for growing organisations. | Explore Solutions | `/about` |
| `/` | `BannerCarousel` | Category strip for printers section, if that homepage section is enabled | `printers` | `tall`, `mid`, `wide` | Lazy | Reliable Printers for Every Office | Explore dependable printers for home offices, businesses and professional workgroups. | Browse Products | `/category/multifunction-printers` |
| `/` | `BannerCarousel` | Category strip for photocopiers section, if that homepage section is enabled | `photocopiers` | `tall`, `mid`, `wide` | Lazy | Commercial Copiers Built for Teams | Multifunction photocopiers designed for reliable, high-volume office document workflows. | Browse Products | `/category/photocopiers` |
| `/` | `BannerCarousel` | Category strip for toners section, if that homepage section is enabled | `toners` | `tall`, `mid`, `wide` | Lazy | Toners and Consumables in Stock | Quality toner cartridges, drums and printing consumables for leading printer brands. | Browse Products | `/category/toners-and-ink` |
| `/` | `BannerCarousel` | Services carousel slide 1 | `cctv` | `tall`, `mid`, `wide` | Lazy | CCTV Installation for Business Sites | Professional surveillance planning, camera installation, configuration and ongoing technical support. | Request CCTV Assessment | `/quote?service=CCTV%20Installation` |
| `/` | `BannerCarousel` | Services carousel slide 2 | `networking` | `tall`, `mid`, `wide` | Lazy | Stable Networks for Growing Teams | Business networking, Wi-Fi, switching and structured connectivity designed for reliable performance. | Discuss Your Network | `/quote?service=Business%20Networking` |
| `/` | `BannerCarousel` | Services carousel slide 3 | `maintenance-support` | `tall`, `mid`, `wide` | Lazy | IT Support That Keeps Moving | Responsive equipment maintenance and technical assistance that keeps teams productive. | Request Technical Support | `/quote?service=Technical%20Support` |
| `/category` | `BannerCarousel` | Catalog listing header carousel | `office-printer`, `toners-consumables`, `business-it-support` | `tall`, `mid`, `wide` | Lazy | Same as homepage hero copy | Same as homepage hero copy | Same as homepage hero CTAs | Existing CTA destinations only |
| `/category/multifunction-printers` | `BannerCarousel` | Category page header strip | `printers` | `tall`, `mid`, `wide` | Lazy | Reliable Printers for Every Office | Explore dependable printers for home offices, businesses and professional workgroups. | Browse Products | `/category/multifunction-printers` |
| `/category/photocopiers` | `BannerCarousel` | Category page header strip | `photocopiers` | `tall`, `mid`, `wide` | Lazy | Commercial Copiers Built for Teams | Multifunction photocopiers designed for reliable, high-volume office document workflows. | Browse Products | `/category/photocopiers` |
| `/category/toners-and-ink` | `BannerCarousel` | Category page header strip | `toners` | `tall`, `mid`, `wide` | Lazy | Toners and Consumables in Stock | Quality toner cartridges, drums and printing consumables for leading printer brands. | Browse Products | `/category/toners-and-ink` |

## Routes Without Banner Artwork

These routes exist, but they do not currently have a sensible banner slot in the UI:

| Route | Reason |
|---|---|
| `/about` | Existing page uses a compact information and contact layout. A banner would duplicate the page heading. |
| `/account` | Account workflow page. Decorative banners would distract from account tasks. |
| `/cart` | Checkout/cart workflow. Keep focused on cart contents and actions. |
| `/login` | Auth page with logo only. No banner slot. |
| `/signup` | Auth page with logo only. No banner slot. |
| `/product/[slug]` | Product image area is the primary visual. Category or service banners would compete with product detail. |
| `/quote` | Form workflow. Keep page lightweight and task-focused. |
| `/api/*` | API routes, no visual UI. |

## Required Asset Inventory

Deliver every listed WebP file. The app validates exact filenames.

### Hero Assets

```text
public/banners/hero/office-printer-tall-720.webp
public/banners/hero/office-printer-tall-1080.webp
public/banners/hero/office-printer-tall-1440.webp
public/banners/hero/office-printer-mid-1024.webp
public/banners/hero/office-printer-mid-1280.webp
public/banners/hero/office-printer-mid-1600.webp
public/banners/hero/office-printer-wide-1280.webp
public/banners/hero/office-printer-wide-1920.webp
public/banners/hero/office-printer-wide-2560.webp
public/banners/hero/toners-consumables-tall-720.webp
public/banners/hero/toners-consumables-tall-1080.webp
public/banners/hero/toners-consumables-tall-1440.webp
public/banners/hero/toners-consumables-mid-1024.webp
public/banners/hero/toners-consumables-mid-1280.webp
public/banners/hero/toners-consumables-mid-1600.webp
public/banners/hero/toners-consumables-wide-1280.webp
public/banners/hero/toners-consumables-wide-1920.webp
public/banners/hero/toners-consumables-wide-2560.webp
public/banners/hero/business-it-support-tall-720.webp
public/banners/hero/business-it-support-tall-1080.webp
public/banners/hero/business-it-support-tall-1440.webp
public/banners/hero/business-it-support-mid-1024.webp
public/banners/hero/business-it-support-mid-1280.webp
public/banners/hero/business-it-support-mid-1600.webp
public/banners/hero/business-it-support-wide-1280.webp
public/banners/hero/business-it-support-wide-1920.webp
public/banners/hero/business-it-support-wide-2560.webp
```

### Category Assets

```text
public/banners/category/printers-tall-720.webp
public/banners/category/printers-tall-1080.webp
public/banners/category/printers-mid-1024.webp
public/banners/category/printers-mid-1280.webp
public/banners/category/printers-wide-1280.webp
public/banners/category/printers-wide-1600.webp
public/banners/category/printers-wide-2400.webp
public/banners/category/photocopiers-tall-720.webp
public/banners/category/photocopiers-tall-1080.webp
public/banners/category/photocopiers-mid-1024.webp
public/banners/category/photocopiers-mid-1280.webp
public/banners/category/photocopiers-wide-1280.webp
public/banners/category/photocopiers-wide-1600.webp
public/banners/category/photocopiers-wide-2400.webp
public/banners/category/toners-tall-720.webp
public/banners/category/toners-tall-1080.webp
public/banners/category/toners-mid-1024.webp
public/banners/category/toners-mid-1280.webp
public/banners/category/toners-wide-1280.webp
public/banners/category/toners-wide-1600.webp
public/banners/category/toners-wide-2400.webp
```

### Services Assets

```text
public/banners/services/cctv-tall-720.webp
public/banners/services/cctv-tall-1080.webp
public/banners/services/cctv-mid-1024.webp
public/banners/services/cctv-mid-1280.webp
public/banners/services/cctv-wide-1280.webp
public/banners/services/cctv-wide-1600.webp
public/banners/services/cctv-wide-2400.webp
public/banners/services/networking-tall-720.webp
public/banners/services/networking-tall-1080.webp
public/banners/services/networking-mid-1024.webp
public/banners/services/networking-mid-1280.webp
public/banners/services/networking-wide-1280.webp
public/banners/services/networking-wide-1600.webp
public/banners/services/networking-wide-2400.webp
public/banners/services/maintenance-support-tall-720.webp
public/banners/services/maintenance-support-tall-1080.webp
public/banners/services/maintenance-support-mid-1024.webp
public/banners/services/maintenance-support-mid-1280.webp
public/banners/services/maintenance-support-wide-1280.webp
public/banners/services/maintenance-support-wide-1600.webp
public/banners/services/maintenance-support-wide-2400.webp
```

## Creative Direction By Slot

### Homepage Hero: `office-printer`

Show modern office printers and photocopiers in a credible workplace or showroom context. The subject should sit center-right with a clean, darker left area for text.

### Homepage Hero: `toners-consumables`

Show toner cartridges, drums, ink, packaging, spare parts, and a printer context. Keep the composition organized and procurement-focused, not retail-cluttered.

### Homepage Hero: `business-it-support`

Show a business IT support environment: laptop, networking hardware, office device support, technician presence, or a service desk context. Avoid abstract cloud-only imagery.

### Category: `printers`

Feature printer products clearly. The image should work as a category introduction, not a generic office photo.

### Category: `photocopiers`

Feature a commercial multifunction copier with scale and workplace context. Keep small detail readable on mobile.

### Category: `toners`

Feature toner cartridges and consumables. Use clean organization and subtle colour coding, but avoid busy piles.

### Services: `cctv`

Show CCTV installation or camera planning in a business site. A technician may appear, but avoid faces dominating the frame.

### Services: `networking`

Show switches, racks, access points, patching, and structured connectivity. Cabling should look tidy and professionally labelled.

### Services: `maintenance-support`

Show technical support or equipment maintenance in an office setting. The image should communicate reliability and continuity.

## Delivery Checklist

For each approved banner design, deliver:

- WebP files at every required size listed above.
- Correct folder and filename for every WebP.
- sRGB colour profile.
- File sizes under the listed limits.
- Editable source files: Figma, PSD, AI, or layered equivalent.
- Font names and font licensing notes for any source-file-only typography.
- Image source and licensing notes for every source image.
- A small contact sheet or preview sheet showing all crops for review.

## Licensing Requirements

All images must be original, commissioned, company-owned, or licensed for commercial website use. Record the licence or source for every image. This site represents Ceter Technologies Limited in procurement and tender contexts, so image provenance must be clear and defensible.

Do not use images pulled casually from Google Images, supplier websites, marketplaces, or manufacturer pages unless a commercial licence or written permission is provided.
