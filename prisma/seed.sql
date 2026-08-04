insert into public.categories (name, slug, description, icon) values
  ('Multifunction Printers', 'multifunction-printers', 'A4 and A3 workhorse devices for office teams.', 'Printer'),
  ('Photocopiers', 'photocopiers', 'Refurbished and new copier systems with setup support.', 'ScanLine'),
  ('Toners and Ink', 'toners-and-ink', 'Original toner, ink bottles and cartridge multipacks.', 'BadgeCheck'),
  ('Spare Parts', 'spare-parts', 'Drums, maintenance kits and replacement assemblies.', 'Settings'),
  ('Barcode and Label', 'barcode-and-label', 'Barcode and label printers for inventory workflows.', 'Tags'),
  ('ID Card Printers', 'id-card-printers', 'PVC card printers for access and staff identification.', 'CreditCard')
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon;

insert into public.brands (name, slug) values
  ('Kyocera', 'kyocera'),
  ('HP', 'hp'),
  ('Epson', 'epson'),
  ('Zebra', 'zebra'),
  ('Canon', 'canon'),
  ('Brother', 'brother'),
  ('Ricoh', 'ricoh'),
  ('Xerox', 'xerox'),
  ('Konica Minolta', 'konica-minolta'),
  ('Evolis', 'evolis')
on conflict (slug) do update set name = excluded.name;

update public.brands set icon = coalesce(icon, '/product-placeholder.svg');

insert into public.products (
  name, slug, description, category_id, brand_id, price_kes, condition, stock_status, stock_quantity, images, specs, is_featured
)
select product.name, product.slug, product.description, c.id, b.id, product.price_kes, product.condition::product_condition,
  product.stock_status::stock_status, product.stock_quantity, product.images::jsonb, product.specs::jsonb, product.is_featured
from (
  values
  ('Kyocera TASKalfa 2554ci A3 Colour MFP', 'kyocera-taskalfa-2554ci', 'A3 colour multifunction printer for document-heavy offices.', 'Multifunction Printers', 'Kyocera', 385000, 'new', 'in_stock', 6, '["/product-placeholder.svg"]', '{"Speed":"25 ppm","Functions":"Print, copy, scan","Paper":"A3/A4","Network":"Ethernet, USB"}', true),
  ('HP LaserJet Pro MFP 4103fdw', 'hp-laserjet-pro-mfp-4103fdw', 'Compact mono laser MFP with wireless printing.', 'Multifunction Printers', 'HP', 72500, 'new', 'in_stock', 12, '["/product-placeholder.svg"]', '{"Speed":"40 ppm","Functions":"Print, copy, scan, fax","Duplex":"Automatic","Connectivity":"Wi-Fi, Ethernet"}', true),
  ('Epson EcoTank L6490 Business Ink Tank', 'epson-ecotank-l6490', 'Low-cost ink tank printer for small teams.', 'Multifunction Printers', 'Epson', 89500, 'new', 'in_stock', 8, '["/product-placeholder.svg"]', '{"Type":"Ink tank","Functions":"Print, copy, scan, fax","Duplex":"Automatic","Warranty":"1 year"}', true),
  ('Ricoh MP 3055 Mono Photocopier', 'ricoh-mp-3055-refurbished', 'Refurbished A3 copier with service-ready configuration.', 'Photocopiers', 'Ricoh', 225000, 'refurbished', 'backorder', 0, '["/product-placeholder.svg"]', '{"Speed":"30 ppm","Paper":"A3/A4","Finisher":"Optional","Meter":"Low usage"}', false),
  ('Konica Minolta bizhub C258 Colour Copier', 'konica-minolta-bizhub-c258', 'A3 colour copier for workgroups and print rooms.', 'Photocopiers', 'Konica Minolta', 295000, 'refurbished', 'in_stock', 3, '["/product-placeholder.svg"]', '{"Speed":"25 ppm","Color":"Full colour","Paper":"A3/A4","Scan":"Dual scan option"}', true),
  ('Canon imageRUNNER ADVANCE DX C3826i', 'canon-ir-adv-dx-c3826i', 'Colour A3 device with secure workflow features.', 'Photocopiers', 'Canon', 418000, 'new', 'backorder', 0, '["/product-placeholder.svg"]', '{"Speed":"26 ppm","Security":"PIN and user controls","Paper":"A3/A4","Panel":"Touch display"}', false),
  ('Xerox AltaLink C8030 Colour MFP', 'xerox-altalink-c8030', 'Enterprise colour MFP for managed office environments.', 'Multifunction Printers', 'Xerox', 365000, 'refurbished', 'in_stock', 2, '["/product-placeholder.svg"]', '{"Speed":"30 ppm","Paper":"A3/A4","Workflow":"Scan to email","Network":"Gigabit Ethernet"}', true),
  ('Brother HL-L6210DW Mono Laser Printer', 'brother-hl-l6210dw', 'High-speed mono laser printer for admin desks.', 'Multifunction Printers', 'Brother', 58500, 'new', 'in_stock', 10, '["/product-placeholder.svg"]', '{"Speed":"48 ppm","Duplex":"Automatic","Paper":"Expandable tray","Connectivity":"Wi-Fi, Ethernet"}', false),
  ('Zebra ZD421 Desktop Label Printer', 'zebra-zd421-label-printer', 'Thermal label printer for retail, logistics and inventory.', 'Barcode and Label', 'Zebra', 64500, 'new', 'in_stock', 7, '["/product-placeholder.svg"]', '{"Method":"Direct thermal","Width":"4 inch","Resolution":"203 dpi","Interface":"USB, Ethernet"}', false),
  ('Evolis Primacy 2 ID Card Printer', 'evolis-primacy-2-card-printer', 'Card printer for staff IDs, schools and access teams.', 'ID Card Printers', 'Evolis', 248000, 'new', 'backorder', 0, '["/product-placeholder.svg"]', '{"Output":"Single or dual side","Cards":"PVC cards","Resolution":"300 dpi","Security":"Encoding option"}', false),
  ('HP 410A Original Toner Cartridge Set', 'hp-410a-toner-set', 'Original CMYK toner set for compatible LaserJet Pro units.', 'Toners and Ink', 'HP', 48500, 'new', 'in_stock', 16, '["/product-placeholder.svg"]', '{"Pack":"CMYK set","Yield":"Up to 2,300 pages","Type":"Original","Compatibility":"M452, M477 series"}', true),
  ('Kyocera TK-8345 Toner Cartridge', 'kyocera-tk-8345-toner', 'High-yield toner for TASKalfa office systems.', 'Toners and Ink', 'Kyocera', 19500, 'new', 'in_stock', 24, '["/product-placeholder.svg"]', '{"Color":"Black","Yield":"Approx. 20,000 pages","Type":"Original","Compatibility":"TASKalfa 2552ci"}', false),
  ('Canon NPG-67 Toner Cartridge', 'canon-npg-67-toner', 'Original toner cartridge for imageRUNNER ADVANCE systems.', 'Toners and Ink', 'Canon', 16800, 'new', 'backorder', 0, '["/product-placeholder.svg"]', '{"Color":"Cyan","Yield":"Approx. 19,000 pages","Type":"Original","Compatibility":"C33xx/C35xx series"}', false),
  ('Ricoh MPC Drum Unit Assembly', 'ricoh-mpc-drum-unit', 'Replacement imaging drum assembly for Ricoh colour copiers.', 'Spare Parts', 'Ricoh', 32500, 'new', 'in_stock', 5, '["/product-placeholder.svg"]', '{"Part":"Drum unit","Type":"Replacement","Service":"Install available","Compatibility":"MPC series"}', false),
  ('Epson T673 Ink Bottle Multipack', 'epson-t673-ink-bottle-set', 'Six-colour ink bottle set for Epson photo ink tank printers.', 'Toners and Ink', 'Epson', 11200, 'new', 'in_stock', 30, '["/product-placeholder.svg"]', '{"Pack":"6 bottles","Type":"Original ink","Volume":"70 ml each","Compatibility":"L800/L805 series"}', false)
) as product(name, slug, description, category_name, brand_name, price_kes, condition, stock_status, stock_quantity, images, specs, is_featured)
join public.categories c on c.name = product.category_name
join public.brands b on b.name = product.brand_name
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category_id = excluded.category_id,
  brand_id = excluded.brand_id,
  price_kes = excluded.price_kes,
  condition = excluded.condition,
  stock_status = excluded.stock_status,
  stock_quantity = excluded.stock_quantity,
  images = excluded.images,
  specs = excluded.specs,
  is_featured = excluded.is_featured;

insert into public.banners (title, kicker, body, cta_label, cta_href, image, placement, sort_order, is_enabled)
select banner.title, banner.kicker, banner.body, banner.cta_label, banner.cta_href, banner.image, banner.placement, banner.sort_order, banner.is_enabled
from (
  values
  ('Office technology supplied, installed and supported', 'Ceter Technologies Limited', 'Source printers, copiers, consumables, networking hardware and IT services from one Nairobi partner.', 'Shop catalog', '/category', '/product-placeholder.svg', 'top'::banner_placement, 10, true),
  ('Printer fleets, toners and spares for active offices', 'Commercial supply', 'Keep operations moving with verified stock, setup support and quote-based procurement for larger needs.', 'Request quote', '/quote', '/product-placeholder.svg', 'middle'::banner_placement, 20, true),
  ('Infrastructure services for growing teams', 'Services and solutions', 'Plan CCTV, cabling, networking, servers, cloud and security work with Ceter engineers.', 'Explore services', '/quote', '/product-placeholder.svg', 'bottom'::banner_placement, 30, true)
) as banner(title, kicker, body, cta_label, cta_href, image, placement, sort_order, is_enabled)
where not exists (
  select 1 from public.banners existing
  where existing.title = banner.title and existing.placement = banner.placement
);

insert into public.service_entries (title, slug, description, image, price_kes, show_request_quote, sort_order, is_enabled) values
  ('CCTV Installation', 'cctv-installation', 'Camera planning, installation, recording setup and handover for offices, retail sites and facilities.', '/product-placeholder.svg', null, true, 10, true),
  ('Structured Cabling', 'structured-cabling', 'Clean copper and fibre cabling for office networks, server rooms and multi-floor deployments.', '/product-placeholder.svg', null, true, 20, true),
  ('Networking', 'networking', 'Switching, routing, Wi-Fi and secure network configuration for reliable business connectivity.', '/product-placeholder.svg', null, true, 30, true),
  ('Server Installation', 'server-installation', 'Server sizing, installation, storage setup and operational configuration.', '/product-placeholder.svg', null, true, 40, true),
  ('Data Recovery', 'data-recovery', 'Assessment and recovery support for failed drives, accidental deletion and damaged storage media.', '/product-placeholder.svg', null, true, 50, true),
  ('Managed IT Services', 'managed-it-services', 'Ongoing maintenance, support, monitoring and procurement assistance for business IT environments.', '/product-placeholder.svg', null, true, 60, true),
  ('Cloud Solutions', 'cloud-solutions', 'Cloud email, storage, backup and productivity solution planning and migration.', '/product-placeholder.svg', null, true, 70, true),
  ('Security Solutions', 'security-solutions', 'Access control, endpoint protection and physical security integrations for business sites.', '/product-placeholder.svg', null, true, 80, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  image = excluded.image,
  price_kes = excluded.price_kes,
  show_request_quote = excluded.show_request_quote,
  sort_order = excluded.sort_order,
  is_enabled = excluded.is_enabled;

insert into public.homepage_sections (title, section_type, category_id, sort_order, product_limit, is_enabled)
select c.name, 'category_products'::homepage_section_type, c.id, row_number() over (order by c.name) * 10, 8, true
from public.categories c
where not exists (
  select 1 from public.homepage_sections existing
  where existing.section_type = 'category_products'::homepage_section_type and existing.category_id = c.id
);

insert into public.homepage_sections (title, section_type, category_id, sort_order, product_limit, is_enabled)
select section.title, section.section_type, null, section.sort_order, section.product_limit, section.is_enabled
from (
  values
  ('Ceter Services & Solutions', 'services'::homepage_section_type, 500, 8, true),
  ('Latest Products', 'latest_products'::homepage_section_type, 700, 8, true),
  ('Featured Brands', 'brands'::homepage_section_type, 800, 12, true)
) as section(title, section_type, sort_order, product_limit, is_enabled)
where not exists (
  select 1 from public.homepage_sections existing
  where existing.section_type = section.section_type and existing.category_id is null
);
