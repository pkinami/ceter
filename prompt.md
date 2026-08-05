Work on the existing Ceter Technologies project using the full project context already available to you.

Make focused changes only. Do not redesign unrelated parts of the site, replace the architecture, add unnecessary components, or refactor broadly. Prefer modifying existing components and configuration. Do not install packages unless a task genuinely cannot be done with what is already in package.json.

Before writing code: inspect the routes, components, admin pages, Prisma schema, Supabase migrations and the public asset folders, and confirm exact filenames and capitalisation.

---

# TASK A — Make the banner system fully static

All banner data comes from project code and the supplied public assets: images, headings, supporting text, CTA labels, CTA destinations, order, placement and animation.

Remove every banner-management feature from the admin area: create, edit, delete, image upload/replace, text editing, CTA editing, reordering, activate/deactivate, scheduling, overlay and alignment controls. Leave no partial banner controls behind. Remove only banner-specific UI, actions, validation and queries — keep shared upload utilities used by product images.

Do not run a destructive migration. Banner tables may remain in the database unused; the public site must not read them.

## Assets

Root-relative URLs only, e.g.
/Ceter_Technologies_Banners_Photorealistic/01_Homepage_Hero/ceter-hero-office-printer-desktop.webp

Never import from `public`. Never use `/public/...` or a Windows path. Do not move, rename, duplicate, optimise or regenerate the supplied files. Use WebP as standard; JPG (same name, `.jpg`) only where a fallback is genuinely required. Never display anything from `00_Documentation` or `00_Source_Assets`, and never use preview sheets or editable SVGs as live banners.

## Homepage hero — `01_Homepage_Hero/`

Each row has a `-desktop.webp` and a `-mobile.webp` variant.

| File stem | Headline | Supporting text | Primary CTA | Secondary CTA |
|---|---|---|---|---|
| ceter-hero-office-printer | Office Technology Supplied and Supported | Reliable printers, copiers and office equipment supplied with dependable technical support. | Shop Office Equipment | Request a Quote |
| ceter-hero-toners-and-consumables | Printers, Copiers and Toners Ready | Find dependable printing equipment, toner cartridges, consumables and essential office supplies. | Browse Products | Get a Quotation |
| ceter-hero-business-it-support | Business IT Equipment From One Partner | Networking, office technology and responsive technical support for growing organisations. | Explore Solutions | Contact Us |

## Category — `02_Minor_Category/`

| File stem | Heading | Supporting text |
|---|---|---|
| ceter-category-printers | Reliable Printers for Every Office | Explore dependable printers for home offices, businesses and professional workgroups. |
| ceter-category-photocopiers | Commercial Copiers Built for Teams | Multifunction photocopiers designed for reliable, high-volume office document workflows. |
| ceter-category-toners | Toners and Consumables in Stock | Quality toner cartridges, drums and printing consumables for leading printer brands. |

## Services — `03_Services_Solutions/`

| File stem | Heading | Supporting text | CTA |
|---|---|---|---|
| ceter-services-cctv | CCTV Installation for Business Sites | Professional surveillance planning, camera installation, configuration and ongoing technical support. | Request CCTV Assessment |
| ceter-services-networking | Stable Networks for Growing Teams | Business networking, Wi-Fi, switching and structured connectivity designed for reliable performance. | Discuss Your Network |
| ceter-services-maintenance-support | IT Support That Keeps Moving | Responsive equipment maintenance and technical assistance that keeps teams productive. | Request Technical Support |

## Placement

Use as many supplied banners as reasonably fit across existing routes — homepage hero, homepage category and services sections, product listing and category pages, printers/photocopiers/toners sections, services sections, quote and contact pages, and sensible breaks between major content blocks.

Match each banner to relevant page content. Do not place unrelated banners to increase the count, do not repeat a banner on one page except inside an intentional carousel, do not create routes just to hold a banner, and do not let banners overwhelm listings, forms or navigation.

## Behaviour

Where several banners appear together, rotate or scroll them automatically. Vary the direction to suit the section (left-to-right, right-to-left, alternating, or vertical where it fits naturally) rather than using one direction everywhere.

Use smooth slide transitions, soft crossfades, subtle zoom, gentle parallax, staggered content entrance, controlled hover movement, or seamless marquee for small banner rows. No spinning, bouncing or flashing.

Requirements: slow enough to read; seamless loop with no visible jump on restart; manual control where the design supports it; pause or slow on hover, focus and interaction; never interfere with page scroll; touch gestures where the existing carousel supports them; respect `prefers-reduced-motion`; no layout shift; keyboard accessible; text and CTAs as real HTML elements; animation must never cover the main subject of the image.

## Responsive

Serve mobile assets on mobile and desktop assets on larger screens — never a cropped desktop image as the mobile composition. Preserve natural aspect ratios, no stretching, no oversized downloads on small devices. Arrows, indicators and buttons must stay usable on touch.

## CTA destinations

Map every CTA to a route that already exists. Inspect the router before wiring. Use the existing quote or contact workflow for service enquiries. If no suitable route exists for a secondary CTA, omit that CTA rather than shipping a broken link.

---

# TASK B — Integrate the Ceter Technologies logo pack

The brand pack is supplied in the repository (locate it under `public/` — confirm the actual folder and filenames before referencing them). It contains the icon in SVG and PNG, mono navy and mono white variants, a reversed white-on-navy version, horizontal and stacked lockups in standard and reversed, an app tile, `favicon.ico`, sized PNG favicons and `apple-touch-icon-180.png`.

Apply it across the site:

- Header: horizontal lockup, linked to the homepage, with correct `alt` text. Use the reversed lockup on dark backgrounds. Prefer SVG.
- Footer: reversed lockup or mono white, whichever matches the current footer treatment.
- Favicons and app icons wired in the Next.js metadata API or `app/layout.tsx` head: `favicon.ico`, PNG favicons, `apple-touch-icon-180.png`, and `themeColor` `#0B1E39`.
- Open Graph and Twitter card image for social sharing, using an existing asset.
- Admin dashboard header and the login/signup pages.
- Loading, empty and error states: use the icon or mono mark rather than a generic placeholder.
- Any transactional email, invoice or PDF template that already exists — do not create new ones.

Do not redesign the header or footer layout; swap the mark in and adjust spacing only as needed. Do not stretch, recolour, rotate or add effects to the mark. Keep clear space around it equal to roughly one third of the icon width. Set explicit width and height on logo images to prevent layout shift. If a hard-coded text wordmark or placeholder logo exists anywhere, replace it.

---

# TASK C — Feedback, loading and error states

Current state handling is poor across the site. Every asynchronous or mutating action must tell the user what is happening and what happened.

Use the notification and UI primitives already in the project (the existing toast/notification system) — do not add a new library.

- **In progress:** disable the trigger and show a clear state — Saving…, Uploading…, Processing…, Sending…, Deleting… — with a spinner where the design supports it. For server actions use `useFormStatus`; for client calls use local pending state. Never leave a button looking idle while work is running, and never allow double submission.
- **Success:** a short, specific confirmation (for example, Product saved, Quote request sent, Order placed) plus the resulting UI update. No silent successes.
- **Failure:** a plain-language message stating what failed and what to do next. Never surface a raw exception, stack trace or database error to a user. Log the technical detail server-side.
- **Forms:** inline field-level validation messages tied to inputs with `aria-describedby`, focus moved to the first invalid field, and entered values preserved on failure.
- **Data loading:** skeletons or spinners for catalogue, cart, account, order history and admin tables. No blank flashes and no layout shift when content arrives.
- **Empty states:** a short message and a next action for empty cart, no orders, no search results, no products in a category, no quote requests.
- **Network and server failures:** a retry affordance where retrying is safe. Add or extend an error boundary so a failed section does not blank the page.

Cover at minimum: add to cart, cart quantity update and removal, checkout and order creation, quote submission, sign-up, sign-in, sign-out, profile update, and every admin create, update, delete and image upload.

Announce state changes to assistive technology using an appropriate live region, and keep all indicators keyboard accessible.

---

# TASK D — Database and application sync audit

Verify that the schema, the migrations and the code agree, and report anything that does not.

- Compare `prisma/schema.prisma` against the Supabase SQL migrations: tables, columns, nullability, defaults, enum labels, foreign keys, indexes, triggers.
- Confirm every table, column and enum value referenced in application code actually exists, and that types match how the code uses them.
- Run the project's existing database verification and Prisma validation scripts and report the output.
- Check that row-level security policies still permit the paths the storefront relies on — public catalogue read, customer cart and orders, admin management — and that no policy was broken by the banner cleanup.
- Confirm required environment variables are documented in `.env.example` and referenced consistently.
- Confirm that removing the banner queries left no dangling imports, dead types, unused server actions or broken references.

Report mismatches with the file and line. Fix only what is safe and clearly caused by this task — for example, a stale type or an unused import. Do not alter the schema, run destructive migrations, drop tables or change RLS policies to resolve a mismatch; list those for review instead.

---

# TASK E — Fix two React console errors in `app/admin/page.tsx`

**Error 1** — Cannot specify a `name` prop for a button that specifies a function as a `formAction`.

Pattern: `<button formAction={action} name='id' value={id} ...>` in `DeleteButton`, around line 426. Fix the warning while preserving the correct record ID and the existing delete behaviour. Check every use of `DeleteButton`, not just one. Do not redesign the delete workflow.

**Error 2** — Cannot specify an `encType` or `method` for a form that specifies a function as the action.

Pattern: `<form action={upsertProductAction} encType='multipart/form-data' ...>` around line 129. Remove the incompatible attributes while keeping product creation, editing and image upload working.

Then search the project for other forms that pass a function as `action` together with a manual `method` or `encType` and correct the same incompatibility. Do not touch forms whose `action` is a URL string.

---

# Scope protection

Do not make broad changes to product CRUD, product image uploads, category CRUD, quote management, orders, cart, checkout, authentication, authorisation, database schema, search, product filtering, existing API contracts or deployment configuration. Changes to these areas should be limited to what Tasks B, C and E require. Do not rewrite stable components for style preference.

---

# Verify, then report

Confirm: the storefront reads no banner content from editable records; no banner-management controls remain; all other admin functions still work; every banner URL used resolves without a 404; desktop assets appear on desktop and mobile assets on mobile; every CTA points to an existing route; auto-movement is smooth and loops cleanly; hover, focus, keyboard and reduced-motion behaviour work; the logo appears correctly everywhere including favicons and social preview; every mutating action shows pending, success and failure states; both React warnings are gone and no similar warnings remain.

Run the project's lint, type-check, test and production build commands. Fix only failures caused by this task.

Report:

1. Files modified, grouped by task
2. Pages where banners were added, and which asset on each
3. Animation and auto-scroll behaviour added, per section
4. Banner admin functionality removed, and unrelated admin functionality confirmed intact
5. Where the logo was applied, and which asset variant in each location
6. Loading, success and error states added, by flow
7. Database sync findings — matched, mismatched, and anything left for review
8. How both React errors were resolved
9. Lint, type-check, test and production build results
10. Any supplied banner not used, and why

Implement the changes. Do not only provide recommendations.
