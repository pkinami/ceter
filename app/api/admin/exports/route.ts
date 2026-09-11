import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

type ExportKind =
  | "products"
  | "reports"
  | "users"
  | "compliance"
  | "settings-business"
  | "audit"
  | "orders"
  | "quotes"
  | "invoices"
  | "receipts"
  | "payments"
  | "deliveries"
  | "documents"
  | "customers";

const permissions: Record<ExportKind, Parameters<typeof requirePermission>[0]> = {
  products: "products.view",
  reports: "accounting.reports.view",
  users: "users.view",
  compliance: "compliance.view",
  "settings-business": "settings.business.manage",
  audit: "audit.export",
  orders: "sales.view",
  quotes: "quotations.view",
  invoices: "billing.view",
  receipts: "billing.view",
  payments: "payments.view",
  deliveries: "deliveries.view",
  documents: "documents.view",
  customers: "customers.view"
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = normalizeKind(url.searchParams.get("kind"));
  await requirePermission(permissions[kind]);
  const rows = await exportRows(kind);
  return csvResponse(kind, rows);
}

function normalizeKind(value: string | null): ExportKind {
  if (
    value === "products" ||
    value === "users" ||
    value === "compliance" ||
    value === "audit" ||
    value === "settings-business" ||
    value === "orders" ||
    value === "quotes" ||
    value === "invoices" ||
    value === "receipts" ||
    value === "payments" ||
    value === "deliveries" ||
    value === "documents" ||
    value === "customers"
  ) return value;
  return "reports";
}

async function exportRows(kind: ExportKind): Promise<Array<Record<string, string | number>>> {
  if (kind === "products") {
    const rows = await prisma.product.findMany({ where: { archived_at: null }, include: { category: true, brand: true }, orderBy: { name: "asc" }, take: 1000 });
    return rows.map((row) => ({
      id: row.id,
      sku: row.sku ?? "",
      name: row.name,
      brand: row.brand?.name ?? "",
      category: row.category?.name ?? "",
      price_kes: row.price_kes,
      stock_quantity: row.stock_quantity,
      status: row.is_published ? "published" : "unpublished"
    }));
  }
  if (kind === "users") {
    const rows = await prisma.profile.findMany({ where: { role: { not: "customer" } }, orderBy: { created_at: "desc" }, take: 1000 });
    return rows.map((row) => ({ id: row.id, name: row.full_name ?? "", email: row.email ?? "", role: row.role, created_at: row.created_at.toISOString() }));
  }
  if (kind === "compliance") {
    const rows = await prisma.complianceDocument.findMany({ orderBy: { created_at: "desc" }, take: 1000 });
    return rows.map((row) => ({ id: row.id, number: row.document_number, type: row.document_type, title: row.title, issuer: row.issuer ?? "", status: row.status, expiry_date: row.expiry_date?.toISOString() ?? "" }));
  }
  if (kind === "settings-business") {
    const rows = await prisma.businessProfileVersion.findMany({ orderBy: { version: "desc" }, take: 1000 });
    return rows.map((row) => ({ version: row.version, legal_name: row.legal_name ?? "", trading_name: row.trading_name ?? "", email: row.general_email ?? "", state: row.approval_state, created_at: row.created_at.toISOString() }));
  }
  if (kind === "audit") {
    const rows = await prisma.auditLog.findMany({ orderBy: { created_at: "desc" }, take: 1000, include: { user: { select: { email: true, full_name: true } } } });
    return rows.map((row) => ({ id: row.id, date: row.created_at.toISOString(), user: row.user?.full_name ?? row.user?.email ?? "System", entity: row.entity, entity_id: row.entity_id, action: row.action }));
  }
  if (kind === "orders") {
    const rows = await prisma.order.findMany({ orderBy: { created_at: "desc" }, take: 1000, include: { customer: true } });
    return rows.map((row) => ({ id: row.id, order_number: row.order_number, source: row.source, customer: row.customer?.name ?? row.delivery_name ?? "", status: row.status, payment_status: row.payment_status, fulfilment_status: row.fulfilment_status, delivery_status: row.delivery_status, total_kes: row.total_kes, created_at: row.created_at.toISOString() }));
  }
  if (kind === "quotes") {
    const rows = await prisma.quote.findMany({ orderBy: { created_at: "desc" }, take: 1000, include: { customer: true } });
    return rows.map((row) => ({ id: row.id, quote_number: row.quote_number, customer: row.customer.name, status: row.status, total_kes: row.total_kes, created_at: row.created_at.toISOString() }));
  }
  if (kind === "invoices") {
    const rows = await prisma.invoice.findMany({ orderBy: { created_at: "desc" }, take: 1000, include: { customer: true } });
    return rows.map((row) => ({ id: row.id, invoice_number: row.invoice_number, customer: row.customer.name, status: row.status, payment_status: row.payment_status, fiscalization_status: row.fiscalization_status, total_kes: row.total_kes, balance_kes: row.balance_kes, created_at: row.created_at.toISOString() }));
  }
  if (kind === "receipts") {
    const rows = await prisma.receipt.findMany({ orderBy: { created_at: "desc" }, take: 1000, include: { customer: true, payment: true } });
    return rows.map((row) => ({ id: row.id, receipt_number: row.receipt_number, customer: row.customer.name, payment_number: row.payment.payment_number, status: row.status, amount_kes: row.amount_kes, issued_at: row.issued_at.toISOString() }));
  }
  if (kind === "payments") {
    const rows = await prisma.payment.findMany({ orderBy: { paid_at: "desc" }, take: 1000, include: { customer: true, invoice: true } });
    return rows.map((row) => ({ id: row.id, payment_number: row.payment_number, customer: row.customer.name, invoice_number: row.invoice?.invoice_number ?? "", status: row.status, method: row.method, amount_kes: row.amount_kes, unallocated_kes: row.unallocated_kes, paid_at: row.paid_at.toISOString() }));
  }
  if (kind === "deliveries") {
    const rows = await prisma.delivery.findMany({ orderBy: { created_at: "desc" }, take: 1000, include: { customer: true, order: true } });
    return rows.map((row) => ({ id: row.id, delivery_number: row.delivery_number, order_number: row.order.order_number, customer: row.customer?.name ?? "", status: row.status, scheduled_date: row.scheduled_date?.toISOString() ?? "", delivered_time: row.delivered_time?.toISOString() ?? "", created_at: row.created_at.toISOString() }));
  }
  if (kind === "documents") {
    const rows = await prisma.document.findMany({ orderBy: { created_at: "desc" }, take: 1000, include: { customer: true } });
    return rows.map((row) => ({ id: row.id, document_number: row.document_number ?? "", type: row.document_type, title: row.title, customer: row.customer?.name ?? "", lifecycle_status: row.lifecycle_status, signature_status: row.signature_status, verification_status: row.verification_status, created_at: row.created_at.toISOString() }));
  }
  if (kind === "customers") {
    const rows = await prisma.customer.findMany({ orderBy: { updated_at: "desc" }, take: 1000, include: { category: true } });
    return rows.map((row) => ({ id: row.id, customer_number: row.customer_number ?? "", name: row.name, company_name: row.company_name ?? "", category: row.category?.name ?? "", email: row.email ?? "", phone: row.phone ?? "", type: row.customer_type, status: row.archived_at ? "archived" : "active" }));
  }
  const [orders, invoices, payments] = await Promise.all([
    prisma.order.findMany({ orderBy: { created_at: "desc" }, take: 25, select: { order_number: true, status: true, payment_method: true, total_kes: true } }),
    prisma.invoice.count(),
    prisma.payment.count()
  ]);
  return orders.length
    ? orders.map((order) => ({ report: "recent_orders", order_number: order.order_number, status: order.status, payment_method: order.payment_method ?? "", total_kes: order.total_kes, invoices, payments, generated_at: new Date().toISOString() }))
    : [{ report: "summary", order_number: "", status: "", payment_method: "", total_kes: 0, invoices, payments, generated_at: new Date().toISOString() }];
}

function csvResponse(kind: ExportKind, rows: Array<Record<string, string | number>>) {
  const headers = rows[0] ? Object.keys(rows[0]) : ["message"];
  const bodyRows = rows.length ? rows : [{ message: "No records available" }];
  const csv = [headers, ...bodyRows.map((row) => headers.map((header) => String(row[header] ?? "")))].map((line) => line.map(csvCell).join(",")).join("\n");
  const filename = `ceter-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "x-content-type-options": "nosniff"
    }
  });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
