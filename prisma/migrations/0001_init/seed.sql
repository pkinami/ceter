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
