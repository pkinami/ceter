with category_seed(name, slug, parent_slug, sort_order, description, icon) as (
  values
  ('Printers & Photocopiers', 'printers-and-photocopiers', null, 10, 'Printers, photocopiers and large format print equipment.', 'Printer'),
  ('Printers', 'printers', 'printers-and-photocopiers', 10, null, null),
  ('Laser Printers', 'laser-printers', 'printers', 10, null, null),
  ('Inkjet Printers', 'inkjet-printers', 'printers', 20, null, null),
  ('Multifunction Printers', 'multifunction-printers', 'printers', 30, null, null),
  ('Photocopiers', 'photocopiers', 'printers-and-photocopiers', 20, null, null),
  ('Monochrome Copiers', 'monochrome-copiers', 'photocopiers', 10, null, null),
  ('Colour Copiers', 'colour-copiers', 'photocopiers', 20, null, null),
  ('Multifunction Copiers', 'multifunction-copiers', 'photocopiers', 30, null, null),
  ('Large Format Printers', 'large-format-printers', 'printers-and-photocopiers', 30, null, null),
  ('Plotters', 'plotters', 'large-format-printers', 10, null, null),
  ('CAD Printers', 'cad-printers', 'large-format-printers', 20, null, null),
  ('Graphics Printers', 'graphics-printers', 'large-format-printers', 30, null, null),
  ('Toner, Ink & Consumables', 'toner-ink-and-consumables', null, 20, 'Toner, ink, maintenance consumables, paper and media.', 'BadgeCheck'),
  ('Toner Cartridges', 'toner-cartridges', 'toner-ink-and-consumables', 10, null, null),
  ('HP Toners', 'hp-toners', 'toner-cartridges', 10, null, null),
  ('Canon Toners', 'canon-toners', 'toner-cartridges', 20, null, null),
  ('Kyocera Toners', 'kyocera-toners', 'toner-cartridges', 30, null, null),
  ('Brother/Ricoh/Xerox/Konica Minolta Toners', 'brother-ricoh-xerox-konica-minolta-toners', 'toner-cartridges', 40, null, null),
  ('Ink', 'ink', 'toner-ink-and-consumables', 20, null, null),
  ('Ink Cartridges', 'ink-cartridges', 'ink', 10, null, null),
  ('Ink Bottles', 'ink-bottles', 'ink', 20, null, null),
  ('Printer Consumables', 'printer-consumables', 'toner-ink-and-consumables', 30, null, null),
  ('Drum Units', 'printer-consumables-drum-units', 'printer-consumables', 10, null, null),
  ('Imaging Units', 'imaging-units', 'printer-consumables', 20, null, null),
  ('Developer Units', 'printer-consumables-developer-units', 'printer-consumables', 30, null, null),
  ('Waste Toner Bottles', 'waste-toner-bottles', 'printer-consumables', 40, null, null),
  ('Paper & Media', 'paper-and-media', 'toner-ink-and-consumables', 40, null, null),
  ('A4/A3 Paper', 'a4-a3-paper', 'paper-and-media', 10, null, null),
  ('Photo Paper', 'photo-paper', 'paper-and-media', 20, null, null),
  ('Thermal Rolls', 'thermal-rolls', 'paper-and-media', 30, null, null),
  ('Barcode Labels', 'paper-and-media-barcode-labels', 'paper-and-media', 40, null, null),
  ('Printer Parts & Accessories', 'printer-parts-and-accessories', null, 30, 'Printer and photocopier spare parts, accessories and maintenance kits.', 'Settings'),
  ('Printer Spare Parts', 'printer-spare-parts', 'printer-parts-and-accessories', 10, null, null),
  ('Pickup Rollers', 'pickup-rollers', 'printer-spare-parts', 10, null, null),
  ('Print Heads', 'print-heads', 'printer-spare-parts', 20, null, null),
  ('Transfer Rollers', 'transfer-rollers', 'printer-spare-parts', 30, null, null),
  ('Fuser Units', 'fuser-units', 'printer-spare-parts', 40, null, null),
  ('Photocopier Spare Parts', 'photocopier-spare-parts', 'printer-parts-and-accessories', 20, null, null),
  ('Drum Units', 'photocopier-spare-parts-drum-units', 'photocopier-spare-parts', 10, null, null),
  ('Developer Units', 'photocopier-spare-parts-developer-units', 'photocopier-spare-parts', 20, null, null),
  ('Transfer Units', 'transfer-units', 'photocopier-spare-parts', 30, null, null),
  ('Maintenance Kits', 'maintenance-kits', 'photocopier-spare-parts', 40, null, null),
  ('Printer Accessories', 'printer-accessories', 'printer-parts-and-accessories', 30, null, null),
  ('Printer Cables', 'printer-cables', 'printer-accessories', 10, null, null),
  ('Paper Trays', 'paper-trays', 'printer-accessories', 20, null, null),
  ('Printer Stands', 'printer-stands', 'printer-accessories', 30, null, null),
  ('Power Accessories', 'power-accessories', 'printer-accessories', 40, null, null),
  ('Barcode, POS & ID Solutions', 'barcode-pos-and-id-solutions', null, 40, 'Barcode, POS and ID card equipment and supplies.', 'Tags'),
  ('Barcode & Label Printing', 'barcode-and-label-printing', 'barcode-pos-and-id-solutions', 10, null, null),
  ('Barcode Printers', 'barcode-printers', 'barcode-and-label-printing', 10, null, null),
  ('Label Printers', 'label-printers', 'barcode-and-label-printing', 20, null, null),
  ('Barcode Labels', 'barcode-and-label-printing-barcode-labels', 'barcode-and-label-printing', 30, null, null),
  ('Thermal Ribbons', 'thermal-ribbons', 'barcode-and-label-printing', 40, null, null),
  ('POS Equipment', 'pos-equipment', 'barcode-pos-and-id-solutions', 20, null, null),
  ('Receipt Printers', 'receipt-printers', 'pos-equipment', 10, null, null),
  ('Barcode Scanners', 'barcode-scanners', 'pos-equipment', 20, null, null),
  ('Cash Drawers', 'cash-drawers', 'pos-equipment', 30, null, null),
  ('Receipt Rolls', 'receipt-rolls', 'pos-equipment', 40, null, null),
  ('ID Card Printing', 'id-card-printing', 'barcode-pos-and-id-solutions', 30, null, null),
  ('ID Card Printers', 'id-card-printers', 'id-card-printing', 10, null, null),
  ('Printer Ribbons', 'printer-ribbons', 'id-card-printing', 20, null, null),
  ('PVC Cards', 'pvc-cards', 'id-card-printing', 30, null, null),
  ('Lanyards & Card Holders', 'lanyards-and-card-holders', 'id-card-printing', 40, null, null),
  ('Office Equipment & Services', 'office-equipment-and-services', null, 50, 'Office equipment, printer services, copier services and business solutions.', 'ScanLine'),
  ('Office Equipment', 'office-equipment', 'office-equipment-and-services', 10, null, null),
  ('Document Scanners', 'document-scanners', 'office-equipment', 10, null, null),
  ('Laminators', 'laminators', 'office-equipment', 20, null, null),
  ('Binding Machines', 'binding-machines', 'office-equipment', 30, null, null),
  ('Shredders', 'shredders', 'office-equipment', 40, null, null),
  ('Paper Cutters', 'paper-cutters', 'office-equipment', 50, null, null),
  ('Printer Services', 'printer-services', 'office-equipment-and-services', 20, null, null),
  ('Repair', 'printer-services-repair', 'printer-services', 10, null, null),
  ('Installation', 'printer-services-installation', 'printer-services', 20, null, null),
  ('Maintenance', 'printer-services-maintenance', 'printer-services', 30, null, null),
  ('Photocopier Services', 'photocopier-services', 'office-equipment-and-services', 30, null, null),
  ('Repair', 'photocopier-services-repair', 'photocopier-services', 10, null, null),
  ('Installation', 'photocopier-services-installation', 'photocopier-services', 20, null, null),
  ('Maintenance', 'photocopier-services-maintenance', 'photocopier-services', 30, null, null),
  ('Business Solutions', 'business-solutions', 'office-equipment-and-services', 40, null, null),
  ('Managed Print Services', 'managed-print-services', 'business-solutions', 10, null, null),
  ('Toner Supply Contracts', 'toner-supply-contracts', 'business-solutions', 20, null, null),
  ('Maintenance Contracts', 'maintenance-contracts', 'business-solutions', 30, null, null),
  ('Equipment Installation', 'equipment-installation', 'business-solutions', 40, null, null)
),
upserted as (
  insert into public.categories (name, slug, description, icon, sort_order)
  select name, slug, description, icon, sort_order
  from category_seed
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    sort_order = excluded.sort_order
  returning id, slug
)
update public.categories child
set parent_id = parent.id
from category_seed seed
left join public.categories parent on parent.slug = seed.parent_slug
where child.slug = seed.slug;

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
  ('Ricoh MP 3055 Mono Photocopier', 'ricoh-mp-3055-refurbished', 'Refurbished A3 copier with service-ready configuration.', 'Monochrome Copiers', 'Ricoh', 225000, 'refurbished', 'backorder', 0, '["/product-placeholder.svg"]', '{"Speed":"30 ppm","Paper":"A3/A4","Finisher":"Optional","Meter":"Low usage"}', false),
  ('Konica Minolta bizhub C258 Colour Copier', 'konica-minolta-bizhub-c258', 'A3 colour copier for workgroups and print rooms.', 'Colour Copiers', 'Konica Minolta', 295000, 'refurbished', 'in_stock', 3, '["/product-placeholder.svg"]', '{"Speed":"25 ppm","Color":"Full colour","Paper":"A3/A4","Scan":"Dual scan option"}', true),
  ('Canon imageRUNNER ADVANCE DX C3826i', 'canon-ir-adv-dx-c3826i', 'Colour A3 device with secure workflow features.', 'Multifunction Copiers', 'Canon', 418000, 'new', 'backorder', 0, '["/product-placeholder.svg"]', '{"Speed":"26 ppm","Security":"PIN and user controls","Paper":"A3/A4","Panel":"Touch display"}', false),
  ('Xerox AltaLink C8030 Colour MFP', 'xerox-altalink-c8030', 'Enterprise colour MFP for managed office environments.', 'Multifunction Printers', 'Xerox', 365000, 'refurbished', 'in_stock', 2, '["/product-placeholder.svg"]', '{"Speed":"30 ppm","Paper":"A3/A4","Workflow":"Scan to email","Network":"Gigabit Ethernet"}', true),
  ('Brother HL-L6210DW Mono Laser Printer', 'brother-hl-l6210dw', 'High-speed mono laser printer for admin desks.', 'Multifunction Printers', 'Brother', 58500, 'new', 'in_stock', 10, '["/product-placeholder.svg"]', '{"Speed":"48 ppm","Duplex":"Automatic","Paper":"Expandable tray","Connectivity":"Wi-Fi, Ethernet"}', false),
  ('Zebra ZD421 Desktop Label Printer', 'zebra-zd421-label-printer', 'Thermal label printer for retail, logistics and inventory.', 'Label Printers', 'Zebra', 64500, 'new', 'in_stock', 7, '["/product-placeholder.svg"]', '{"Method":"Direct thermal","Width":"4 inch","Resolution":"203 dpi","Interface":"USB, Ethernet"}', false),
  ('Evolis Primacy 2 ID Card Printer', 'evolis-primacy-2-card-printer', 'Card printer for staff IDs, schools and access teams.', 'ID Card Printers', 'Evolis', 248000, 'new', 'backorder', 0, '["/product-placeholder.svg"]', '{"Output":"Single or dual side","Cards":"PVC cards","Resolution":"300 dpi","Security":"Encoding option"}', false),
  ('HP 410A Original Toner Cartridge Set', 'hp-410a-toner-set', 'Original CMYK toner set for compatible LaserJet Pro units.', 'HP Toners', 'HP', 48500, 'new', 'in_stock', 16, '["/product-placeholder.svg"]', '{"Pack":"CMYK set","Yield":"Up to 2,300 pages","Type":"Original","Compatibility":"M452, M477 series"}', true),
  ('Kyocera TK-8345 Toner Cartridge', 'kyocera-tk-8345-toner', 'High-yield toner for TASKalfa office systems.', 'Kyocera Toners', 'Kyocera', 19500, 'new', 'in_stock', 24, '["/product-placeholder.svg"]', '{"Color":"Black","Yield":"Approx. 20,000 pages","Type":"Original","Compatibility":"TASKalfa 2552ci"}', false),
  ('Canon NPG-67 Toner Cartridge', 'canon-npg-67-toner', 'Original toner cartridge for imageRUNNER ADVANCE systems.', 'Canon Toners', 'Canon', 16800, 'new', 'backorder', 0, '["/product-placeholder.svg"]', '{"Color":"Cyan","Yield":"Approx. 19,000 pages","Type":"Original","Compatibility":"C33xx/C35xx series"}', false),
  ('Ricoh MPC Drum Unit Assembly', 'ricoh-mpc-drum-unit', 'Replacement imaging drum assembly for Ricoh colour copiers.', 'Drum Units', 'Ricoh', 32500, 'new', 'in_stock', 5, '["/product-placeholder.svg"]', '{"Part":"Drum unit","Type":"Replacement","Service":"Install available","Compatibility":"MPC series"}', false),
  ('Epson T673 Ink Bottle Multipack', 'epson-t673-ink-bottle-set', 'Six-colour ink bottle set for Epson photo ink tank printers.', 'Ink Bottles', 'Epson', 11200, 'new', 'in_stock', 30, '["/product-placeholder.svg"]', '{"Pack":"6 bottles","Type":"Original ink","Volume":"70 ml each","Compatibility":"L800/L805 series"}', false)
) as product(name, slug, description, category_name, brand_name, price_kes, condition, stock_status, stock_quantity, images, specs, is_featured)
join public.categories c on c.name = product.category_name
  and (product.category_name not in ('Drum Units', 'Developer Units', 'Repair', 'Installation', 'Maintenance', 'Barcode Labels')
    or c.slug in ('photocopier-spare-parts-drum-units', 'photocopier-spare-parts-developer-units', 'printer-services-repair', 'printer-services-installation', 'printer-services-maintenance', 'barcode-and-label-printing-barcode-labels'))
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

update public.products p set
  reorder_level = case c.slug
    when 'multifunction-printers' then 2
    when 'photocopiers' then 1
    when 'hp-toners' then 8
    when 'kyocera-toners' then 8
    when 'canon-toners' then 8
    when 'photocopier-spare-parts-drum-units' then 3
    when 'label-printers' then 2
    when 'id-card-printers' then 1
    else 2
  end,
  reorder_quantity = case c.slug
    when 'hp-toners' then 12
    when 'kyocera-toners' then 12
    when 'canon-toners' then 12
    when 'photocopier-spare-parts-drum-units' then 4
    else 2
  end,
  supplier_name = coalesce(p.supplier_name, case b.slug
    when 'hp' then 'HP Kenya distributor'
    when 'kyocera' then 'Kyocera channel partner'
    when 'canon' then 'Canon authorised dealer'
    when 'epson' then 'Epson supplies partner'
    else 'Ceter procurement'
  end)
from public.categories c, public.brands b
where p.category_id = c.id and p.brand_id = b.id;

insert into public.banners (title, kicker, body, cta_label, cta_href, image, mobile_image, placement, sort_order, is_enabled)
select banner.title, banner.kicker, banner.body, banner.cta_label, banner.cta_href, banner.image, banner.mobile_image, banner.placement, banner.sort_order, banner.is_enabled
from (
  values
  ('Office technology supplied, installed and supported', 'Ceter Technologies Limited', 'Source printers, copiers, consumables, networking hardware and IT services from one Nairobi partner.', 'Shop catalog', '/category', '/banners/hero/office-printer-wide-1920.webp', '/banners/hero/office-printer-tall-720.webp', 'main'::banner_placement, 10, true),
  ('Printer fleets, toners and spares for active offices', 'Commercial supply', 'Keep operations moving with verified stock, setup support and quote-based procurement for larger needs.', 'Request quote', '/quote', '/banners/hero/toners-consumables-wide-1920.webp', '/banners/hero/toners-consumables-tall-720.webp', 'category'::banner_placement, 20, true),
  ('Infrastructure services for growing teams', 'Services and solutions', 'Plan CCTV, cabling, networking, servers, cloud and security work with Ceter engineers.', 'Explore services', '/quote', '/banners/hero/business-it-support-wide-1920.webp', '/banners/hero/business-it-support-tall-720.webp', 'services'::banner_placement, 30, true)
) as banner(title, kicker, body, cta_label, cta_href, image, mobile_image, placement, sort_order, is_enabled)
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
where c.parent_id is null
  and not exists (
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
