import type { BusinessPaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import { brandedPdfBytes, documentCreateData, uploadBusinessDocument } from "@/lib/business/documents";
import { queueNotification } from "@/lib/business/notifications";
import { createBusinessNumber } from "@/lib/business/numbering";

const JOURNAL_ACCOUNTS = {
  cash: "1000",
  bank: "1010",
  receivables: "1300"
} as const;

type Tx = Prisma.TransactionClient;

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
        payment_number: createBusinessNumber("PAY"),
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
      data: {
        paid_kes: paidKes,
        balance_kes: balanceKes,
        status: balanceKes === 0 ? "paid" : "partially_paid",
        payment_status: balanceKes === 0 ? "paid" : "partially_paid"
      }
    });
    const receipt = await tx.receipt.create({
      data: {
        receipt_number: createBusinessNumber("RCT"),
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
        entry_number: createBusinessNumber("JRN"),
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

  const pdf = await brandedPdfBytes({
    type: "receipt",
    title: "Receipt",
    number: result.receipt.receipt_number,
    meta: [
      ["Payment No.", result.payment.payment_number],
      ["Invoice", result.invoice.invoice_number],
      ["Method", input.method],
      ["Reference", input.reference ?? result.payment.payment_number]
    ],
    customerName: result.invoice.customer.name,
    customerCompany: result.invoice.customer.company_name,
    customerEmail: result.invoice.customer.email,
    customerPhone: result.invoice.customer.phone,
    lines: [{
      // Receipt rows are receipt-specific: detail | related invoice/reference.
      description: `Payment received | ${result.invoice.invoice_number}`,
      quantity: 1,
      unitPrice: formatKes(result.invoice.total_kes),
      discount: "KSh 0",
      vat: "",
      total: formatKes(input.amountKes)
    }],
    totals: [
      ["Invoice total", formatKes(result.invoice.total_kes)],
      ["Amount paid", formatKes(input.amountKes)],
      ["Balance", formatKes(result.updatedInvoice.balance_kes)]
    ],
    footer: [input.notes].filter(Boolean) as string[]
  });
  const storagePath = `receipts/${result.receipt.receipt_number}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({
    data: documentCreateData({
      document_type: "receipt",
      document_number: result.receipt.receipt_number,
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
