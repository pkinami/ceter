drop table if exists public.icecat_category_mappings cascade;
drop table if exists public.icecat_lookup_cache cascade;
drop table if exists public.enrichment_jobs cascade;

alter table if exists public.products
  drop column if exists enriched_fields,
  drop column if exists enriched_at;

drop type if exists public.enrichment_job_status;
