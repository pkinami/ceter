begin;

with sample_products(slug) as (
  values
    ('kyocera-taskalfa-2554ci'),
    ('hp-laserjet-pro-mfp-4103fdw'),
    ('epson-ecotank-l6490'),
    ('ricoh-mp-3055-refurbished'),
    ('konica-minolta-bizhub-c258'),
    ('canon-ir-adv-dx-c3826i'),
    ('xerox-altalink-c8030'),
    ('brother-hl-l6210dw'),
    ('zebra-zd421-label-printer'),
    ('evolis-primacy-2-card-printer'),
    ('hp-410a-toner-set'),
    ('kyocera-tk-8345-toner'),
    ('canon-npg-67-toner'),
    ('ricoh-mpc-drum-unit'),
    ('epson-t673-ink-bottle-set')
),
target_products as (
  select p.id
  from public.products p
  join sample_products s on s.slug = p.slug
)
update public.order_items
set product_id = null
where product_id in (select id from target_products);

with sample_products(slug) as (
  values
    ('kyocera-taskalfa-2554ci'),
    ('hp-laserjet-pro-mfp-4103fdw'),
    ('epson-ecotank-l6490'),
    ('ricoh-mp-3055-refurbished'),
    ('konica-minolta-bizhub-c258'),
    ('canon-ir-adv-dx-c3826i'),
    ('xerox-altalink-c8030'),
    ('brother-hl-l6210dw'),
    ('zebra-zd421-label-printer'),
    ('evolis-primacy-2-card-printer'),
    ('hp-410a-toner-set'),
    ('kyocera-tk-8345-toner'),
    ('canon-npg-67-toner'),
    ('ricoh-mpc-drum-unit'),
    ('epson-t673-ink-bottle-set')
),
target_products as (
  select p.id
  from public.products p
  join sample_products s on s.slug = p.slug
)
update public.quote_lines
set product_id = null
where product_id in (select id from target_products);

with sample_products(slug) as (
  values
    ('kyocera-taskalfa-2554ci'),
    ('hp-laserjet-pro-mfp-4103fdw'),
    ('epson-ecotank-l6490'),
    ('ricoh-mp-3055-refurbished'),
    ('konica-minolta-bizhub-c258'),
    ('canon-ir-adv-dx-c3826i'),
    ('xerox-altalink-c8030'),
    ('brother-hl-l6210dw'),
    ('zebra-zd421-label-printer'),
    ('evolis-primacy-2-card-printer'),
    ('hp-410a-toner-set'),
    ('kyocera-tk-8345-toner'),
    ('canon-npg-67-toner'),
    ('ricoh-mpc-drum-unit'),
    ('epson-t673-ink-bottle-set')
),
target_products as (
  select p.id
  from public.products p
  join sample_products s on s.slug = p.slug
)
delete from public.products
where id in (select id from target_products);

delete from public.banners
where (title, placement) in (
  values
    ('Office technology supplied, installed and supported', 'main'::public.banner_placement),
    ('Printer fleets, toners and spares for active offices', 'category'::public.banner_placement),
    ('Infrastructure services for growing teams', 'services'::public.banner_placement)
);

delete from public.service_entries
where slug in (
  'cctv-installation',
  'structured-cabling',
  'networking',
  'server-installation',
  'data-recovery',
  'managed-it-services',
  'cloud-solutions',
  'security-solutions'
);

delete from public.homepage_sections
where title in ('Ceter Services & Solutions', 'Latest Products', 'Featured Brands')
  and category_id is null;

delete from public.homepage_sections
where section_type = 'category_products'::public.homepage_section_type
  and category_id in (
    select id
    from public.categories
    where slug in (
      'printers-and-photocopiers',
      'toner-ink-and-consumables',
      'printer-parts-and-accessories',
      'barcode-pos-and-id-solutions',
      'office-equipment-and-services'
    )
  );

delete from public.brands b
where b.slug in (
  'kyocera',
  'hp',
  'epson',
  'zebra',
  'canon',
  'brother',
  'ricoh',
  'xerox',
  'konica-minolta',
  'evolis'
)
and not exists (select 1 from public.products p where p.brand_id = b.id);

do $$
declare
  deleted_count integer := 1;
begin
  while deleted_count > 0 loop
    delete from public.categories c
    where c.slug in (
      'printers-and-photocopiers',
      'printers',
      'laser-printers',
      'inkjet-printers',
      'multifunction-printers',
      'photocopiers',
      'monochrome-copiers',
      'colour-copiers',
      'multifunction-copiers',
      'large-format-printers',
      'plotters',
      'cad-printers',
      'graphics-printers',
      'toner-ink-and-consumables',
      'toner-cartridges',
      'hp-toners',
      'canon-toners',
      'kyocera-toners',
      'brother-ricoh-xerox-konica-minolta-toners',
      'ink',
      'ink-cartridges',
      'ink-bottles',
      'printer-consumables',
      'printer-consumables-drum-units',
      'imaging-units',
      'printer-consumables-developer-units',
      'waste-toner-bottles',
      'paper-and-media',
      'a4-a3-paper',
      'photo-paper',
      'thermal-rolls',
      'paper-and-media-barcode-labels',
      'printer-parts-and-accessories',
      'printer-spare-parts',
      'pickup-rollers',
      'print-heads',
      'transfer-rollers',
      'fuser-units',
      'photocopier-spare-parts',
      'photocopier-spare-parts-drum-units',
      'photocopier-spare-parts-developer-units',
      'transfer-units',
      'maintenance-kits',
      'printer-accessories',
      'printer-cables',
      'paper-trays',
      'printer-stands',
      'power-accessories',
      'barcode-pos-and-id-solutions',
      'barcode-and-label-printing',
      'barcode-printers',
      'label-printers',
      'barcode-and-label-printing-barcode-labels',
      'thermal-ribbons',
      'pos-equipment',
      'receipt-printers',
      'barcode-scanners',
      'cash-drawers',
      'receipt-rolls',
      'id-card-printing',
      'id-card-printers',
      'printer-ribbons',
      'pvc-cards',
      'lanyards-and-card-holders',
      'office-equipment-and-services',
      'office-equipment',
      'document-scanners',
      'laminators',
      'binding-machines',
      'shredders',
      'paper-cutters',
      'printer-services',
      'printer-services-repair',
      'printer-services-installation',
      'printer-services-maintenance',
      'photocopier-services',
      'photocopier-services-repair',
      'photocopier-services-installation',
      'photocopier-services-maintenance',
      'business-solutions',
      'managed-print-services',
      'toner-supply-contracts',
      'maintenance-contracts',
      'equipment-installation'
    )
    and not exists (select 1 from public.categories child where child.parent_id = c.id)
    and not exists (select 1 from public.products p where p.category_id = c.id)
    and not exists (select 1 from public.homepage_sections hs where hs.category_id = c.id)
    and not exists (select 1 from public.banners b where b.category_id = c.id);

    get diagnostics deleted_count = row_count;
  end loop;
end $$;

commit;
