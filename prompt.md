Work on the existing Ceter Technologies project. Implement complete production SEO/indexing and inject the two legal policy pages. Inspect the actual codebase before writing anything — routes, current metadata setup, and the database schema — rather than assuming a structure.

Production domain: `https://www.cetertechnologies.com`

---

# TASK 0 — Inspect first

Before writing code, establish and report:

- The actual App Router route structure for category pages, product pages, and any existing static pages (about, quote/services). Do not assume a URL shape — confirm it from the routing files.
- Whichever field(s) the storefront itself already uses to decide a product is publicly visible (published/active status, stock status, soft-delete). The sitemap and metadata must use **the exact same query/filter the storefront uses to render the public catalogue** — not a second, separately-written definition of "visible" that can drift out of sync with it.
- The real enum values for product stock status (this project uses `in_stock`, `backorder`, `out_of_stock` — confirm this is still accurate rather than assuming).
- Whether `NEXT_PUBLIC_SITE_URL` (or an equivalent) already exists as the single source of truth for the site's domain, per the earlier Vercel-readiness audit. If several places hardcode the domain instead, consolidate them to read from one env var.
- Whether the production Vercel domain is configured as `www.cetertechnologies.com` or the apex `cetertechnologies.com`, and whether a redirect exists from the non-canonical form to the canonical one. Report what you find. If both currently resolve without a redirect, that is a duplicate-content problem — fix it so one canonical host is enforced, matching the domain given above.

---

# TASK 1 — robots.txt

Generate `robots.txt` (via `app/robots.ts` or the project's existing convention) using the canonical domain. Allow crawling of the public catalogue. Disallow only routes that should never be crawled at all — admin internals, API routes, checkout steps, cart. Reference the sitemap URL. Do not use `Disallow` as the mechanism for pages that need an active de-indexing signal (see Task 6) — that is a different problem with a different fix.

---

# TASK 2 — Dynamic sitemap.xml

Implement via `app/sitemap.ts` (or the project's Next.js convention):

- Homepage, all public category pages, all published product pages, and the about/quote/services pages.
- Products and categories enumerated from the real database, filtered using the exact visibility logic identified in Task 0 — unpublished, soft-deleted, and any product hidden from the storefront must not appear.
- Every URL uses the canonical production domain from Task 0 — never `localhost`, never a preview/staging URL.
- Set sensible `lastModified`, `changeFrequency`, and `priority` values (homepage and category pages higher priority than individual products).
- Cache/revalidate the sitemap on a reasonable interval (for example, hourly) rather than querying the database on every single crawler hit — this ties to the function-duration and cost concerns raised in the earlier Vercel audit.
- Confirm Next.js's 50,000-URL-per-sitemap limit is not a concern at current catalogue size, and note in your report if a sitemap index would become necessary at some future scale.

---

# TASK 3 — Canonical URLs

Every public page sets a `<link rel="canonical">` pointing at its own canonical production URL. Paginated or filtered catalogue views (if any) canonicalize to the unfiltered/first-page version unless there is a specific reason not to — state your reasoning if you choose otherwise.

---

# TASK 4 — Metadata per page type

Unique, human-written SEO title and meta description for: homepage, each category page, each product page, about, and quote/services pages. One clear focus phrase per page, worked in naturally — not a list of keywords appended to the end. Use these as guidance for the pages they actually match, not applied uniformly:

- Printers category → "printers in Kenya"
- Photocopiers category → "photocopiers in Nairobi"
- Toners/consumables → "toner cartridges Kenya"
- Barcode printers → "barcode printers Kenya"
- ID card printers (Evolis) → "ID card printers Kenya"
- Spare parts → "printer spare parts Kenya"
- Services/maintenance → "printer repair Nairobi"

Product page titles/descriptions should be generated from real product data (name, brand, category) via a template, not hand-written per product, given the catalogue size.

---

# TASK 5 — Structured data

Implement JSON-LD for:

- **Organization**, on the homepage: name, url, logo, telephone, email, and `sameAs` linking the real social profiles (@cetertechnologies). **Do not fabricate a postal address.** If a verified registered address is not yet available in the codebase or environment, omit the `address` field entirely rather than inventing one — the company profile and legal pages still have this marked as a placeholder pending real data.
- **Product**, on each product page: name, image, description, brand, and `offers` with `price`, `priceCurrency: "KES"`, and `availability` mapped from the real stock status field — `in_stock` → `https://schema.org/InStock`, `out_of_stock` → `https://schema.org/OutOfStock`, `backorder` → `https://schema.org/PreOrder` (or `LimitedAvailability`, whichever fits the project's actual backorder behaviour better — state which you chose and why). Pull price from the same field the storefront displays, never a separately hardcoded value. **Do not include `aggregateRating` or `review` structured data unless real review data exists in the database.** Fabricated review markup is a Google Rich Results policy violation, not just inaccurate — leave it out entirely if there is no real review system.
- **BreadcrumbList**, on category and product pages, reflecting the real category hierarchy.

Validate the JSON-LD is syntactically correct (parses as valid JSON, matches schema.org's expected shape for each type) before considering this task done.

---

# TASK 6 — Open Graph and Twitter metadata

Unique OG/Twitter title, description, and image per page type (homepage, category, product).

**Check this specifically:** per the last session's Vercel-readiness report, uploaded and Icecat-enriched product images are stored as database data URLs, not static files. A data URL cannot be used as an `og:image`/`twitter:image` value — social and search crawlers fetch a real, crawlable image URL; they do not reliably parse embedded base64, and it would bloat the page's `<head>` enormously. For any product whose only image is a data URL, fall back to a sensible default (a category-level or brand image, or the site logo) rather than passing the data URL through. Report exactly how many products this affects and what fallback you used.

---

# TASK 7 — Correctly exclude private pages from indexing

This needs the right mechanism, not just "block it":

- Admin, account, login, cart, and checkout pages should carry a `noindex` directive (via Next.js metadata `robots: { index: false }` or an `X-Robots-Tag` header) — this is the correct way to actively keep an already-discovered URL out of the index.
- Do **not** also add these same paths to `robots.txt` disallow unless there is a separate reason to block crawling entirely (for example, admin API routes). If a page is disallowed in robots.txt, Google cannot crawl it to see a `noindex` tag in the first place — which can leave an already-indexed page stuck in the index with no way to remove it via meta tag. Use robots.txt disallow for things that should never be crawled at all (API routes, admin internals); use `noindex` for pages that need an active removal/exclusion signal.
- Confirm the public catalogue itself carries no stray `noindex` and is not accidentally caught by an overly broad robots.txt rule.

---

# TASK 8 — Prepare Google Search Console verification in code

Add support for Search Console's meta-tag verification method: wire a `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (or equivalent) env var into the root layout's metadata, defaulting to nothing if unset (so it does not break the build before the user has a real value). Document this in `.env.example`. You cannot generate the real verification token — that comes from the user's own Search Console account — but the code should be ready to accept it the moment they add it.

---

# TASK 9 — Inject the Privacy Policy and Terms and Conditions as real pages

Two markdown files have been added to the project by the user — locate them (search for distinctive content such as "Data Protection Act, No. 24 of 2019" for the privacy policy and "Consumer Protection Act, No. 46 of 2012" for the terms, since the exact filename/location is not known in advance).

- Render each as a real page at a sensible route (`/privacy-policy` and `/terms-conditions`, or whatever matches this project's existing convention for static pages) using the project's markdown rendering if it has one, or a minimal one if not.
- Add both to the sitemap as indexable, low-priority pages, and link both from the site footer — the original design reference for this footer already called for a legal links bar.
- **Do not alter or fill in the bracketed placeholders** in either document (registered office, incorporation number, KRA PIN) — leave them exactly as `[To be completed]` so nobody mistakes placeholder text for real information. List every remaining placeholder in your final report so the user knows what still needs their real business details.
- Set the "Effective date" placeholder in each document to today's deployment date, and state in your report exactly what date you used.
- The Terms and Conditions document references "[insert Privacy Policy URL]" in its Privacy section — once both pages are live, replace that placeholder with the real, live URL of the deployed privacy policy page. This is the one placeholder substitution you should make automatically, since it is mechanical rather than a legal fact.

---

# Verify — actually check the output, not just that the build passed

- Build the project and inspect the real generated `sitemap.xml` and `robots.txt` output. Report the actual URL count in the sitemap and paste 5 representative entries.
- Confirm every URL in the sitemap, every canonical tag, and every OG URL uses `https://www.cetertechnologies.com` (or the canonical host you confirmed in Task 0) — grep for `localhost` and any preview-deployment domain across the generated output and confirm there are zero matches.
- Load a product page, a category page, and the homepage (in dev or a local build) and confirm the JSON-LD, canonical tag, and OG tags are actually present in the rendered HTML — not just that the code compiles.
- Confirm admin/account/login pages carry `noindex` and are absent from the sitemap.
- Run lint, type-check, and a production build. Fix what this task caused; report anything pre-existing and out of scope.

---

# Report

1. The exact Google Search Console steps the user must perform manually, including which property type to use (Domain property is generally preferable here since it covers `www`/apex/http/https in one verification) and how to complete verification given what Task 8 prepared in code.
2. The exact sitemap URL to submit in Search Console.
3. Every page or route intentionally excluded from indexing, and which mechanism (noindex vs. robots.txt disallow) was used for each and why.
4. Any remaining SEO problem you found but did not fix, and why.
5. The canonical domain decision from Task 0 (www vs apex) and whether a redirect was already in place or you added one.
6. How many products were affected by the data-URL image limitation in Task 6, and what fallback image is now used for them.
7. Every placeholder left in the Privacy Policy and Terms and Conditions pages that still needs the user's real business details, and the effective date you set on each.
