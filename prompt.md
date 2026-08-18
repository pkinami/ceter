Perform a focused desktop and laptop density redesign for the Ceter Technologies storefront. Implement the changes; do not only provide recommendations.

## 1. Create a thinner desktop banner

The current desktop banner is too tall and dominates the page.

Change it to:

* `220–250px` high on 1280px and 1366px laptops.
* Maximum `270–290px` on larger desktops.
* Approximately `3.8:1` to `4:1` aspect ratio.
* Heading size of `38–42px`, not the current oversized typography.
* Supporting text of `15–16px`, preferably one line.
* CTA button approximately `40–44px` high.
* Text area limited to approximately 45% of the banner.
* Product imagery positioned clearly on the right.
* Focal-point-aware cropping without stretching or distortion.
* Small `7–8px` circular carousel indicators.
* No oversized pill indicators or excessive zoom animation.

Preserve the existing banner content, database integration and admin focal-point system. Do not replace real banner assets with generated images.

## 2. Improve above-the-fold content

At `1366×768`, users should see:

* Contact/navigation header
* Complete thin banner
* Complete Featured Categories row
* Beginning of the first product section

Reduce unnecessary vertical margins and padding so products appear sooner.

## 3. Fix Featured Categories distribution

There are five categories, but the current four-column grid leaves one card alone on the second row.

On laptop and desktop screens:

* Display all five category cards in one equal-width row.
* Make cards approximately `100–120px` high.
* Use compact icons of approximately `32–36px`.
* Use `14–15px` category titles.
* Clamp descriptions to one line or hide them where space is limited.
* Keep consistent card dimensions and `12–16px` padding.
* Avoid orphan cards and large empty areas.

If additional categories are introduced, use a responsive compact rail or balanced grid.

## 4. Refine the sidebar

* Use a stable width of approximately `225–240px`.
* Stop truncating important labels such as “Printers & Photocopiers” and “Printer Parts & Accessories”.
* Allow category names to wrap onto two lines.
* Reduce excessive vertical spacing.
* Initially show approximately six brands with a “Show more” control.
* Keep the sidebar sticky below the header where appropriate.
* Ensure it never causes page-level horizontal overflow.

## 5. Establish desktop typography hierarchy

Use approximately:

* Banner heading: `38–42px`
* Page title: `28–32px`
* Section heading: `21–23px`
* Product title: `15–17px`
* Category title: `14–15px`
* Body text: `14–16px`
* Supporting text: `12–13px`
* Navigation: `13–14px`
* Price: `20–24px`

Reduce unnecessary extra-bold text and maintain consistent line heights.

## 6. Tighten the desktop header

* Contact bar: approximately `26–28px` high.
* Main navigation: approximately `64–68px` high.
* Search width: approximately `380–430px`.
* Reduce excessive gaps between navigation actions.
* Align the header, sidebar, banner and content to a consistent maximum-width container.
* Preserve search, WhatsApp, cart and authentication functionality.

## 7. Regression protection

Do not undo the existing mobile improvements:

* Compact mobile banner
* Mobile product rails
* Two-column mobile product grids
* Product-card swipe cancellation
* Mobile menu behavior
* Mobile category grid
* Admin responsive layouts

Do not use global `overflow-x: hidden` to conceal broken layouts.

## 8. Testing

Test at:

* `1024×768`
* `1280×720`
* `1366×768`
* `1440×900`
* `1600×900`
* `1920×1080`
* `390×844` for mobile regression verification

Confirm:

* Banner stays within the required height.
* Banner text and imagery remain readable.
* All five categories appear in one row where space permits.
* No category is orphaned.
* Sidebar labels are readable.
* Product content begins within or near the first laptop viewport.
* No page-level horizontal overflow exists.
* Mobile layouts and touch interactions remain correct.

Run:

* `npm run lint`
* `npx tsc --noEmit`
* `npm run build`
* Relevant Playwright responsive checks

Provide before-and-after screenshots at `1366×768` and `1440×900`, files changed, measurements, test results and remaining limitations.
