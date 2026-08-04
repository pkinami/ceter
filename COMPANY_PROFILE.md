# Ceter Technologies Limited Company Profile

## 1. Company Overview

### Company Name

Ceter Technologies Limited.

### Business Description

Ceter Technologies Limited is presented in this repository as a Nairobi-based supplier of office printing equipment, consumables, spare parts, and service solutions. The repository implements a Supabase-backed Next.js storefront for browsing and managing products such as printers, photocopiers, toners, ink, spare parts, barcode and label printers, and ID card printers.

### Mission

Requires owner confirmation.

The repository does not provide an explicit company mission statement. A possible mission statement should only be adopted after approval by the company owner or authorized representative.

### Vision

Requires owner confirmation.

The repository does not provide an explicit company vision statement.

### Core Values

Requires owner confirmation.

The repository does not define formal core values. Based on the application design, the company may be able to evidence an operational focus on product availability, procurement visibility, customer access, and service responsiveness, but these should not be presented as official values without owner confirmation.

## 2. Company Capabilities

The following capabilities are supported by the repository. Where a capability is only partially demonstrated, the limitation is stated.

### Web Application Development

Ceter Technologies can legitimately demonstrate development of a modern web application using the Next.js App Router, React, TypeScript, Tailwind CSS, and server/client components. The project includes customer-facing pages, admin pages, reusable components, server actions, middleware, and build scripts.

### E-commerce Systems

The repository implements a business-to-customer and procurement-oriented storefront with product listings, product detail pages, cart functionality, order creation, order history, pricing in Kenyan shillings, stock status, product conditions, and related product display. Payment processing is not completed in the current repository; checkout creates a pending order before payment integration.

### Database Design

The project contains a structured commerce database schema with categories, brands, products, profiles, carts, orders, order items, and quote requests. It also includes relational constraints, indexes, enum types, triggers, and row-level security policies.

### PostgreSQL

The database layer is implemented for PostgreSQL through Supabase Postgres and Prisma. SQL migrations define tables, constraints, indexes, enums, triggers, functions, and row-level security.

### Prisma ORM

The admin data layer uses Prisma for privileged server-side database access. The repository includes a Prisma schema, Prisma migration, Prisma configuration, Prisma client dependency, and scripts for validation, generation, migration deployment, seeding, and database verification.

### Next.js

The application is built with Next.js 15 and uses the App Router, metadata exports, server components, client components, server actions, middleware, routing, dynamic product routes, and production build scripts.

### React

The application uses React 18 components for the storefront, catalog, cart, account, authentication, quote form, admin dashboard, notifications, filters, carousel, and reusable UI controls.

### TypeScript

The codebase is written in TypeScript and includes typed data models, typed component props, Prisma types, Supabase result mapping, and project-wide TypeScript configuration.

### Supabase

The project uses Supabase for authentication, browser and server clients, PostgreSQL database access, row-level security, and customer-facing data operations. Supabase environment variables are documented in the repository.

### Authentication

The application implements customer sign-up, sign-in, sign-out, profile update, authenticated account pages, authenticated order history, cart persistence for signed-in users, and role-based admin access checks. Supabase Auth is the authentication provider.

### Admin Dashboards

The `/admin` route implements a role-protected dashboard with metrics for total products, low stock or backorder products, new quote requests, and recent orders. It also includes product management, product filtering, order status updates, and quote status updates.

### Inventory Management

Inventory features include product stock status, stock quantity, low stock/backorder reporting, stock filters, product condition, and product create/update/delete operations in the admin panel.

### Product Catalog Management

The repository supports product categories, brands, product slugs, descriptions, prices, images, specifications, featured products, stock status, and product condition. Admin users can create, edit, filter, and delete products.

### Order Management

The storefront creates pending orders from cart contents for authenticated users and records order items with purchase-time prices. Customers can view order history, while admins can view recent orders and update order status.

### Quote Management

Customers can submit service and procurement quote requests with validation. Admin users can view recent quote requests and update quote status through the admin dashboard.

### Responsive Web Design

The application includes responsive layouts for desktop and mobile, including mobile category drawers, responsive grids, adaptive headers, and responsive catalog/product/cart pages using Tailwind CSS classes.

### Cloud Deployment

The repository is prepared for deployment to a cloud environment compatible with Next.js. Vercel is included as a development dependency, and the README references configuring environment variables in Vercel. No deployed production URL is provided in the repository.

### API Integration

The application integrates with Supabase APIs through server-side and client-side clients. It also includes WhatsApp deep links for product inquiries and general contact. No payment gateway API integration is completed in the current repository.

### Other Demonstrated Capabilities

- Row-level security design for customer and admin data access.
- Server-side session middleware using Supabase SSR.
- Guest cart storage using browser local storage.
- Cart migration from guest storage to authenticated Supabase cart records.
- Database verification scripting.
- Admin setup scripting.
- Seed data management for categories, brands, and products.
- Toast notifications and asynchronous button states.
- Product quick-view and animated UI interactions.
- Metadata and SEO descriptions for key pages.
- Procurement-friendly quote and catalog workflows.

## 3. Products

### Ceter Technologies Store Platform

The Ceter Technologies Store platform is a web-based storefront and internal administration system for office printing equipment and related services. It enables customers and procurement users to browse a structured catalog of printers, photocopiers, toners, ink products, spare parts, barcode and label printers, and ID card printers.

The platform presents product information in a procurement-friendly format, including category, brand, description, pricing in Kenyan shillings, condition, stock status, stock quantity, product specifications, and related products. Customers can add products to a cart, create an account, maintain profile details, create pending orders, and review order history.

For service-led engagements, the platform includes a quote request workflow for printer repair, photocopier installation, toner supply, spare parts, and managed print service inquiries. Submitted requests are stored in the database and can be reviewed by administrators.

For company operations, the platform includes a role-protected admin dashboard for product catalog administration, inventory visibility, order status management, and quote request management. The database is structured with PostgreSQL, Prisma, Supabase Auth, and row-level security, supporting a controlled separation between public catalog browsing, authenticated customer activity, and privileged administrative operations.

Payment collection, logistics automation, invoicing, and third-party ERP integration are not confirmed as implemented in the current repository.

## 4. Technical Competencies

### Languages

- TypeScript
- JavaScript
- SQL
- CSS

### Frameworks and Runtime Platforms

- Next.js 15
- React 18
- Node.js
- Next.js App Router
- Next.js middleware
- Next.js server actions

### Styling and UI

- Tailwind CSS
- PostCSS
- Autoprefixer
- Framer Motion
- Lucide React icons
- Sonner toast notifications
- Custom reusable React components

### Databases and Data Access

- PostgreSQL
- Supabase Postgres
- Prisma ORM
- Prisma Client
- `pg` PostgreSQL driver
- JSONB product images and specifications
- Relational schema design
- Indexes, constraints, enums, triggers, and functions

### Authentication and Authorization

- Supabase Auth
- Supabase SSR session handling
- Cookie-based session refresh middleware
- Role-based admin access using `profiles.role`
- PostgreSQL row-level security policies

### Cloud Services and Deployment

- Supabase
- Vercel-ready configuration and dependency
- Environment-based configuration for database and Supabase credentials

### Tooling

- npm scripts
- ESLint 9
- Next.js ESLint configuration
- TypeScript compiler configuration
- Prisma CLI
- Database migration deployment script
- Database seed script
- Supabase database verification script
- Admin setup script

### CI/CD

Requires owner confirmation.

The repository includes build, lint, migration, seed, and verification scripts, but no GitHub Actions, GitLab CI, Azure DevOps, or other CI/CD workflow file was found in the inspected repository.

## 5. Project Highlights

- Supabase-backed storefront for office printing equipment and consumables.
- Product catalog with categories, brands, pricing, condition, stock status, stock quantity, images, and specifications.
- Dynamic product detail pages with related products.
- Featured products on the home page.
- Category and brand browsing.
- Responsive catalog and filter interfaces.
- Guest cart using local storage.
- Authenticated cart persistence in Supabase.
- Guest cart migration after sign-in.
- Pending order creation from cart contents.
- Customer account page with profile editing and order history.
- Supabase email/password sign-up and sign-in.
- Role-protected admin dashboard.
- Product create, edit, delete, and filter workflows.
- Inventory indicators for low stock and backorder items.
- Order status update workflow.
- Quote request form with client-side validation.
- Admin quote request status workflow.
- PostgreSQL schema with RLS policies, triggers, indexes, and enums.
- Seed data for six product categories, ten brands, and fifteen products.
- WhatsApp product inquiry links.
- Vercel-oriented environment variable guidance.

## 6. Company Strengths

The following strengths are measurable from the repository:

- Demonstrated implementation of a full-stack commerce application with customer, admin, catalog, cart, order, and quote modules.
- Structured PostgreSQL schema covering eight core commerce tables.
- Row-level security policies defined for all core public tables.
- Database verification script checks required tables, enum values, functions, triggers, indexes, policies, and seed counts.
- Seed catalog includes six categories, ten brands, and fifteen product records.
- Admin dashboard includes product, quote, order, and inventory management functions.
- Authentication and role-based access are implemented using Supabase Auth and profile roles.
- Application uses typed React and TypeScript data structures.
- Deployment readiness is supported through Next.js scripts, environment configuration, Supabase setup documentation, and Vercel references.

## 7. Industries Served

### Proven Industries Supported by Repository

The repository directly supports the following sectors because the catalog, content, and quote workflows are explicitly focused on them:

- Office printing equipment supply.
- Photocopier and printer supply.
- Toner, ink, and consumables supply.
- Printer spare parts supply.
- Office print service and maintenance requests.
- Barcode and label printing equipment supply.
- ID card printer supply.

### Potential Industries and Future Markets

The repository could reasonably be adapted to serve the following markets, but these are potential markets rather than proven engagements:

- Corporate procurement departments.
- Government procurement departments.
- Education institutions requiring ID card and document printing workflows.
- Healthcare organizations requiring office print equipment and consumables.
- Retail and logistics organizations requiring barcode and label printers.
- SMEs requiring printer, copier, toner, and maintenance support.
- Managed print service providers.
- Facilities and operations departments.

## 8. Competitive Advantages

The following are supported by the project implementation:

- Integrated storefront and admin dashboard in one application.
- Product catalog structured around procurement-relevant details such as pricing, brand, category, condition, specifications, and stock status.
- Quote request workflow for service and procurement inquiries.
- Database-backed cart and order management.
- Supabase Auth and row-level security for customer and admin data separation.
- Admin-facing inventory visibility, including low-stock and backorder reporting.
- WhatsApp inquiry links that reduce friction for product-specific customer follow-up.
- Seeded catalog relevant to office printing equipment supply in Kenya.
- Modern full-stack implementation using Next.js, TypeScript, Supabase, PostgreSQL, and Prisma.

Requires owner confirmation:

- Price competitiveness.
- Warranty terms.
- Delivery turnaround times.
- Supplier partnerships.
- Service-level agreements.
- Certifications.
- Completed contracts.
- Support coverage outside Nairobi.

## 9. Contact Information

- Company name: Ceter Technologies Limited.
- Location: Nairobi, Kenya.
- Phone: +254 707 143322.
- Email: info@cetertechnologies.com.
- Website: Requires owner confirmation.
- Physical address: Requires owner confirmation.
- Postal address: Requires owner confirmation.
- Company registration number: Requires owner confirmation.
- Tax/VAT/PIN number: Requires owner confirmation.
- Authorized tender contact person: Requires owner confirmation.
- Tender contact phone: Requires owner confirmation.
- Tender contact email: Requires owner confirmation.
- Social media:
  - Instagram: Requires owner confirmation. Repository placeholder label: `@cetertechnologies`.
  - TikTok: Requires owner confirmation. Repository placeholder label: `@cetertechnologies`.
  - X: Requires owner confirmation. Repository placeholder label: `@cetertechnologies`.
  - Facebook: Requires owner confirmation. Repository placeholder label: `@cetertechnologies`.

## 10. Tender Capability Statement

### Capability Statement

Ceter Technologies Limited is represented in this project as a Nairobi-based supplier of office printing equipment, consumables, spare parts, and service solutions. The company operates a digital storefront platform designed to support product discovery, procurement planning, customer account management, order initiation, and service quotation requests for organizations that depend on reliable office document workflows.

The Ceter Technologies Store platform demonstrates the company's capability to present and manage a structured catalog of multifunction printers, photocopiers, toners and ink, spare parts, barcode and label printers, and ID card printers. The platform supports product categorization, brand management, product specifications, pricing in Kenyan shillings, stock status, stock quantity, product condition, featured products, related products, cart management, pending order creation, customer profile management, and service quote submission.

The platform also demonstrates internal operational capability through a role-protected admin dashboard. Administrators can manage products, monitor low-stock and backorder items, review recent orders, update order status, review quote requests, and update quote status. These functions support procurement communication, inventory visibility, and customer service follow-up.

Technically, the solution is built on Next.js, React, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, PostgreSQL row-level security, Prisma ORM, and server-side database tooling. The data model includes structured tables for categories, brands, products, customer profiles, carts, orders, order items, and quote requests. Database migrations define constraints, indexes, triggers, functions, enums, and RLS policies. Verification scripts check the expected schema, security policies, seed data, and database readiness.

Ceter Technologies Limited can use this platform as evidence of capability in digital commerce, product catalog management, office equipment procurement support, quote intake, authenticated customer services, and administrative inventory workflows. Claims relating to certifications, completed contracts, delivery capacity, warranty terms, staff numbers, financial capacity, or formal service-level agreements require owner confirmation and are not evidenced by this repository.

### Procurement Identifiers

- Legal name: Ceter Technologies Limited.
- Registration number: Requires owner confirmation.
- Tax/VAT/PIN: Requires owner confirmation.
- Physical address: Requires owner confirmation.
- Primary contact: Requires owner confirmation.
- Phone: +254 707 143322.
- Email: info@cetertechnologies.com.
- Website: Requires owner confirmation.

## 11. Executive Summary

Ceter Technologies Limited is represented by this repository as a Nairobi-based office printing equipment supplier with a digital storefront for printers, photocopiers, toners, ink, spare parts, barcode and label printers, ID card printers, and related service requests. The repository demonstrates a full-stack commerce platform built with Next.js, React, TypeScript, Supabase, PostgreSQL, Prisma, and Tailwind CSS.

The implemented platform supports customer-facing catalog browsing, product detail pages, responsive layouts, cart management, account creation, profile editing, pending order creation, order history, WhatsApp product inquiries, and quote request submission. It also supports administrative workflows for product management, inventory visibility, order status updates, and quote request tracking.

The database architecture includes structured commerce tables, relational constraints, enums, indexes, triggers, functions, row-level security policies, and seed data. The project is prepared for cloud deployment using environment-based configuration and Vercel-oriented guidance. The repository does not evidence formal company mission, vision, values, certifications, staff numbers, completed contracts, revenue, awards, physical address, or payment gateway completion; these items require owner confirmation.

## 12. Company Profile

### Company Profile: Ceter Technologies Limited

Ceter Technologies Limited is presented in the project repository as a Nairobi-based supplier of office printing equipment, consumables, spare parts, and service solutions. The company's digital storefront is designed around the needs of organizations that procure, operate, and maintain office document equipment, including printers, photocopiers, multifunction devices, toners, ink products, barcode and label printers, ID card printers, and replacement parts.

The Ceter Technologies Store platform provides a structured procurement-oriented product catalog. Products are organized by category and brand, with business-relevant details such as pricing in Kenyan shillings, stock status, available stock quantity, product condition, descriptive specifications, images, and featured product indicators. The seeded product catalog includes multifunction printers, photocopiers, toners and ink, spare parts, barcode and label printers, and ID card printers from brands including Kyocera, HP, Epson, Zebra, Canon, Brother, Ricoh, Xerox, Konica Minolta, and Evolis.

The customer-facing application allows users to browse the catalog, inspect product details, view related products, add items to a cart, create a customer account, maintain profile information, initiate pending orders, review order history, and submit service or quote requests. The quote workflow supports requests for printer repair, photocopier installation, toner supply, spare parts, and managed print service. Product-specific WhatsApp links provide an additional channel for customer inquiries.

The platform also includes internal administration functionality. Admin users are authenticated through Supabase Auth and authorized through a profile role check. The admin dashboard provides visibility into total products, low-stock and backorder items, new quote requests, and recent orders. Administrators can create, update, filter, and delete products; update order statuses; and update quote request statuses. These capabilities support practical product catalog maintenance, inventory awareness, customer service follow-up, and procurement workflow management.

From a technical standpoint, the platform is implemented as a full-stack Next.js application using React, TypeScript, Tailwind CSS, Supabase, PostgreSQL, Prisma ORM, and Node.js tooling. The application uses Next.js App Router pages, server actions, middleware, server-side and browser Supabase clients, reusable UI components, client-side state management for carts, toast notifications, and responsive layouts. The database layer includes tables for categories, brands, products, profiles, cart items, orders, order items, and quote requests.

The PostgreSQL schema demonstrates controlled data design through relational keys, check constraints, enum types, indexes, updated-at triggers, user profile creation triggers, and row-level security policies. Public users can read catalog data and submit quote requests, customers can manage their own profile, cart, and orders, and administrators can manage catalog, order, quote, and profile data according to defined policies. A verification script checks the presence of required tables, row-level security, enum labels, functions, triggers, indexes, policies, and seed counts.

For deployment, the repository includes build, lint, Prisma validation, migration, seed, database verification, and admin setup scripts. It documents Supabase environment variables and references Vercel project environment variable configuration. This demonstrates readiness for deployment to a modern cloud-hosted Next.js and Supabase environment, although the repository does not provide a production deployment URL.

The current repository should be treated as evidence of digital commerce and platform capability, not as evidence of all company credentials. Formal claims concerning years of operation, ownership, registration details, tax registration, certifications, staff size, revenue, offices, awards, completed contracts, warranty terms, delivery coverage, supplier authorizations, and service-level agreements require owner confirmation. Payment processing is also not completed in the current application; checkout creates a pending order before payment integration.

Overall, the project demonstrates that Ceter Technologies Limited has a practical digital platform for office printing equipment sales, procurement support, quote intake, inventory management, and administrative order follow-up. It provides a credible technical foundation for tender submissions involving office equipment supply, digital catalog management, customer self-service, and service request management, provided that formal company credentials and commercial terms are confirmed by the owner.

## 13. Evidence Matrix

| Claim | Repository Evidence |
|---|---|
| Company name is Ceter Technologies Limited | `README.md`; `app/layout.tsx`; `app/about/page.tsx`; `components/Footer.tsx` |
| Company is presented as Nairobi-based | `README.md`; `app/about/page.tsx`; `components/Footer.tsx` |
| Business focus is office printing equipment, consumables, spare parts, and services | `README.md`; `app/layout.tsx`; `app/about/page.tsx`; `components/Footer.tsx`; `app/page.tsx` |
| Storefront is built with Next.js App Router | `package.json`; `app/page.tsx`; `app/layout.tsx`; `app/category/page.tsx`; `app/product/[slug]/page.tsx` |
| Application uses React | `package.json`; `components/ProductCard.tsx`; `components/CartView.tsx`; `components/QuoteForm.tsx` |
| Application uses TypeScript | `tsconfig.json`; `.tsx` and `.ts` files across `app/`, `components/`, and `lib/`; `lib/types.ts` |
| Application uses Tailwind CSS | `tailwind.config.ts`; `postcss.config.mjs`; `app/globals.css`; component class usage throughout `app/` and `components/` |
| Application uses Supabase | `README.md`; `.env.example`; `lib/supabase.ts`; `lib/supabase/client.ts`; `lib/supabase/server.ts`; `middleware.ts` |
| Application uses Supabase Auth | `README.md`; `app/actions.ts`; `app/login/page.tsx`; `app/signup/page.tsx`; `middleware.ts`; `app/account/page.tsx` |
| Application uses PostgreSQL | `README.md`; `prisma/schema.prisma`; `supabase/migrations/202607290001_initial_commerce_schema.sql`; `package.json` |
| Application uses Prisma ORM | `README.md`; `package.json`; `prisma/schema.prisma`; `prisma.config.ts`; `app/admin/page.tsx`; `app/admin/actions.ts` |
| Admin data layer uses Prisma after Supabase Auth admin-role check | `README.md`; `app/admin/page.tsx`; `app/admin/actions.ts`; `lib/prisma.ts` |
| Customer-facing data uses Supabase with RLS model | `README.md`; `lib/data.ts`; `components/CartProvider.tsx`; `components/CartView.tsx`; `components/QuoteForm.tsx`; `supabase/migrations/202607290001_initial_commerce_schema.sql` |
| Database has categories, brands, products, profiles, orders, order items, quote requests, and cart items | `prisma/schema.prisma`; `supabase/migrations/202607290001_initial_commerce_schema.sql`; `scripts/verify-supabase.mjs` |
| Database includes enum types for product condition, stock status, profile role, order status, payment method, and quote status | `prisma/schema.prisma`; `supabase/migrations/202607290001_initial_commerce_schema.sql`; `scripts/verify-supabase.mjs` |
| Row-level security policies are defined | `supabase/migrations/202607290001_initial_commerce_schema.sql`; `scripts/verify-supabase.mjs` |
| Database indexes are defined | `supabase/migrations/202607290001_initial_commerce_schema.sql`; `scripts/verify-supabase.mjs` |
| Database triggers and functions are defined | `supabase/migrations/202607290001_initial_commerce_schema.sql`; `scripts/verify-supabase.mjs` |
| Seed catalog includes six categories | `prisma/migrations/0001_init/seed.sql`; `scripts/verify-supabase.mjs` |
| Seed catalog includes ten brands | `prisma/migrations/0001_init/seed.sql`; `scripts/verify-supabase.mjs` |
| Seed catalog includes fifteen products | `prisma/migrations/0001_init/seed.sql`; `scripts/verify-supabase.mjs` |
| Product catalog supports categories and brands | `prisma/schema.prisma`; `lib/data.ts`; `app/category/page.tsx`; `components/CategoryFilterPanel.tsx`; `components/Sidebar.tsx` |
| Product catalog supports price, condition, stock status, stock quantity, images, specs, and featured status | `prisma/schema.prisma`; `components/ProductCard.tsx`; `components/ProductDetail.tsx`; `app/admin/page.tsx`; `app/admin/actions.ts` |
| Product detail pages are implemented with dynamic slugs | `app/product/[slug]/page.tsx`; `components/ProductDetail.tsx`; `lib/data.ts` |
| Related products are implemented | `app/product/[slug]/page.tsx`; `lib/data.ts`; `components/ProductDetail.tsx` |
| Featured products appear on home page | `app/page.tsx`; `lib/data.ts`; `prisma/schema.prisma` |
| Cart management is implemented | `components/CartProvider.tsx`; `components/CartView.tsx`; `app/cart/page.tsx`; `components/AddToCartButton.tsx` |
| Guest cart uses browser local storage | `components/CartProvider.tsx` |
| Authenticated cart persists to Supabase | `components/CartProvider.tsx`; `prisma/schema.prisma`; `supabase/migrations/202607290001_initial_commerce_schema.sql` |
| Checkout creates pending orders | `components/CartView.tsx`; `app/account/page.tsx`; `prisma/schema.prisma` |
| Payment integration is not completed | `components/CartView.tsx`; `app/account/page.tsx` |
| Customer account and profile editing are implemented | `app/account/page.tsx`; `app/actions.ts`; `prisma/schema.prisma` |
| Customer order history is implemented | `app/account/page.tsx`; `components/CartView.tsx` |
| Sign-up and sign-in workflows are implemented | `app/signup/page.tsx`; `app/login/page.tsx`; `app/actions.ts` |
| Role-protected admin dashboard is implemented | `app/admin/page.tsx`; `app/admin/actions.ts`; `prisma/schema.prisma` |
| Admin product create/update/delete is implemented | `app/admin/page.tsx`; `app/admin/actions.ts` |
| Admin product filtering is implemented | `app/admin/page.tsx` |
| Admin inventory metrics include low stock and backorder counts | `app/admin/page.tsx` |
| Admin order status updates are implemented | `app/admin/page.tsx`; `app/admin/actions.ts` |
| Quote request submission is implemented | `app/quote/page.tsx`; `components/QuoteForm.tsx`; `prisma/schema.prisma` |
| Admin quote status updates are implemented | `app/admin/page.tsx`; `app/admin/actions.ts` |
| Quote service options include printer repair, photocopier installation, toner supply, spare parts, and managed print service | `components/QuoteForm.tsx` |
| WhatsApp product inquiry integration is implemented | `components/WhatsAppOrderButton.tsx`; `components/HeaderClient.tsx`; `components/Footer.tsx` |
| Responsive web design is implemented | `app/page.tsx`; `app/category/page.tsx`; `components/HeaderClient.tsx`; `components/CategoryFilterPanel.tsx`; `components/ProductGrid.tsx`; `components/CartView.tsx`; `tailwind.config.ts` |
| UI animation and interaction support are implemented | `components/BannerCarousel.tsx`; `components/ProductCard.tsx`; `components/CategoryFilterPanel.tsx`; `package.json` |
| Toast notifications are implemented | `components/NotificationSystem.tsx`; `components/QuoteForm.tsx`; `components/CartProvider.tsx`; `package.json` |
| Vercel-oriented deployment is referenced | `README.md`; `package.json` |
| Environment variables are documented | `.env.example`; `README.md`; `next.config.mjs`; `prisma.config.ts` |
| Database verification tooling exists | `scripts/verify-supabase.mjs`; `package.json` |
| Admin setup tooling exists | `scripts/setup-admin.mjs`; `.env.example`; `package.json` |
| CI/CD pipeline is not evidenced | No CI workflow file found in inspected repository; `package.json` contains scripts but no repository CI configuration was identified |
| Formal mission, vision, values, certifications, staff numbers, revenue, offices, awards, completed contracts, and registration details require owner confirmation | No supporting repository files found for these claims |
