import { updateProductPricingAction } from "@/app/admin/actions";
import { Money, PageHeader, Table } from "@/components/admin/AdminPrimitives";
import { getProductsPage, pageNumber, searchParam } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function PricingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  await requireAdminSession();
  const data = await getProductsPage({ q: searchParam(params.q), brand: searchParam(params.brand), category: searchParam(params.category), page: pageNumber(params.page), sort: searchParam(params.sort) as never });
  return (
    <>
      <PageHeader title="Pricing & Cost" copy="Inline edits write to product prices, price history and storefront cache." />
      <form className="admin-toolbar" action="/admin/pricing">
        <input className="admin-input min-w-64" name="q" defaultValue={searchParam(params.q) ?? ""} placeholder="Search product, SKU or MPN" />
        <button className="btn-dark">Search</button>
      </form>
      <Table headers={["Product", "SKU / MPN", "Brand", "Category", "Cost Price", "Selling Price", "Margin", "Stock", "Action"]} minWidth={1040}>
        {data.items.map((product) => {
          const margin = product.price_kes - (product.cost_price_kes ?? 0);
          const marginPct = product.price_kes > 0 && product.cost_price_kes != null ? Math.round((margin / product.price_kes) * 100) : null;
          return (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.sku ?? "No SKU"}<br /><span className="text-slate-500">{product.mpn ?? "No MPN"}</span></td>
              <td>{product.brand?.name ?? "Unbranded"}</td>
              <td>{product.category?.name ?? "Uncategorised"}</td>
              <td colSpan={2}>
                <form action={updateProductPricingAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={product.id} />
                  <input className="admin-input w-28" type="number" min={0} name="cost_price_kes" defaultValue={product.cost_price_kes ?? ""} aria-label="Cost price" />
                  <input className="admin-input w-28" type="number" min={0} name="price_kes" defaultValue={product.price_kes} aria-label="Selling price" />
                  <button className="btn-lite">Save</button>
                </form>
              </td>
              <td><Money value={margin} /> {marginPct == null ? "" : `(${marginPct}%)`}</td>
              <td>{product.stock_quantity}</td>
              <td><a className="btn-lite" href={`/admin/products/${product.id}/edit`}>Edit</a></td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
