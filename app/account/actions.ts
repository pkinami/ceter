"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { brandedPdfBytes, documentCreateData, uploadBusinessDocument } from "@/lib/business/documents";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";
import { createBusinessNumber } from "@/lib/business/numbering";

function text(value: FormDataEntryValue | null) {
  const output = String(value ?? "").trim();
  return output || null;
}

async function portalCustomer() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/account");
  const customer = await prisma.customer.findFirst({ where: { profile_id: data.user.id } });
  if (!customer) redirect("/account?error=Complete your business profile before accepting a quote.");
  return { user: data.user, customer };
}

export async function acceptQuoteAction(formData: FormData) {
  const { customer } = await portalCustomer();
  const quoteId = text(formData.get("quote_id"));
  const lpo = text(formData.get("lpo_number"));
  if (!quoteId || !lpo) redirect("/account?error=An LPO number is required to accept a quotation.");
  const quote = await prisma.quote.findFirst({ where: { id: quoteId, customer_id: customer.id } });
  if (!quote || !["sent", "draft"].includes(quote.status)) redirect("/account?error=This quotation cannot be accepted.");
  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quote.id }, data: { status: "accepted", accepted_at: new Date(), customer_lpo_number: lpo } });
    if (quote.related_quote_request_id) await tx.quoteRequest.update({ where: { id: quote.related_quote_request_id }, data: { status: "won", internal_status: "accepted" } });
    await tx.internalNotification.create({ data: { notification_key: `quote:${quote.id}:accepted`, title: "Quotation accepted", body: `${quote.quote_number} was accepted with LPO ${lpo}.`, target_type: "Quote", target_id: quote.id } });
  });
  revalidatePath("/account");
  redirect("/account?success=Quotation accepted. Submit your purchase order to proceed.");
}

export async function cancelQuoteAction(formData: FormData) {
  const { customer } = await portalCustomer();
  const quoteId = text(formData.get("quote_id"));
  const quote = quoteId ? await prisma.quote.findFirst({ where: { id: quoteId, customer_id: customer.id } }) : null;
  if (!quote || !["draft", "sent"].includes(quote.status)) redirect("/account?error=This quotation cannot be cancelled.");
  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quote.id }, data: { status: "cancelled" } });
    if (quote.related_quote_request_id) await tx.quoteRequest.update({ where: { id: quote.related_quote_request_id }, data: { status: "closed", internal_status: "cancelled" } });
    await tx.internalNotification.create({ data: { notification_key: `quote:${quote.id}:cancelled`, title: "Quotation cancelled", body: `${quote.quote_number} was cancelled by the customer.`, target_type: "Quote", target_id: quote.id } });
  });
  revalidatePath("/account");
  redirect("/account?success=Quotation cancelled.");
}

export async function submitQuotePurchaseOrderAction(formData: FormData) {
  const { user, customer } = await portalCustomer();
  const quoteId = text(formData.get("quote_id"));
  const lpo = text(formData.get("lpo_number"));
  const quote = quoteId ? await prisma.quote.findFirst({ where: { id: quoteId, customer_id: customer.id }, include: { items: true } }) : null;
  if (!quote || quote.status !== "accepted" || !lpo || quote.customer_lpo_number !== lpo) redirect("/account?error=Use the LPO number accepted on this quotation.");
  if (quote.converted_order_id) redirect("/account?success=Your purchase order was already submitted.");
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({ data: { order_number: await createBusinessNumber(tx, "CPO"), source: "customer_purchase_order", user_id: user.id, customer_id: customer.id, customer_lpo_number: lpo, payment_status: "pending", fulfilment_status: "pending", delivery_status: "pending", total_kes: quote.total_kes, delivery_name: customer.name, delivery_email: customer.email, delivery_phone: customer.phone, order_items: { create: quote.items.map((item) => ({ product_id: item.product_id, service_label: item.description, quantity: item.quantity, price_at_purchase_kes: item.unit_price_kes })) } } });
    await tx.quote.update({ where: { id: quote.id }, data: { converted_order_id: created.id } });
    await tx.internalNotification.create({ data: { notification_key: `quote:${quote.id}:purchase-order`, title: "Customer purchase order submitted", body: `${quote.quote_number}: LPO ${lpo}.`, target_type: "Order", target_id: created.id } });
    return created;
  });
  void order;
  revalidatePath("/account");
  redirect("/account?success=Purchase order submitted. The admin can now issue your invoice.");
}

export async function generatePortalStatementAction(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/account");
  const customer = await prisma.customer.findFirst({ where: { profile_id: data.user.id }, include: { addresses: { where: { is_default: true }, take: 1 } } });
  if (!customer) redirect("/account?error=No business customer profile is linked to this account.");
  const periodStart = text(formData.get("period_start")) ? new Date(`${text(formData.get("period_start"))}T00:00:00.000Z`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = text(formData.get("period_end")) ? new Date(`${text(formData.get("period_end"))}T00:00:00.000Z`) : new Date();
  if (periodStart > periodEnd) redirect("/account?error=Statement start date must be before the end date.");
  const endExclusive = new Date(periodEnd);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const [openingInvoices, openingPayments, invoices, payments] = await Promise.all([
    prisma.invoice.aggregate({ where: { customer_id: customer.id, status: { not: "cancelled" }, created_at: { lt: periodStart } }, _sum: { total_kes: true } }),
    prisma.payment.aggregate({ where: { customer_id: customer.id, paid_at: { lt: periodStart } }, _sum: { amount_kes: true } }),
    prisma.invoice.findMany({ where: { customer_id: customer.id, status: { not: "cancelled" }, created_at: { gte: periodStart, lt: endExclusive } }, orderBy: { created_at: "asc" } }),
    prisma.payment.findMany({ where: { customer_id: customer.id, paid_at: { gte: periodStart, lt: endExclusive } }, orderBy: { paid_at: "asc" }, include: { receipt: true, invoice: true } })
  ]);
  const openingBalance = (openingInvoices._sum.total_kes ?? 0) - (openingPayments._sum.amount_kes ?? 0);
  const charges = invoices.reduce((sum, invoice) => sum + invoice.total_kes, 0);
  const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount_kes, 0);
  const closingBalance = openingBalance + charges - paymentTotal;
  const statementNumber = `STM-${new Date().getFullYear()}-${Date.now()}`;
  const rows = [
    ...invoices.map((invoice) => ({ date: invoice.created_at, description: `Invoice ${invoice.invoice_number}`, debit: invoice.total_kes, credit: 0, reference: invoice.invoice_number })),
    ...payments.map((payment) => ({ date: payment.paid_at, description: `${payment.receipt?.receipt_number ? `Receipt ${payment.receipt.receipt_number}` : `Payment ${payment.payment_number}`}${payment.invoice?.invoice_number ? ` for ${payment.invoice.invoice_number}` : ""}`, debit: 0, credit: payment.amount_kes, reference: payment.reference ?? payment.payment_number }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const pdf = await brandedPdfBytes({
    type: "customer_statement",
    title: "Customer Statement",
    number: statementNumber,
    issueDate: new Date().toLocaleDateString("en-KE"),
    meta: [
      ["Period", `${periodStart.toLocaleDateString("en-KE")} - ${periodEnd.toLocaleDateString("en-KE")}`],
      ["Opening", formatKes(openingBalance)],
      ["Closing", formatKes(closingBalance)]
    ],
    customerName: customer.name,
    customerCompany: customer.company_name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerAddress: customer.addresses[0]?.address_line_1,
    lines: rows.map((row) => ({ description: `${row.date.toLocaleDateString("en-KE")} | ${row.description} | ${row.reference}`, quantity: 1, unitPrice: row.debit ? formatKes(row.debit) : "", vat: "", total: row.credit ? `(${formatKes(row.credit)})` : formatKes(row.debit) })),
    totals: [["Opening balance", formatKes(openingBalance)], ["Charges", formatKes(charges)], ["Payments", formatKes(paymentTotal)], ["Closing balance", formatKes(closingBalance)]]
  });
  const storagePath = `customer-statements/${statementNumber}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({ data: documentCreateData({ document_type: "customer_statement", document_number: statementNumber, title: `Customer Statement ${statementNumber}`, storage_path: storagePath, public_url: publicUrl, customer_id: customer.id, category: "customer" }) });
  revalidatePath("/account");
  redirect("/account?success=Statement generated");
}
