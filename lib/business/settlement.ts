import type { BusinessPaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import { brandedPdfBytes, documentCreateData, uploadBusinessDocument } from "@/lib/business/documents";
import { queueNotification } from "@/lib/business/notifications";

const JOURNAL_ACCOUNTS = {
  cash: "1000",
  bank: "1010",
  receivables: "1300"
} as const;

type Tx = Prisma.TransactionClient;

async function nextNumber(tx: Tx, prefix: string, table: "payment" | "receipt") {
  const year = new Date().getFullYear();
  const startsWith = `${prefix}-${year}-`;
  const latest = table === "payment"
    ? await tx.payment.findFirst({ where: { payment_number: { startsWith } }, orderBy: { created_at: "desc" }, select: { payment_number: true } })
    : await tx.receipt.findFirst({ where: { receipt_number: { startsWith } }, orderBy: { created_at: "desc" }, select: { receipt_number: true } });
  const currentValue = Object.values(latest ?? {})[0];
  const current = Number(String(currentValue ?? "").split("-").pop() ?? "0");
  return `${prefix}-${year}-${String(current + 1).padStart(4, "0")}`;
}

async function nextJournalNumber(tx: Tx) {
  const year = new Date().getFullYear();
  const startsWith = `JRN-${year}-`;
  const latest = await tx.journalEntry.findFirst({ where: { entry_number: { startsWith } }, orderBy: { created_at: "desc" }, select: { entry_number: true } });
  const current = Number(String(latest?.entry_number ?? "").split("-").pop() ?? "0");
  return `JRN-${year}-${String(current + 1).padStart(4, "0")}`;
}

async function accountIds(tx: Tx, codes: string[]) {
  const accounts = await tx.account.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const map = new Map(accounts.map((account) => [account.code, account.id]));
  const missing = codes.filter((code) => !map.has(code));
  if (missing.length) throw new Error(`Missing chart of accounts: ${missing.join(", ")}.`);
  return map;
}

export async function settleInvoicePayment(input: {
  invoiceId: string;
  amountKes: number;
  method: BusinessPaymentMethod;
  reference?: string | null;
  notes?: string | null;
  createdById?: string | null;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId }, include: { customer: true } });
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "cancelled") throw new Error("Cancelled invoices cannot receive payments.");
    if (input.amountKes <= 0) throw new Error("Payment amount must be above zero.");
    if (input.amountKes > invoice.balance_kes) throw new Error("Payment cannot exceed outstanding invoice balance.");
    if (input.reference) {
      const duplicate = await tx.payment.findFirst({ where: { reference: input.reference, method: input.method }, select: { id: true } });
      if (duplicate) throw new Error("A payment with this reference already exists.");
    }

    const payment = await tx.payment.create({
      data: {
        payment_number: await nextNumber(tx, "PAY", "payment"),
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        amount_kes: input.amountKes,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        created_by_id: input.createdById
      }
    });
    const paidKes = invoice.paid_kes + input.amountKes;
    const balanceKes = Math.max(0, invoice.total_kes - paidKes);
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { paid_kes: paidKes, balance_kes: balanceKes, status: balanceKes === 0 ? "paid" : "partially_paid" }
    });
    const receipt = await tx.receipt.create({
      data: {
        receipt_number: await nextNumber(tx, "RCT", "receipt"),
        payment_id: payment.id,
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        amount_kes: input.amountKes,
        created_by_id: input.createdById
      }
    });
    await tx.transaction.createMany({
      data: [
        { transaction_type: "payment_received", direction: "credit", amount_kes: input.amountKes, customer_id: invoice.customer_id, invoice_id: invoice.id, payment_id: payment.id, memo: "Payment received", created_by_id: input.createdById },
        { transaction_type: "customer_balance_decrease", direction: "credit", amount_kes: input.amountKes, customer_id: invoice.customer_id, invoice_id: invoice.id, payment_id: payment.id, memo: "Customer balance reduced", created_by_id: input.createdById },
        { transaction_type: "cash_bank_increase", direction: "debit", amount_kes: input.amountKes, customer_id: invoice.customer_id, invoice_id: invoice.id, payment_id: payment.id, memo: "Cash or bank increased", created_by_id: input.createdById }
      ]
    });
    const accounts = await accountIds(tx, [input.method === "cash" ? JOURNAL_ACCOUNTS.cash : JOURNAL_ACCOUNTS.bank, JOURNAL_ACCOUNTS.receivables]);
    const journal = await tx.journalEntry.create({
      data: {
        entry_number: await nextJournalNumber(tx),
        source_type: "customer_payment",
        memo: `Customer payment ${payment.payment_number}`,
        entry_date: new Date(),
        invoice_id: invoice.id,
        payment_id: payment.id,
        created_by_id: input.createdById,
        lines: {
          create: [
            { account_id: accounts.get(input.method === "cash" ? JOURNAL_ACCOUNTS.cash : JOURNAL_ACCOUNTS.bank)!, direction: "debit", amount_kes: input.amountKes, memo: "Cash or bank received" },
            { account_id: accounts.get(JOURNAL_ACCOUNTS.receivables)!, direction: "credit", amount_kes: input.amountKes, memo: "Customer receivable reduced" }
          ]
        }
      }
    });
    return { invoice, updatedInvoice, payment, receipt, journal };
  });

  const pdf = brandedPdfBytes({
    type: "receipt",
    title: "Receipt",
    number: result.receipt.receipt_number,
    customerName: result.invoice.customer.name,
    customerCompany: result.invoice.customer.company_name,
    customerEmail: result.invoice.customer.email,
    customerPhone: result.invoice.customer.phone,
    totals: [["Amount", formatKes(input.amountKes)], ["Payment method", input.method], ["Reference", input.reference ?? result.payment.payment_number]]
  });
  const storagePath = `receipts/${result.receipt.receipt_number}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({
    data: documentCreateData({
      document_type: "receipt",
      title: `Receipt ${result.receipt.receipt_number}`,
      storage_path: storagePath,
      public_url: publicUrl,
      customer_id: result.invoice.customer_id,
      invoice_id: result.invoice.id,
      payment_id: result.payment.id,
      receipt_id: result.receipt.id,
      created_by_id: input.createdById
    })
  });
  await queueNotification(result.invoice.customer.profile_id, "receipt_generated", {
    recipientEmail: result.invoice.customer.email,
    recipientName: result.invoice.customer.name,
    documentNumber: result.receipt.receipt_number,
    amountKes: result.receipt.amount_kes,
    statusLabel: result.updatedInvoice.status
  });

  return result;
}
