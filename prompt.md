Perform a complete, production-grade responsive design audit, mobile interaction test, and frontend upgrade for the entire Ceter Technologies storefront.

Do not merely identify or describe problems. Inspect the existing codebase, reproduce each issue, implement the necessary fixes, and verify the finished application through browser-based testing.

## Primary objective

Transform the storefront into a polished, premium, enterprise-level ecommerce experience comparable to modern technology brands.

The application must provide smooth, consistent navigation across phones, tablets, laptops, desktops, touchscreens, mouse input, and keyboard navigation.

Do not assume that any current page, component, breakpoint, or interaction is correct.

## Critical mobile interaction bug — highest priority

There is a serious mobile usability problem involving product cards:

When a user touches a product and drags their finger to scroll vertically, the product sometimes expands, opens, or navigates automatically. This interrupts scrolling and makes mobile navigation frustrating.

Reproduce, diagnose, and permanently fix this behavior throughout the storefront.

Required behavior:

* A vertical or horizontal swipe beginning on a product card must scroll normally.
* A product must open or expand only after a deliberate tap or click.
* `touchstart`, `pointerdown`, dragging, or scrolling must never trigger product navigation or expansion.
* Cancel product activation when pointer movement exceeds a reasonable touch-movement threshold.
* Do not use `preventDefault()` in a way that blocks natural page scrolling.
* Do not attach navigation directly to `touchstart` or `pointerdown`.
* Prevent nested buttons, wishlist controls, quantity controls, and other interactive elements from triggering the product card.
* Do not allow event bubbling to cause unintended navigation.
* Avoid hover-dependent behavior on touch devices.
* Maintain normal mouse clicking and keyboard accessibility.
* Pressing Enter or Space on an appropriately focused product link must behave correctly.
* Fast scrolling, slow scrolling, momentum scrolling, diagonal swiping, repeated swiping, long pressing, and scrolling from directly over an image must not open a product.
* No product quick-view, modal, accordion, or detail panel may open during a scroll gesture.

Test this behavior using touch-enabled mobile emulation and, where supported, mobile Safari and Android Chrome behavior.

This issue is a release blocker. Do not consider the work complete until it is fixed and verified.

## Phase 1 — application and responsive audit

Inspect every major customer-facing and administrative page, including:

* Homepage
* Search results
* Category pages
* Product listings
* Product details
* Cart
* Checkout
* Login
* Registration
* Password recovery
* Customer account pages
* Quote-request forms
* Admin login
* Admin dashboard
* Product management
* Category management
* Banner management
* Relevant empty, loading, validation, and error states

Identify and fix:

* Horizontal page scrolling
* Container overflow
* Clipped or overlapping text
* Broken grids
* Oversized or distorted images
* Layout shifts
* Unreadable typography
* Inconsistent spacing
* Touch targets smaller than approximately 44×44 CSS pixels
* Forms extending beyond the viewport
* Dropdowns or modals wider than the screen
* Sticky elements covering content
* Navigation collisions
* Broken tables on mobile
* Incorrect stacking order
* Unexpected content expansion
* Hover-only controls
* Unstable banners
* Mobile keyboard and input problems
* Content hidden behind fixed headers or bottom bars

Inspect the root cause of each issue. Do not conceal layout problems using broad `overflow-x: hidden` rules unless overflow is genuinely intentional and the underlying component is correct.

## Phase 2 — responsive design system

Establish a consistent mobile-first design system using the project’s existing architecture.

Implement:

* Consistent breakpoints
* Fluid layouts
* Sensible maximum-width containers
* Responsive typography using `clamp()` where appropriate
* Fluid spacing
* Flexible grids
* Responsive columns
* Reusable layout primitives
* Safe mobile page padding
* Proper touch targets
* Accessible focus states
* Consistent border radii, shadows, and visual hierarchy
* Correct safe-area handling on supported mobile devices

Avoid fragile fixed widths, device-specific hacks, duplicated CSS, and unnecessary `!important` rules.

Preserve the existing brand identity and business functionality while improving layout quality and consistency. Do not make unrelated backend or business-logic changes.

## Phase 3 — banner system redesign

Redesign the banner system so one high-quality master image can work intelligently across multiple screen ratios.

The administrator should not be required to upload separate desktop and mobile images.

Each banner should support:

* One high-resolution master image
* Focal-point metadata
* Left, center, right, or custom focal-point positioning
* Optional crop metadata when a single automatic crop cannot preserve the subject
* Responsive image sizes
* Next.js Image optimization where the project uses Next.js
* CSS `aspect-ratio`
* Appropriate `object-fit` and `object-position`
* Efficient loading and responsive source selection

Banners must:

* Never stretch or distort
* Never create unexplained black bars
* Avoid cutting off the selected focal subject
* Maintain predictable heights at each breakpoint
* Prevent cumulative layout shift
* Display cleanly on ultrawide screens
* Remain readable when text overlays are present
* Preserve accessible contrast
* Fall back gracefully if crop metadata is unavailable

If the master image cannot mathematically preserve important content across every aspect ratio, use focal-point-aware cropping or optional crop metadata instead of distortion.

## Phase 4 — product image presentation

Upgrade product cards, carousels, quick views, and product-detail galleries.

Ensure that:

* Images fit their containers professionally.
* Product aspect ratios remain correct.
* Portrait and landscape images are handled consistently.
* Images never stretch.
* Unnecessary black backgrounds and heavy shadows are removed.
* Image containers do not jump while loading.
* Placeholder and missing-image states look intentional.
* Thumbnails remain usable on small phones.
* Product cards retain consistent heights without clipping useful information.
* Zoom and gallery controls work with touch, mouse, and keyboard input.
* Swiping an image gallery does not accidentally open or navigate away from the product.

## Phase 5 — navigation

Improve desktop, tablet, and mobile navigation.

Implement and verify:

* A reliable hamburger menu
* Predictable sticky-header behavior
* Visible account, search, and cart actions
* Correct menu stacking and z-index
* Scroll locking only while an overlay menu is intentionally open
* Clear menu close behavior
* No overlapping navigation elements
* One-handed mobile usability
* Correct back-button behavior
* Keyboard-accessible menus and dialogs
* Visible focus states
* No accidental activation during touch scrolling

## Phase 6 — forms and checkout

Audit all login, registration, checkout, quote, search, account, and admin forms.

Ensure that:

* Fields stack correctly on small screens.
* Inputs never exceed the viewport.
* Mobile keyboards do not hide important controls.
* Dropdowns, date pickers, and validation messages fit the screen.
* Buttons become full width where appropriate.
* Labels remain visible and readable.
* Error messages do not break the layout.
* Autofill works correctly.
* Appropriate input types and autocomplete attributes are used.
* Checkout remains usable at 320px width.
* No horizontal scrolling occurs.
* Loading and submission states prevent duplicate actions.

## Phase 7 — accessibility and interaction quality

Verify:

* Semantic links and buttons
* Keyboard navigation
* Visible focus indicators
* Appropriate ARIA attributes
* Dialog focus trapping and restoration
* Escape-key handling
* Reduced-motion preferences
* Sufficient color contrast
* Meaningful image alternative text
* Logical heading structure
* No clickable non-semantic elements unless fully accessible

Do not sacrifice accessibility while fixing touch behavior.

## Phase 8 — required viewport and device testing

Test at minimum:

### Phones

* 320×568
* 360×800
* 375×812
* 390×844
* 414×896

### Tablets

* 768×1024 portrait
* 1024×768 landscape
* Representative Android tablet
* Touch-enabled tablet behavior

### Laptops and desktops

* 1280×720
* 1366×768
* 1440×900
* 1600×900
* 1920×1080
* At least one ultrawide viewport

Test both portrait and landscape modes where relevant.

Do not test only by resizing the browser. Use touch emulation and real pointer-event behavior where available.

## Phase 9 — end-to-end journey testing

Verify these complete customer journeys:

1. Homepage → category → product listing → product detail → cart → checkout.
2. Search → product → cart.
3. Mobile menu → category → product.
4. Login → customer account.
5. Registration and password recovery.
6. Repeatedly scroll through product cards without accidental opening.
7. Add, update, and remove cart items on a phone.
8. Complete all checkout steps at 320px width.

Verify these administrator journeys:

1. Admin login → dashboard.
2. Product creation and image upload.
3. Product editing.
4. Category creation and editing.
5. Banner upload, focal-point selection, preview, update, and deletion.
6. Form validation and error handling on mobile and desktop.

## Phase 10 — automated checks and validation

Use the project’s existing testing tools. Add focused regression tests for the product-card touch-scroll bug where practical.

Run:

* `npm run lint`
* `npx tsc --noEmit`
* `npm run build`
* Existing automated tests
* Relevant Playwright, Cypress, or browser tests if configured

Resolve errors introduced by the changes. Do not suppress TypeScript, lint, build, or accessibility errors merely to make checks pass.

## Completion criteria

The work is complete only when:

* A user can scroll from anywhere on a product card without opening it.
* Products open only after deliberate activation.
* No major page horizontally scrolls at the required viewport sizes.
* Core customer and administrator journeys work correctly.
* Images and banners remain stable and undistorted.
* Navigation and forms work smoothly on phones.
* Touch, mouse, and keyboard interactions are preserved.
* Linting, type-checking, builds, and applicable tests pass.

## Final report

Provide a concise implementation report containing:

* Root cause of the accidental product-opening bug
* Exact fix implemented
* Files changed
* Responsive issues discovered
* Responsive issues fixed
* Viewports and interactions tested
* Customer and admin journeys tested
* Results of lint, TypeScript, build, and automated tests
* Before-and-after screenshots where possible
* Any remaining limitations
* Any issue that could not be verified and the reason

Do not claim that a viewport, browser, interaction, command, or journey was tested unless it was actually tested.

The finished result must feel like a premium enterprise ecommerce platform, with smooth mobile scrolling and deliberate, predictable interactions—not merely a basic website that happens to resize.
