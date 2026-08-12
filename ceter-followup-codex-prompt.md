Work on the existing Ceter Technologies project using the full project context already available to you.

This follows the admin build described in `ceter-admin-build-prompt` and the approved mockup at `docs/admin-mockup.html`. Three tasks. Do Task 1 first — it is a live bug on the public site.

---

# TASK 1 — Banner images are not rendering

Banners are not displaying images from the banner folders. Diagnose before changing anything, then fix the actual cause. Do not paper over it by swapping in placeholder images.

**Diagnose in this order and report what you find at each step:**

1. **List the real files.** Run a recursive directory listing of `public/Ceter_Technologies_Banners_Photorealistic/` and print exact paths, including capitalisation and extensions. Do not trust the filenames in any earlier prompt or in the code — compare them character by character against what the code requests.

2. **Case sensitivity.** The dev machine is Windows and the deployment target is Linux. A path that works locally will 404 in production if capitalisation differs anywhere — folder names, file stems, or the `.webp` extension. This is the single most likely cause. Check every segment.

3. **Path form.** Confirm the code uses root-relative URLs like `/Ceter_Technologies_Banners_Photorealistic/01_Homepage_Hero/<file>.webp` and never `/public/...`, never a Windows absolute path, and never an ES import from `public`.

4. **Files actually deployed.** Check `.gitignore`, `.vercelignore` and any Git LFS configuration for patterns that exclude images or this folder. Confirm the files are committed and present in the build output, not just on the local disk.

5. **Rendering layer.** If `next/image` is used with `fill`, the parent element must be positioned and have a height, or the image renders at zero height and looks missing. Check for a zero-height container, a missing `sizes` prop, or a `<picture>` whose `<source>` media queries never match. Confirm whether the element is absent, present but zero-size, or present and 404ing — these are three different bugs.

6. **Data path.** Confirm the banner components read from the static configuration, not from empty banner records left over in the database. An empty query result renders nothing and looks exactly like a broken image path.

7. **Encoding.** If any filename contains a space or special character, confirm it is URL-encoded at the point of use, or rename the reference rather than the file.

**Then fix it,** and add these safeguards:

- A single source of truth: one typed banner manifest module exporting every banner's desktop and mobile paths, headline, supporting text and CTA. No banner path is written inline in a component.
- A build-time or startup check that every path in the manifest exists on disk, failing loudly with the missing paths listed. A missing banner should break the build, not silently ship a blank hero.
- A visible fallback: if an image fails to load at runtime, render the brand-navy gradient panel with the headline and CTA still readable. A banner that fails must never collapse the section or leave dead space.
- Meaningful `alt` text on every banner image, and explicit `width`/`height` or a fixed aspect-ratio container so nothing shifts on load.

Report the root cause plainly, the files changed, and confirmation that every banner path resolves in a production build.

---

# TASK 2 — Make the admin match the site's design system

The mockup defined layout, density and behaviour. It should not introduce a second visual language.

- Inspect the storefront's existing design system first: Tailwind config, theme tokens, CSS variables, global stylesheet, font loading, and the shared component set (buttons, inputs, badges, cards, tables, modals, toasts). Report what exists.
- Restyle the admin to use those exact tokens and components. Colours, fonts, radii, spacing scale, shadow treatment, focus rings, button variants and form controls must come from the shared system, not from admin-only values.
- If the storefront has no formal token set, promote the mockup's palette and scale into shared tokens used by both the storefront and the admin, and refactor the storefront's hardcoded values onto them. Do this as a token swap only — no visual redesign of storefront pages and no layout changes.
- Where the mockup's values and the site's system differ, the site's system wins for colour, type and control styling. The mockup still wins for layout, table density, badge wording, states and interaction behaviour.
- Delete any admin-only CSS, one-off utility classes or duplicated component variants left behind. One button component, one input component, one badge component, one toast system across the whole project.
- Keep the admin's data-dense typography readable: numerals, part numbers, references and money stay in the monospaced face with tabular figures, even if the storefront does not use it elsewhere. Add it to the shared system as a `font-mono` token rather than as an admin exception.
- Verify both light rendering and any existing dark mode still work, and that no storefront page regressed visually.

---

# TASK 3 — Icecat working for product listing

Icecat must do real work: an admin should be able to create a complete, sellable product listing from a part number rather than typing specifications by hand.

**Verify the current Icecat API against its live documentation before implementing.** Confirm endpoints, authentication, the lookup formats for brand plus MPN and for GTIN/EAN, the response shape for images, descriptions, feature groups, and the language and locale parameters. Report exactly what you used.

## 3.1 Create listings from Icecat

- A **Find product** flow in the catalogue: the admin enters a part number, GTIN or brand plus model, and gets matching Icecat results with thumbnail, title, brand and category.
- Selecting a result opens a create-listing form pre-filled with title, description, specifications, category suggestion and image gallery, with **price, cost, stock and supplier left empty and required** — these are commercial fields Icecat must never supply or overwrite.
- Saving creates the product, downloads the images into the project's own storage through the existing upload pipeline, writes the specifications into the JSONB column against the category whitelist, and records `enrichedFields` and `enrichedAt`.
- **Deduplicate on brand plus MPN.** If a product already exists, offer to enrich the existing record instead of creating a duplicate, and say so clearly.

## 3.2 Enrich existing products

- The `Enrich` action beside the MPN field on any existing product, as in the mockup.
- Field-by-field diff of incoming versus current values with per-field accept or reject, defaulting to keeping what the admin entered. Never auto-overwrite.
- Bulk enrich for selected rows, queued rather than fired in parallel.

## 3.3 Engineering requirements

- Behind the `CatalogEnrichmentProvider` interface. The catalogue works fully with the provider disabled, unreachable or rate-limited.
- All Icecat calls run through `EnrichmentJob` rows processed in a route handler or the project's existing job mechanism — never inside a server action, which will block and time out.
- Status badges on the product row: `Shell created` → `Enrichment running` → `Icecat synced`, with failures showing the reason and a retry.
- Handle rate limits with backoff, timeouts, partial responses and missing products, each with a distinct message. `No match for that part number` is not the same as `Icecat is unreachable`, and the admin needs to know which.
- Map Icecat categories to local categories through an editable mapping table, not a hardcoded switch.
- Credentials in environment variables, documented in `.env.example`, never in client code.
- Cache successful lookups so re-opening a product does not re-hit the API.

## 3.4 Licensing — report before enabling

Open Icecat is free but requires registration, and coverage of a given brand generally depends on that brand sponsoring the catalogue and on the account being entitled to sell it. Full Icecat is a paid tier. Establish what this project's account level actually permits for commercial reuse of images and descriptions on a retail site, and report it plainly.

If entitlement cannot be confirmed, ship the flow complete but flagged off, and leave the CSV import path as the working alternative. Do not publish third-party images and copy the business may not have the right to use.

---

# Definition of "fully functional"

No part of the admin may remain a mock. Specifically:

- Every button, link and form is wired to a real server action or route. No `onClick` that only fires a toast, no `#` links, no `TODO`, no dead controls.
- No hardcoded sample data anywhere in admin components. The mockup's sample products, quotes and orders exist only in `docs/admin-mockup.html`, which is reference material and must not be imported or deployed.
- Every list reads from the database with real filtering, sorting and pagination.
- Every mutation persists, writes its audit or movement rows, and survives a page refresh.
- Role permissions are enforced server-side, verified by attempting a forbidden action as each role.
- Every state in the mockup — loading skeleton, empty state, pending, success, failure, conflict — is reachable with real data.

---

# Verify, then report

Run lint, type-check, tests and a production build. Confirm the storefront, cart, checkout and auth still work, and that no storefront page changed visually as a result of Task 2.

Report:

1. Banner root cause, the fix, and confirmation every path resolves in a production build
2. The safeguards added to prevent a silent banner failure recurring
3. The existing design system found, what the admin now shares with it, and what was deleted as duplicate
4. Any storefront file touched during the token unification, and proof of no visual regression
5. Icecat endpoints, authentication and response handling used
6. The create-from-Icecat flow, deduplication behaviour and category mapping
7. Which fields Icecat may write and which are locked to admin entry
8. The licensing finding, and whether Icecat shipped enabled or flagged off
9. Any remaining mock data, dead control or unwired action, with the reason
10. Lint, type-check, test and build results

Implement the changes. Do not only provide recommendations.
