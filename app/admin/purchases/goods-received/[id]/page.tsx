import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, qty } from "@/components/admin/AdminResourcePage";
import { postGoodsReceiptAction } from "@/app/admin/inventory/actions";

export default async function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("purchases.view");
  const canManage = hasPermission(session, "purchases.manage");
  const canSeeCost = hasPermission(session, "products.cost_price.view");
  const { id } = await params;
  if (!isRecordId(id)) notFound();
  const receipt = await prisma.goodsReceipt.findUnique({ where: { id }, include: { supplier: true, receiving_location: true, lines: { include: { product: true } } } });
  if (!receipt) notFound();
  return (
    <AdminResourcePage eyebrow="Purchases / Goods Received" title={receipt.grn_number} subtitle={`${receipt.supplier.company_name} into ${receipt.receiving_location.name}`} stats={[{ label: "Status", value: receipt.status }, { label: "Date", value: receipt.receipt_date.toLocaleString("en-KE") }, { label: "Lines", value: String(receipt.lines.length) }]}>
      <article className="ceter-admin-panel">
        <AdminTable columns={["Product", "SKU", "Received", "Rejected", "Unit cost", "Serials", "Condition"]} empty="No GRN lines exist." rows={receipt.lines.map((line) => [line.product.name, line.product.sku ?? "-", qty(line.quantity_received), qty(line.quantity_rejected), canSeeCost ? money(line.unit_cost_kes) : "Restricted", Array.isArray(line.serial_numbers) ? String(line.serial_numbers.length) : "0", line.condition ?? "-"])} />
        {canManage && receipt.status !== "posted" ? <form action={postGoodsReceiptAction}><input type="hidden" name="id" value={receipt.id} /><input type="hidden" name="return_to" value={`/admin/purchases/goods-received/${receipt.id}`} /><input type="hidden" name="idempotency_key" value={crypto.randomUUID()} /><button className="ceter-admin-primary-button">Post inventory receipt</button></form> : null}
      </article>
    </AdminResourcePage>
  );
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}
