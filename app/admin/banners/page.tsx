import { BannerManagementClient } from "@/app/admin/banners/BannerManagementClient";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { getBanners, getProductFilters } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function BannersPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminSession();
  const [banners, { categories }] = await Promise.all([getBanners(), getProductFilters()]);
  return (
    <>
      <PageHeader title="Banners & Storefront" copy="Manage up to five live homepage banners with aspect-ratio responsive image variants." />
      <BannerManagementClient
        banners={banners.map((banner) => ({
          id: banner.id,
          title: banner.title,
          kicker: banner.kicker,
          body: banner.body,
          cta_label: banner.cta_label,
          cta_href: banner.cta_href,
          image: banner.image,
          laptop_image: banner.laptop_image,
          mobile_image: banner.mobile_image,
          image_variants: banner.image_variants,
          placement: banner.placement,
          category_id: banner.category_id,
          sort_order: banner.sort_order,
          is_enabled: banner.is_enabled,
          category: banner.category ? { id: banner.category.id, name: banner.category.name } : null
        }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        success={params.success}
        error={params.error}
      />
    </>
  );
}
