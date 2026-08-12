Work on the existing Ceter Technologies project. These are changes and defects observed in the running admin at `localhost:3000/admin`.

Task 8 is a written explanation, not code. Do it last but do not skip it.

---

# TASK 1 — The sidebar is not collapsible

The approved mockup specifies a collapsible sidebar. The current one is fixed.

- Add a collapse toggle. Expanded shows icon plus label at 232px. Collapsed shows icons only at roughly 64px, with the label as a tooltip on hover and focus.
- Persist the collapsed state per user across sessions and page loads.
- The content area reflows to reclaim the space — no dead gap, no horizontal scrollbar appearing at collapse.
- Below 860px the sidebar becomes an overlay drawer with a backdrop, closing on backdrop click, on Escape, and after a navigation. Collapse and drawer are two different behaviours; implement both.
- Keyboard operable, with a visible focus ring on the toggle and an `aria-expanded` state.
- Count badges stay visible when collapsed — show them as a small dot or numeral on the icon rather than dropping them.

---

# TASK 2 — Wrong brand mark in the sidebar

The sidebar shows the icon beside the words `Ceter` and `OPERATIONS`. It must use the supplied **horizontal lockup that reads "Ceter Technologies"** from the logo pack — the same mark the storefront header uses — so the two surfaces carry identical branding.

- Use the lockup SVG. Prefer the reversed or white variant against the dark sidebar; do not recolour the standard version in CSS.
- Drop the `OPERATIONS` wordmark entirely. If a section label is wanted, it belongs as a small caption below the lockup, not as part of the mark.
- When the sidebar is collapsed, swap to the icon-only mark, keeping the same optical size and padding.
- The lockup links to the storefront homepage with an accessible label.
- Set explicit width and height so nothing shifts on load.
- Check every other place a mark appears — login page, favicon, page metadata, any email or document template — and confirm all use the pack assets rather than a text substitute.

---

# TASK 3 — Collapse the role system to a single admin

Remove the multi-role model. There is one administrator with full rights.

- Delete the `Preview role` control from the top bar.
- Remove the `OWNER | MANAGER | SALES | STORE` distinction and every conditional that branches on it. Cost, margin, supplier data, pricing and stock are all visible and editable to the admin.
- **Keep the customer versus admin distinction.** Every admin route and server action must still verify the signed-in user is an administrator. Do not weaken that check while removing the internal roles, and never expose cost, margin or supplier data through a public route or storefront query.
- Keep the audit log and stock movement ledger, still recording the acting user. With one admin the value is the history, not the permission — you still need to know what changed and when, especially for tender pricing.
- Remove role columns, enums and helpers that become unused. Report exactly what you removed. If a role field is load-bearing for authentication, say so and leave it rather than breaking login.

Note in your report whether this leaves any dead code paths or unused database columns, so they can be cleaned up in a later migration rather than dropped destructively now.

---

# TASK 4 — Bulk selection with a contextual action bar

The admin needs to act on many rows at once, and the controls must stay out of the way until they are needed.

- Add a checkbox column to the catalogue and inventory tables, plus a header checkbox for select-all-on-page, with an indeterminate state when only some rows are selected.
- When the page is fully selected and more rows exist beyond it, offer `Select all N matching this filter` explicitly. Never let a select-all silently reach rows the admin cannot see.
- **The action bar is hidden until at least one row is selected**, then slides in showing the selection count and the available commands: Delete selected, Publish, Unpublish, Set category, Adjust price, Set stock, Export selected, Clear selection.
- `Escape` clears the selection. Selection survives sorting and pagination within the same filter, and clears when the filter changes.
- Shift-click selects a range.

**Deletion safety — this is the part that must not be rushed:**

- Never hard-delete a product that is referenced by an order, a quote, a stock movement or a serial number. Archive it instead: hidden from the storefront and from default admin lists, still intact behind an `Archived` filter, and still resolvable from historical documents. Destroying a product that appears on a delivered order corrupts your own records.
- Products with no references may be hard-deleted.
- Destructive bulk actions require a confirmation that states exactly what will happen, names the count, and distinguishes how many will be archived versus deleted.
- Show a brief undo window after the action completes.
- Write an audit log entry per affected record, not one for the batch.
- Report partial failure honestly: `Archived 12 of 14 — 2 could not be changed` with the reason per row.

---

# TASK 5 — Every product is missing an MPN

The part number column now reads `-` and every row carries a `Missing MPN` badge, so the field exists but no data has been populated. In this state Icecat lookup cannot work and part-number search returns nothing.

- Make MPN editable inline in the inventory matrix, the same way stock and price are, so the whole catalogue can be filled in one pass.
- Include MPN in the import and export templates.
- Add a `Missing MPN` filter so the admin can work through exactly those rows.
- Keep MPN separate from slug and SKU, and never derive it from the product name.

---

# TASK 6 — Price column wraps

Prices break across two lines, with the currency on one line and the figure on the next. Widen the column, prevent wrapping on the formatted value, and right-align the figures with tabular numerals so the digits line up down the column. Check at 1280px and 1024px.

---

# TASK 7 — Compatibility editor is still missing

The side panel still reads `Nothing mapped yet` with no way to map anything. This has now been outstanding across two rounds.

Build the attach flow from the approved mockup: search the catalogue, attach a consumable or spare part with a relation type, view and edit from both the printer side and the consumable side, and remove a mapping. Until this exists the compatibility table can never be populated, so the storefront fit lists and the cross-stock warnings stay permanently empty.

---

# TASK 8 — Explain the repeated banner failure

The banner images have now failed across multiple rounds of fixes, each reported as resolved. Before writing any more code, produce a written explanation covering:

1. **What was actually broken each time.** For every attempt so far, state the specific cause and why the fix did not hold. If an earlier diagnosis was wrong, say which one and how you know now.

2. **Why the build check passed while the page stayed broken.** The validation reported success while the browser received nothing. Explain precisely what the check was testing versus what the browser requests.

3. **The current status.** With the dev server running, `curl -I` each banner URL and report the status codes. State plainly whether the images now load in the browser.

4. **Whether the approach needs to change.** Answer this directly rather than defending the current design. Specifically assess:
   - Whether the long mixed-case underscored folder name `Ceter_Technologies_Banners_Photorealistic/01_Homepage_Hero/` is itself the hazard, given the repeated failures and the Windows-to-Linux case difference.
   - Whether normalising to short lowercase hyphenated paths such as `/banners/hero-office-printer-desktop.webp` would remove a whole class of failure. Earlier instructions said not to rename the supplied assets; that constraint is now lifted if renaming is the reliable fix. Copy rather than move, and keep the original pack untouched in the repository.
   - Whether the `<picture>` element with WebP sources and JPG fallbacks is adding failure modes for no benefit, given that every browser this site targets supports WebP.
   - Whether serving these through `next/image` or as plain `<img>` is more reliable here.

5. **Your recommendation**, with the reasoning, and what you would need to change to be confident it will not break again.

Then implement the recommendation and verify by loading the homepage in the browser and confirming photographs render — not the fallback panel, and not a passing build.

---

# Verify in the running application

Do not report any of this complete on the basis of a passing build:

1. Collapse and expand the sidebar; reload and confirm the state persisted; check the drawer below 860px.
2. Confirm the sidebar shows the Ceter Technologies lockup and links to the storefront.
3. Confirm no role selector remains, and that signing in as a non-admin still cannot reach `/admin`.
4. Select rows, confirm the action bar appears only then, archive a product that is referenced by an order and confirm the order still renders correctly.
5. Enter an MPN inline, refresh, and confirm it persisted.
6. Confirm prices render on one line.
7. Attach a consumable to a printer, refresh, and confirm it persisted.
8. Load the homepage and confirm banner photographs render.

Then run lint, type-check and a production build.

Report the files changed per task, the verification result for each item above, and the full written answer to Task 8. Where something is still broken, say so plainly.
