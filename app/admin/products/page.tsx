import Link from "next/link";
import { updateProductPublicationAction } from "@/app/admin/actions";
import { EmptyState, FilterLink, Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { getProductsPage, pageNumber, productCanDelete, searchParam } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

type AdminSearchParams = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<AdminSearchParams> };

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminSession();
  const input = {
    q: searchParam(params.q),
    brand: searchParam(params.brand),
    category: searchParam(params.category),
    publication: searchParam(params.publication) as "published" | "draft" | "all" | undefined,
    stock: searchParam(params.stock) as never,
    sort: searchParam(params.sort) as never,
    page: pageNumber(params.page)
  };
  const data = await getProductsPage(input);
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  if (input.brand) query.set("brand", input.brand);
  if (input.category) query.set("category", input.category);

  return (
    <>
      <PageHeader
        title="Products"
        copy={`${data.total} matching database products with server-side pagination, filters and publication controls.`}
        actions={<Link href="/admin/products/new" className="btn-dark">Add Product</Link>}
      />
      <form className="admin-toolbar" action="/admin/products">
        <input className="admin-input min-w-64" name="q" defaultValue={input.q ?? ""} placeholder="Search products, SKU, MPN" />
        <select className="admin-input" name="brand" defaultValue={input.brand ?? ""}>
          <option value="">All brands</option>
          {data.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </select>
        <select className="admin-input" name="category" defaultValue={input.category ?? ""}>
          <option value="">All categories</option>
          {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select className="admin-input" name="publication" defaultValue={input.publication ?? "all"}>
          <option value="all">Published and draft</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select className="admin-input" name="stock" defaultValue={input.stock ?? "all"}>
          <option value="all">All stock</option>
          <option value="in_stock">In stock</option>
          <option value="backorder">Backorder</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="low">Low stock</option>
        </select>
        <select className="admin-input" name="sort" defaultValue={input.sort ?? "newest"}>
          <option value="newest">Recently updated</option>
          <option value="name">Name</option>
          <option value="price_asc">Price low-high</option>
          <option value="price_desc">Price high-low</option>
          <option value="stock_asc">Stock low-high</option>
          <option value="stock_desc">Stock high-low</option>
        </select>
        <button className="btn-dark">Apply</button>
      </form>
      {data.items.length ? (
        <>
          <Table headers={["Product", "SKU / MPN", "Brand", "Category", "Price", "Stock", "Status", "Actions"]} minWidth={1040}>
            {data.items.map((product) => (
              <tr key={product.id}>
                <td><Link href={`/product/${product.slug}`} className="font-semibold hover:text-signal">{product.name}</Link></td>
                <td>{product.sku ?? "No SKU"}<br /><span className="text-slate-500">{product.mpn ?? "No MPN"}</span></td>
                <td>{product.brand?.name ?? "Unbranded"}</td>
                <td>{product.category?.name ?? "Uncategorised"}</td>
                <td><Money value={product.price_kes} /></td>
                <td>{product.stock_quantity} <span className="text-slate-500">{product.stock_status}</span></td>
                <td><Pill tone={product.is_published ? "green" : "amber"}>{product.is_published ? "Published" : "Draft"}</Pill></td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Link className="btn-lite" href={`/admin/products/${product.id}/edit`}>Edit</Link>
                    <form action={updateProductPublicationAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="next" value={product.is_published ? "unpublish" : "publish"} />
                      <button className="btn-lite">{product.is_published ? "Unpublish" : "Publish"}</button>
                    </form>
                    <form action={updateProductPublicationAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="next" value="archive" />
                      <button className="btn-lite" title={productCanDelete(product) ? "Archive product" : "Archive product with history preserved"}>Archive</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="admin-toolbar justify-end">
            <FilterLink href={`/admin/products?${new URLSearchParams({ ...Object.fromEntries(query), page: String(Math.max(1, data.page - 1)) })}`} active={false}>Previous</FilterLink>
            <span>Page {data.page} of {data.pageCount}</span>
            <FilterLink href={`/admin/products?${new URLSearchParams({ ...Object.fromEntries(query), page: String(Math.min(data.pageCount, data.page + 1)) })}`} active={false}>Next</FilterLink>
          </div>
        </>
      ) : <EmptyState title={input.q || input.brand || input.category || input.publication || input.stock ? "No products match these filters" : "No products yet"} copy={input.q || input.brand || input.category || input.publication || input.stock ? "Adjust the search or import products from the source workbook." : "Import a clean product catalogue or add the first product manually."} action={<Link href="/admin/import" className="btn-dark">Open Import Centre</Link>} />}
    </>
  );
}
