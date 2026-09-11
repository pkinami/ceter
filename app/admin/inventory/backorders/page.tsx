import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, qty } from "@/components/admin/AdminResourcePage";

export default async function BackordersPage() {
  const session = await requirePermission("inventory.view");
  const canPurchase = hasPermission(session, "purchases.manage");
  const products = await prisma.product.findMany({ where: { archived_at: null, stock_status: "backorder" }, include: { category: true, brand: true, inventory_balances: true }, orderBy: { name: "asc" }, take: 200 });
  return (
    <AdminResourcePage eyebrow="Inventory / Backorders" title="Backorders" subtitle="Inventory-side backorder foundation. Customer allocation will connect to sales demand records.">
      <article className="ceter-admin-panel">
        <AdminTable columns={["Product", "SKU", "Category", "Brand", "Available", "Reserved", "On order", "Reorder quantity", "Action"]} empty="No products are currently marked as backorder." rows={products.map((product) => [
          product.name,
          product.sku ?? "-",
          product.category?.name ?? "Uncategorised",
          product.brand?.name ?? "Unassigned",
          qty(product.inventory_balances.reduce((sum, balance) => sum + Number(balance.available_quantity), 0)),
          qty(product.inventory_balances.reduce((sum, balance) => sum + Number(balance.reserved_quantity), 0)),
          qty(product.inventory_balances.reduce((sum, balance) => sum + Number(balance.incoming_quantity), 0)),
          String(product.reorder_quantity),
          canPurchase ? <Link key={product.id} href="/admin/purchases/orders/new">Create PO</Link> : "Restricted"
        ])} />
      </article>
    </AdminResourcePage>
  );
}
