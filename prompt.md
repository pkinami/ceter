codex exec "

Improve the legal pages and company profile styling.

TASK 1 — REMOVE PLACEHOLDER LEGAL DETAILS

Inspect:
- /privacy-policy
- /terms-conditions
- the source markdown/legal files

Remove these placeholder fields completely:

- Address: [To be completed]
- Registered office: [To be completed]
- Certificate of Incorporation No.: [To be completed]
- KRA PIN: [To be completed]

Do not replace them with fake information.
Do not leave empty table rows.
Remove the entire sections if they only exist for those missing details.

The pages should read professionally without incomplete placeholders.

---

TASK 2 — EXPAND ABOUT US PAGE

Improve /about into a complete Ceter Technologies Limited company profile.

Include:

- Company introduction
- Who we are
- Our mission
- Our vision
- Our values
- What we offer:
  - Printers and photocopiers
  - Toners and consumables
  - Printer spare parts
  - Barcode and POS solutions
  - ID card printing solutions
  - Office equipment
  - IT and business technology solutions
  - Printer repair and maintenance services

Explain that Ceter Technologies serves businesses, institutions, offices and organizations requiring reliable technology solutions.

Add sections:
- Why choose Ceter Technologies
- Professional support and installation
- Procurement support
- After-sales service
- Customer-focused approach

Keep all claims realistic. or you can access ceter/Ceter_Technologies_Company_Profile 2.docs to find more
Do not invent awards, certifications, locations, clients or partnerships.

---

TASK 3 — STYLE PRIVACY POLICY AND TERMS PAGES

Currently:
- /privacy-policy
- /terms-conditions

appear as plain unstyled text.

Redesign them to match the Ceter Technologies website theme.

Use:
- same typography
- same colors
- same spacing
- same container width
- same cards/background style as the rest of the application

Create reusable legal page components if needed.

Requirements:

- Add page header/banner section
- Add document title
- Add effective date styling
- Add table of contents/navigation for long sections
- Style headings:
  H1
  H2
  H3

- Style paragraphs and lists
- Improve readability on mobile
- Add proper spacing between sections
- Keep footer/header consistent with the rest of the website

Do not change the legal meaning of the documents.
Only improve formatting and remove placeholders.

---

TASK 4 — SEO CHECK

Ensure:

- Privacy page metadata remains correct
- Terms page metadata remains correct
- Both remain in sitemap
- Canonical URLs remain correct
- Legal pages remain indexable

---

TASK 5 — VERIFY

Run:

npm.cmd run lint
npx.cmd tsc --noEmit
npx.cmd prisma validate
npm.cmd run build

Report:
- files changed
- placeholders removed
- sections added to About page
- styling changes made
- verification results
"