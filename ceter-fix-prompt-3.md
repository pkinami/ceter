Work on the existing Ceter Technologies project. The admin has regressed from the approved design in `docs/admin-mockup.html`. Open that file and compare it side by side with each running screen before changing anything.

These are layout defects, not preferences. The mockup was approved as built; the implementation has drifted from it.

---

# TASK 1 — The bulk action bar has broken the page layout

When rows are selected on the catalogue screen, the action bar renders as a large dark navy **panel** that occupies roughly half the content width. It pushes the products table into a narrow column where product names wrap across four lines, and the compatibility side panel disappears entirely.

The action bar must be a **slim horizontal bar, not a container**:

- One row of controls, roughly 56px tall, wrapping to a second row only at narrow widths. It never grows into a block of empty space.
- It docks directly above the table, spanning the table container's width only — or floats at the bottom of the viewport like the unsaved-changes bar in the mockup. Pick one and use it on both the catalogue and inventory screens.
- **It must not wrap, contain or resize the table.** Selecting rows must not change the width of the table, the side panel, or anything else on the page. Nothing may reflow except the bar appearing.
- The compatibility side panel stays visible and at full width while rows are selected.
- Verify: select all rows on the catalogue screen and confirm the table column widths are pixel-identical to the unselected state.

---

# TASK 2 — Table columns are clipped and unreachable

On the inventory screen the STATUS column is cut off at the right edge, rendering as `In st` and `Ou st`. Content is being clipped rather than scrolled to.

- The table container scrolls horizontally when the table exceeds it. No column may be clipped or unreachable at any viewport width.
- Set sensible minimum widths per column so the product name column never collapses to the point of wrapping over three or more lines.
- Consider making the product column sticky on horizontal scroll so the admin keeps their bearings.
- Verify at 1280px, 1024px and 768px that every column, including STATUS, can be read in full.

---

# TASK 3 — Numbers are unformatted in the matrix

Prices render as `385000`. They must read as `385,000` with thousands separators and tabular figures when the cell is not focused, switching to the raw editable number on focus and reformatting on blur. Stock counts right-align on the same tabular figures.

Currency is inconsistent again: the inventory header reads `PRICE (KES)` while the catalogue shows `KSh`. Settle it — `KSh` everywhere in the interface, `KES` only in generated quotations, invoices and delivery notes — through the single shared formatter. Put the currency in the column header, not repeated in every cell.

---

# TASK 4 — The MPN column is visual noise

Every row shows the placeholder text `MPN`, repeated fifteen times down the column. Fifteen identical grey words is not a useful empty state.

- Show a muted `—` when the field is empty, revealing the input affordance on hover or focus.
- Surface the real signal once, at the top: `12 products missing a part number` with a filter link, rather than repeating it per row.

---

# TASK 5 — The dashboard is mostly empty boxes

`Quotes waiting on us` and `Orders to fulfil` render as large blank white areas with nothing in them. An empty panel with no content is a bug, not an empty state.

- Every panel gets the designed empty state: a short bold line, one sentence of explanation, and a next action. For example `No quotes waiting` / `New enquiries from the storefront appear here.` / `New quote`.
- Panels in the same row are equal height. No panel is taller than its content requires when neighbouring panels are short.
- Restore the mockup's grid: restock and quotes on the top row, orders / catalogue gaps / recent stock movements across the middle, and the small figures strip at the bottom. `Recent stock movements` is currently missing entirely.
- Cap `Catalogue gaps` at four rows with a `View all` link. It currently runs long enough to dominate the screen.

**The restock list is showing meaningless data.** Every entry reads `No supplier | 0 in stock | reorder 0`. With a reorder level of zero the restock logic has nothing to work from.

- Set a sensible default reorder level per category so the list means something out of the box.
- Where a product has no reorder level or no supplier configured, show a `Set reorder level` action inline instead of printing zeros.
- Do not list a product as needing restock purely because its threshold is unset — that is a configuration gap, and it belongs under catalogue gaps.

---

# TASK 6 — Full fidelity pass against the mockup

Go screen by screen — Dashboard, Catalogue, Inventory, Quotes, Orders — and compare the running page with `docs/admin-mockup.html`. Report every difference you find, then close the gaps.

Pay particular attention to: card headers with the muted tag text on the right, section subheadings, badge sizing and inline wrapping, the muted secondary line under each product name, table row height and vertical rhythm, spacing between cards, and the copy in headings and empty states.

The approved design is dense and quiet. The current build is sparser, with larger gaps and less information per screen. Bring the rhythm back to the mockup.

---

# Verify in the browser, not in the build

1. Select all rows on the catalogue; confirm no column resizes and the compatibility panel stays put.
2. Read the full STATUS column on the inventory screen at three viewport widths.
3. Confirm prices show thousands separators, and that currency is consistent across every admin screen.
4. Confirm the MPN column shows `—` rather than repeated placeholder text.
5. Confirm every dashboard panel shows either content or a proper empty state, and that no panel is blank.
6. Place a screenshot of each screen beside the mockup and confirm they match.

Report the files changed per task, every difference found in Task 6, and the verification result for each item above.
