/goal Fully replace the existing Ceter Technologies admin frontend with a new, original Ceter-branded implementation based on an exhaustive read-only inspection of the authenticated AccurateBook application. Connect the new admin to Ceter’s storefront and authoritative business data. Continue until every safely discoverable reference feature and visual detail is implemented and verified.

## Non-negotiable interpretation

Delete and replace the existing admin frontend, including its layouts, navigation, components, pages, styles, typography, and information architecture.

## Mandatory Chrome inspection gate

Connect to the existing Chrome DevTools Protocol endpoint:

http://127.0.0.1:9222

Attach to the already-authenticated tab whose URL begins with:

https://app.myaccuratebook.com/dashboard/default

Use Playwright, Puppeteer, or direct CDP commands as appropriate.

## Independent discovery

Do not use a module list supplied by the user or inferred from the existing Ceter admin.

Systematically and safely traverse every accessible AccurateBook:

* Navigation item and nested menu
* Page, route, tab, dialog, drawer, and dropdown
* Dashboard card, chart, table, column, filter, and report
* Form, field, validation rule, and document view
* Search, sorting, pagination, print, and export control
* Record action and status workflow
* Loading, empty, success, warning, disabled, and error state
* Desktop, tablet, and mobile presentation
* Hover, focus, active, expanded, and collapsed state


## Design extraction

Inspect the rendered DOM and computed CSS. Record measurable values instead of estimating them, including:

* Font families, lawful sources, fallbacks, sizes, weights, and line heights
* Letter spacing, colors, backgrounds, borders, radii, and shadows
* Sidebar width, header height, content width, row height, and control dimensions
* Margins, padding, spacing, alignment, grids, and responsive breakpoints
* Icons, transitions, hover, focus, active, disabled, and validation styling
* Table density, form geometry, modals, menus, charts, and document layouts

Capture representative screenshots at identical desktop, tablet, and mobile viewport sizes.

Implement the observed interface.

## Complete replacement

after the reference crawl and repository dependency audit are complete:

1. Build the new admin design system and route structure.
2. Implement every discovered page and workflow.
3. Connect every feature to genuine Ceter data and services.
4. Replace the corresponding old admin route.
5. Remove the obsolete admin presentation code.
6. Test the replacement before continuing.
7. Repeat until no old admin interface remains.

Do not modify the existing admin shell and call that a replacement. Create a genuinely new shell, navigation system, components, styles, routes, and responsive behavior from scratch without relying on the existing one.

Do not leave placeholders, generic tables, inactive buttons, fake charts, fake provider results, or assumed functionality.

When a discovered feature requires missing backend support, implement the necessary schema, migration, authorization, validation, server logic, audit behavior, and tests.

## Storefront connection

Use the same authoritative database and services as the storefront.

Safely verify that relevant admin operations affect storefront products, prices, availability, inventory, orders, customer accounts, payments, and customer documents.

Storefront-created activity must appear in the new admin where appropriate.


## Verification loop

For every manifest entry:

1. Inspect the reference page and behavior.
2. Capture its styles and screenshots.
3. Implement the Ceter equivalent.
4. Open the authenticated local Ceter page.
5. Compare both at identical viewports.
6. correct typography, spacing, dimensions, hierarchy, states, and behavior.
7. Test its real functionality and storefront connection.
8. Repeat until no material unexplained difference remains.
9. Mark it implemented, connected, tested, and visually verified.

A route, Prisma query, screenshot, or successful build alone does not constitute completion.

## Completion gate

Finish only when:

* Exhaustive reference traversal is complete.
* Every discovered item is recorded.
* The old admin frontend has been removed.
* Every discovered feature has a functional Ceter implementation.
* Every visible control works.
* Storefront synchronization is verified.
* Authentication and authorization work.
* Desktop, tablet, and mobile comparisons are complete.
* Linting, type checking, tests, Prisma validation, and production build pass.
* Authenticated runtime smoke testing passes.
* The final Git diff has been reviewed.
* Every manifest entry is complete.
* No safely implementable discovered work remains.

The final response must state what was implemented, deleted, connected, migrated, and tested; exact test results; runtime-verification results; all modified and deleted files; deployment steps; rollback steps; and any reference behavior that was technically inaccessible.
