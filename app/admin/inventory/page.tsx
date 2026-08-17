import { updateProductStockAction } from "@/app/admin/actions";
import { Card, Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { getInventoryMovements, getProductsPage, pageNumber, searchParam } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  await requireAdminSession();
  const [data, movements] = await Promise.all([
    getProductsPage({ q: searchParam(params.q), stock: searchParam(params.stock) as never, page: pageNumber(params.page), sort: searchParam(params.sort) as never }),
    getInventoryMovements()
  ]);
  return (
    <>
      <PageHeader title="Inventory" copy="Stock quantity, status, reorder settings and movement log from PostgreSQL." />
      <form className="admin-toolbar" action="/admin/inventory">
        <input className="admin-input min-w-64" name="q" defaultValue={searchParam(params.q) ?? ""} placeholder="Search inventory" />
        <select className="admin-input" name="stock" defaultValue={searchParam(params.stock) ?? "all"}>
          <option value="all">All stock</option>
          <option value="low">Low stock</option>
          <option value="backorder">Backorder</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        <button className="btn-dark">Apply</button>
      </form>
      <Table headers={["Product", "Status", "Qty", "Reorder Level", "Reorder Qty", "Stock Value", "Action"]} minWidth={940}>
        {data.items.map((product) => (
          <tr key={product.id}>
            <td>{product.name}<br /><span className="text-slate-500">{product.sku ?? product.mpn ?? product.slug}</span></td>
            <td><Pill tone={product.stock_status === "in_stock" ? "green" : product.stock_status === "backorder" ? "amber" : "red"}>{product.stock_status}</Pill></td>
            <td colSpan={3}>
              <form action={updateProductStockAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={product.id} />
                <input className="admin-input w-24" type="number" min={0} name="stock_quantity" defaultValue={product.stock_quantity} aria-label="Stock quantity" />
                <input className="admin-input w-24" type="number" min={0} name="reorder_level" defaultValue={product.reorder_level} aria-label="Reorder level" />
                <input className="admin-input w-24" type="number" min={0} name="reorder_quantity" defaultValue={product.reorder_quantity} aria-label="Reorder quantity" />
                <button className="btn-lite">Save</button>
              </form>
            </td>
            <td><Money value={product.stock_quantity * (product.cost_price_kes ?? 0)} /></td>
            <td><a className="btn-lite" href={`/admin/products/${product.id}/edit`}>Edit</a></td>
          </tr>
        ))}
      </Table>
      <Card title="Recent Stock Movements">
        <Table headers={["Product", "Delta", "Reason", "Reference", "User", "Date"]} minWidth={760}>
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td>{movement.product.name}</td>
              <td>{movement.delta}</td>
              <td>{movement.reason}</td>
              <td>{movement.reference ?? "None"}</td>
              <td>{movement.user?.full_name ?? "System"}</td>
              <td>{movement.created_at.toLocaleString("en-KE")}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
