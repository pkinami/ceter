"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { brandedPdfBytes, documentCreateData, uploadBusinessDocument } from "@/lib/business/documents";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";

function text(value: FormDataEntryValue | null) {
  const output = String(value ?? "").trim();
  return output || null;
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
  const statementNumber = `STM-${new Date().getFullYear()}-${Date.now()}`;
  const rows = [
    ...invoices.map((invoice) => ({ date: invoice.created_at, description: `Invoice ${invoice.invoice_number}`, debit: invoice.total_kes, credit: 0, reference: invoice.invoice_number })),
    ...payments.map((payment) => ({ date: payment.paid_at, description: `${payment.receipt?.receipt_number ? `Receipt ${payment.receipt.receipt_number}` : `Payment ${payment.payment_number}`}${payment.invoice?.invoice_number ? ` for ${payment.invoice.invoice_number}` : ""}`, debit: 0, credit: payment.amount_kes, reference: payment.reference ?? payment.payment_number }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const pdf = brandedPdfBytes({
    type: "customer_statement",
    title: "Customer Statement",
    number: statementNumber,
    customerName: customer.name,
    customerCompany: customer.company_name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerAddress: customer.addresses[0]?.address_line_1,
    lines: rows.map((row) => ({ description: `${row.date.toLocaleDateString("en-KE")} | ${row.description} | ${row.reference}`, quantity: 1, unitPrice: row.debit ? formatKes(row.debit) : "", vat: "", total: row.credit ? `(${formatKes(row.credit)})` : formatKes(row.debit) })),
    totals: [["Opening balance", formatKes(openingBalance)], ["Charges", formatKes(charges)], ["Payments", formatKes(paymentTotal)], ["Closing balance", formatKes(openingBalance + charges - paymentTotal)]]
  });
  const storagePath = `customer-statements/${statementNumber}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({ data: documentCreateData({ document_type: "customer_statement", title: `Customer Statement ${statementNumber}`, storage_path: storagePath, public_url: publicUrl, customer_id: customer.id, category: "customer" }) });
  revalidatePath("/account");
  redirect("/account?success=Statement generated");
}
