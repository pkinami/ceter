"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  BusinessPaymentMethod,
  BusinessQuoteStatus,
  CustomerType,
  DocumentCategory,
  InvoiceStatus,
  Prisma,
  ProformaStatus,
  PurchaseOrderStatus,
  SupplierInvoiceStatus,
  TenderStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission } from "@/lib/admin/auth";
import { formatKes } from "@/lib/utils";
import { brandedPdfBytes, deleteBusinessDocuments, documentCreateData, uploadBusinessDocument, BUSINESS_DOCUMENT_BUCKET } from "@/lib/business/documents";
import { createEtimsSubmission, retryEtimsSubmission, submitEtimsRecord } from "@/lib/business/etims";
import { initiateInvoiceMpesa } from "@/lib/business/mpesa";
import { queueNotification } from "@/lib/business/notifications";
import { settleInvoicePayment } from "@/lib/business/settlement";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBusinessNumber } from "@/lib/business/numbering";

const VAT_RATE = 0.16;
const JOURNAL_ACCOUNTS = {
  cash: "1000",
  bank: "1010",
  inventory: "1200",
  receivables: "1300",
  payables: "2000",
  taxesPayable: "2100",
  productSales: "4000",
  serviceIncome: "4010",
  generalExpense: "5090"
} as const;

function text(value: FormDataEntryValue | null) {
  const output = String(value ?? "").trim();
  return output || null;
}

function intValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function dateValue(value: FormDataEntryValue | null) {
  const raw = text(value);
  return raw ? new Date(`${raw}T00:00:00.000Z`) : null;
}

function messageRedirect(path: string, key: "success" | "error", message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`);
}

function returnPath(formData: FormData, fallback: string) {
  const requested = text(formData.get("return_to"));
  return requested?.startsWith("/admin/") ? requested : fallback;
}

function formMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (/prisma|transaction api|expired transaction|invocation/i.test(error.message)) {
      return fallback;
    }
    return error.message;
  }
  return fallback;
}

async function nextNumber(prefix: string) {
  return createBusinessNumber(prisma, prefix);
}

async function nextErpNumber(prefix: string) {
  return createBusinessNumber(prisma, prefix);
}

async function accountIds(tx: Prisma.TransactionClient, codes: string[]) {
  const accounts = await tx.account.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const map = new Map(accounts.map((account) => [account.code, account.id]));
  const missing = codes.filter((code) => !map.has(code));
  if (missing.length) throw new Error(`Missing chart of accounts: ${missing.join(", ")}. Run the ERP migration.`);
  return map;
}

async function createJournalEntry(tx: Prisma.TransactionClient, input: {
  sourceType: Prisma.JournalEntryCreateInput["source_type"];
  memo: string;
  entryDate?: Date;
  createdById?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  expenseId?: string | null;
  supplierInvoiceId?: string | null;
  supplierPaymentId?: string | null;
  goodsReceivedNoteId?: string | null;
  lines: Array<{ code: string; direction: "debit" | "credit"; amount: number; memo?: string }>;
}) {
  const debit = input.lines.filter((line) => line.direction === "debit").reduce((sum, line) => sum + line.amount, 0);
  const credit = input.lines.filter((line) => line.direction === "credit").reduce((sum, line) => sum + line.amount, 0);
  if (debit !== credit) throw new Error(`Unbalanced journal entry: debit ${debit}, credit ${credit}.`);
  const ids = await accountIds(tx, [...new Set(input.lines.map((line) => line.code))]);
  const entryNumber = await createBusinessNumber(tx, "JRN");
  return tx.journalEntry.create({
    data: {
      entry_number: entryNumber,
      source_type: input.sourceType,
      memo: input.memo,
      entry_date: input.entryDate ?? new Date(),
      invoice_id: input.invoiceId,
      payment_id: input.paymentId,
      expense_id: input.expenseId,
      supplier_invoice_id: input.supplierInvoiceId,
      supplier_payment_id: input.supplierPaymentId,
      goods_received_note_id: input.goodsReceivedNoteId,
      created_by_id: input.createdById,
      lines: {
        create: input.lines.map((line) => ({
          account_id: ids.get(line.code)!,
          direction: line.direction,
          amount_kes: line.amount,
          memo: line.memo
        }))
      }
    }
  });
}

function isFinalInvoiceStatus(status: InvoiceStatus) {
  return !["draft", "cancelled"].includes(status);
}

async function issueInvoiceStock(tx: Prisma.TransactionClient, invoice: {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  created_by_id: string | null;
  items: Array<{ product_id: string | null; quantity: number }>;
}, userId: string) {
  if (!isFinalInvoiceStatus(invoice.status)) return;
  const productQuantities = new Map<string, number>();
  for (const item of invoice.items) {
    if (!item.product_id) continue;
    productQuantities.set(item.product_id, (productQuantities.get(item.product_id) ?? 0) + item.quantity);
  }
  if (!productQuantities.size) return;

  const alreadyIssued = await tx.stockMovement.count({
    where: { reason: "SALE", reference: invoice.id, product_id: { in: [...productQuantities.keys()] } }
  });
  if (alreadyIssued > 0) return;

  const products = await tx.product.findMany({
    where: { id: { in: [...productQuantities.keys()] } },
    select: { id: true, name: true, stock_quantity: true, stock_status: true }
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
  for (const [productId, quantity] of productQuantities) {
    const product = productMap.get(productId);
    if (!product) throw new Error("Invoice contains a product that no longer exists.");
    if (product.stock_status !== "backorder" && product.stock_quantity < quantity) {
      throw new Error(`${product.name} has only ${product.stock_quantity} units available.`);
    }
    const nextQuantity = product.stock_quantity - quantity;
    const updateResult = product.stock_status === "backorder"
      ? await tx.product.update({
        where: { id: productId },
        data: { stock_quantity: { decrement: quantity } }
      })
      : await tx.product.updateMany({
        where: { id: productId, stock_quantity: { gte: quantity } },
        data: {
          stock_quantity: { decrement: quantity },
          stock_status: nextQuantity > 0 ? "in_stock" : "out_of_stock"
        }
      });
    if ("count" in updateResult && updateResult.count !== 1) {
      throw new Error(`${product.name} stock changed while issuing invoice ${invoice.invoice_number}. Try again.`);
    }
    await tx.stockMovement.create({
      data: {
        product_id: productId,
        delta: -quantity,
        reason: "SALE",
        reference: invoice.id,
        user_id: userId
      }
    });
  }
}

function parseItems(formData: FormData) {
  const vatEnabled = formData.get("vat_enabled") === "on";
  const vatInclusive = vatEnabled && formData.get("vat_inclusive") === "on";
  // The client can add rows indefinitely. Derive the submitted indexes rather
  // than silently dropping everything after row eight; this is also what lets
  // the PDF engine exercise its continuation-page layout in production.
  const indexes = [...new Set([...formData.keys()].map((key) => key.match(/^item_(?:product_id|description|quantity|unit_price_kes|discount_kes)_(\d+)$/)?.[1]).filter((value): value is string => Boolean(value)).map(Number))].sort((a, b) => a - b);
  const rows = indexes.map((index) => {
    const productId = text(formData.get(`item_product_id_${index}`));
    const manualDescription = text(formData.get(`item_description_${index}`));
    const quantity = intValue(formData.get(`item_quantity_${index}`));
    const enteredPrice = decimalValue(formData.get(`item_unit_price_kes_${index}`));
    const unitPrice = Math.round(vatInclusive ? enteredPrice / (1 + VAT_RATE) : enteredPrice);
    const discount = Math.round(decimalValue(formData.get(`item_discount_kes_${index}`)));
    if (!productId && !manualDescription) return null;
    if (quantity <= 0) throw new Error("Each line item needs a quantity above zero.");
    if (unitPrice < 0 || discount < 0) throw new Error("Line prices and discounts cannot be negative.");
    const taxableBase = Math.max(0, quantity * unitPrice - discount);
    const vat = vatEnabled ? Math.round(taxableBase * VAT_RATE) : 0;
    return {
      product_id: productId,
      item_type: productId ? "product" as const : "service" as const,
      description: manualDescription ?? "Catalogue product",
      quantity,
      unit_price_kes: unitPrice,
      discount_kes: discount,
      vat_kes: vat,
      line_total_kes: taxableBase + vat,
      sort_order: index
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!rows.length) throw new Error("Add at least one product or service line.");
  const subtotal = rows.reduce((sum, item) => sum + item.quantity * item.unit_price_kes, 0);
  const discount = rows.reduce((sum, item) => sum + item.discount_kes, 0);
  const vat = rows.reduce((sum, item) => sum + item.vat_kes, 0);
  return { rows, subtotal, discount, vat, total: subtotal - discount + vat, vatEnabled };
}

function decimalValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

async function productNames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(products.map((product) => [product.id, product.name]));
}

async function createDocumentFor(kind: "quote" | "proforma" | "invoice" | "receipt", data: {
  id: string;
  number: string;
  title: string;
  customer: { id: string; name: string; email: string | null; phone: string | null; company_name?: string | null; tax_pin?: string | null; addresses?: Array<{ address_line_1: string; address_line_2: string | null; city: string | null; region: string | null }> };
  lines?: Array<{ description: string; quantity: number; unit_price_kes: number; discount_kes?: number; vat_kes?: number; line_total_kes: number }>;
  totals: Array<[string, string]>;
  userId: string;
  paymentId?: string;
  receiptId?: string;
  dueDate?: Date | null;
  validUntil?: Date | null;
  sourceNumber?: string | null;
  lpoNumber?: string | null;
  status?: string | null;
  vatEnabled?: boolean;
  terms?: string | null;
  notes?: string | null;
}) {
  const customerAddress = data.customer.addresses?.[0] ? [data.customer.addresses[0].address_line_1, data.customer.addresses[0].address_line_2, data.customer.addresses[0].city, data.customer.addresses[0].region].filter(Boolean).join(", ") : null;
  const documentInput: Parameters<typeof brandedPdfBytes>[0] = {
    type: kind === "quote" ? "quotation" : kind === "proforma" ? "proforma_invoice" : kind,
    title: data.title,
    number: data.number,
    issueDate: new Date().toLocaleDateString("en-KE"),
    dueDate: data.dueDate?.toLocaleDateString("en-KE"),
    meta: [
      ["Status", data.status ?? "Ready"],
      ["Reference", data.sourceNumber],
      ["LPO No.", data.lpoNumber],
      ["Validity", data.validUntil?.toLocaleDateString("en-KE")],
      ["VAT Treatment", data.vatEnabled === undefined ? null : data.vatEnabled ? "VAT applied where taxable" : "VAT not applied"]
    ],
    customerName: data.customer.name,
    customerCompany: data.customer.company_name,
    customerEmail: data.customer.email,
    customerPhone: data.customer.phone,
    customerAddress,
    customerPin: data.customer.tax_pin,
    lines: data.lines?.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: formatKes(line.unit_price_kes),
      discount: formatKes(line.discount_kes ?? 0),
      vat: formatKes(line.vat_kes ?? 0),
      taxInfo: (line.vat_kes ?? 0) > 0 ? "VAT applied to this line" : null,
      total: formatKes(line.line_total_kes)
    })),
    totals: data.totals,
    footer: [data.terms, data.notes].filter(Boolean) as string[]
  };
  // All customer documents are composed directly with the PDF engine.  The
  // Word master is a design-input for the one-time template preparation step;
  // it is never populated, uploaded, or converted on a customer request.
  const pdf = await brandedPdfBytes(documentInput);
  const storagePath = `${kind}s/${data.number}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({
    data: documentCreateData({
      document_type: kind === "quote" ? "quotation" : kind === "proforma" ? "proforma_invoice" : kind,
      document_number: data.number,
      title: `${data.title} ${data.number}`,
      storage_path: storagePath,
      public_url: publicUrl,
      customer_id: data.customer.id,
      quote_id: kind === "quote" ? data.id : undefined,
      proforma_invoice_id: kind === "proforma" ? data.id : undefined,
      invoice_id: kind === "invoice" ? data.id : undefined,
      payment_id: data.paymentId,
      receipt_id: data.receiptId,
      created_by_id: data.userId
    })
  });
}

export async function upsertCustomerAction(formData: FormData) {
  const session = await requirePermission(text(formData.get("id")) ? "customers.update" : "customers.create");
  const returnTo = returnPath(formData, "/admin/business?tab=customers");
  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  if (!name) messageRedirect(returnTo, "error", "Customer name is required.");
  const data = {
    name,
    category_id: text(formData.get("category_id")),
    company_name: text(formData.get("company_name")),
    customer_type: String(formData.get("customer_type") ?? "individual") as CustomerType,
    phone: text(formData.get("phone")),
    email: text(formData.get("email")),
    tax_pin: text(formData.get("tax_pin")),
    notes: text(formData.get("notes")),
    created_by_id: session.userId
  };
  try {
    const customer = id ? await prisma.customer.update({ where: { id }, data }) : await prisma.customer.create({ data });
    const addressLine = text(formData.get("address_line_1"));
    if (addressLine) {
      await prisma.customerAddress.create({
        data: {
          customer_id: customer.id,
          label: text(formData.get("address_label")) ?? "Delivery",
          recipient_name: text(formData.get("address_recipient")),
          phone: text(formData.get("address_phone")),
          address_line_1: addressLine,
          address_line_2: text(formData.get("address_line_2")),
          city: text(formData.get("address_city")),
          region: text(formData.get("address_region")),
          delivery_notes: text(formData.get("delivery_notes")),
          is_default: formData.get("address_default") === "on"
        }
      });
    }
  } catch (error) {
    messageRedirect(returnTo, "error", formMessage(error, "Customer could not be saved."));
  }
  revalidatePath("/admin/business");
  messageRedirect(returnTo, "success", id ? "Customer updated." : "Customer created.");
}

export async function upsertCustomerCategoryAction(formData: FormData) {
  await requirePermission("customers.categories.manage");
  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  if (!name) messageRedirect("/admin/business?tab=customer-categories", "error", "Category name is required.");
  try {
    if (id) {
      await prisma.customerCategory.update({ where: { id }, data: { name, description: text(formData.get("description")), is_active: formData.get("is_active") !== "off" } });
    } else {
      await prisma.customerCategory.create({ data: { name, description: text(formData.get("description")) } });
    }
  } catch (error) {
    messageRedirect("/admin/business?tab=customer-categories", "error", formMessage(error, "Customer category could not be saved."));
  }
  revalidatePath("/admin/business");
  revalidatePath("/admin/customers");
  messageRedirect("/admin/business?tab=customer-categories", "success", id ? "Customer category updated." : "Customer category created.");
}

export async function deleteCustomerCategoryAction(formData: FormData) {
  await requirePermission("customers.categories.manage");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=customer-categories", "error", "Category id is required.");
  try {
    const usage = await prisma.customer.count({ where: { category_id: id } });
    if (usage > 0) throw new Error("Category is in use. Reassign those customers before deleting it.");
    await prisma.customerCategory.delete({ where: { id } });
  } catch (error) {
    messageRedirect("/admin/business?tab=customer-categories", "error", formMessage(error, "Customer category could not be deleted."));
  }
  revalidatePath("/admin/business");
  revalidatePath("/admin/customers");
  messageRedirect("/admin/business?tab=customer-categories", "success", "Customer category deleted.");
}

export async function deleteCustomerAction(formData: FormData) {
  await requirePermission("customers.archive");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=customers", "error", "Customer id is required.");
  try {
    await prisma.customer.delete({ where: { id } });
  } catch {
    messageRedirect("/admin/business?tab=customers", "error", "Customer has linked business records and cannot be deleted.");
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=customers", "success", "Customer deleted.");
}

export async function generateCustomerStatementAction(formData: FormData) {
  const session = await requirePermission("customers.statements.view");
  const customerId = text(formData.get("customer_id"));
  if (!customerId) messageRedirect("/admin/business?tab=customers", "error", "Customer id is required.");
  const periodStart = dateValue(formData.get("period_start")) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = dateValue(formData.get("period_end")) ?? new Date();
  if (periodStart > periodEnd) messageRedirect("/admin/business?tab=customers", "error", "Statement start date must be before the end date.");
  try {
    const endExclusive = new Date(periodEnd);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, include: { addresses: { where: { is_default: true }, take: 1 } } });
    if (!customer) throw new Error("Customer not found.");
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
    const rows = [
      ...invoices.map((invoice) => ({
        date: invoice.created_at,
        description: `Invoice ${invoice.invoice_number}`,
        debit: invoice.total_kes,
        credit: 0,
        reference: invoice.invoice_number
      })),
      ...payments.map((payment) => ({
        date: payment.paid_at,
        description: `${payment.receipt?.receipt_number ? `Receipt ${payment.receipt.receipt_number}` : `Payment ${payment.payment_number}`}${payment.invoice?.invoice_number ? ` for ${payment.invoice.invoice_number}` : ""}`,
        debit: 0,
        credit: payment.amount_kes,
        reference: payment.reference ?? payment.payment_number
      }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    const statementNumber = `STM-${new Date().getFullYear()}-${Date.now()}`;
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
      lines: rows.map((row) => ({
        // Statement renderer consumes date | document/reference | description.
        description: `${row.date.toLocaleDateString("en-KE")} | ${row.reference} | ${row.description}`,
        quantity: 1,
        unitPrice: row.debit ? formatKes(row.debit) : "",
        vat: "",
        total: row.credit ? `(${formatKes(row.credit)})` : formatKes(row.debit)
      })),
      totals: [
        ["Period", `${periodStart.toLocaleDateString("en-KE")} - ${periodEnd.toLocaleDateString("en-KE")}`],
        ["Opening balance", formatKes(openingBalance)],
        ["Charges", formatKes(charges)],
        ["Payments", formatKes(paymentTotal)],
        ["Closing balance", formatKes(closingBalance)]
      ],
      footer: ["Credit notes are included when available in the business ledger."]
    });
    const storagePath = `customer-statements/${statementNumber}.pdf`;
    const publicUrl = await uploadBusinessDocument(storagePath, pdf);
    await prisma.document.create({
      data: documentCreateData({
        document_type: "customer_statement",
        document_number: statementNumber,
        title: `Customer Statement ${statementNumber}`,
        storage_path: storagePath,
        public_url: publicUrl,
        customer_id: customer.id,
        category: "customer",
        created_by_id: session.userId
      })
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=customers", "error", formMessage(error, "Customer statement could not be generated."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=customers", "success", "Customer statement generated.");
}

export async function createQuoteAction(formData: FormData) {
  const session = await requirePermission("quotations.create");
  const returnTo = returnPath(formData, "/admin/business?tab=quotes");
  const customerId = text(formData.get("customer_id"));
  if (!customerId) messageRedirect(returnTo, "error", "Select a customer.");
  try {
    const items = parseItems(formData);
    const names = await productNames(items.rows.map((item) => item.product_id).filter((id): id is string => Boolean(id)));
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, include: { addresses: { where: { is_default: true }, take: 1 } } });
    if (!customer) throw new Error("Customer not found.");
    const quoteNumber = await nextNumber("QTN");
    const quoteData = {
        quote_number: quoteNumber,
        customer_id: customerId,
        related_quote_request_id: text(formData.get("related_quote_request_id")),
        customer_lpo_number: text(formData.get("customer_lpo_number")),
        status: String(formData.get("status") ?? "draft") as BusinessQuoteStatus,
        subtotal_kes: items.subtotal,
        discount_kes: items.discount,
        vat_kes: items.vat,
        total_kes: items.total,
        vat_enabled: items.vatEnabled,
        notes: text(formData.get("notes")),
        terms: text(formData.get("terms")),
        valid_until: dateValue(formData.get("valid_until")),
        created_by_id: session.userId,
        items: { create: items.rows.map((item) => ({ ...item, description: item.product_id ? names.get(item.product_id) ?? item.description : item.description })) }
    } satisfies Prisma.QuoteUncheckedCreateInput;
    // Generate before creating the business record, so a renderer failure
    // cannot leave a quotation that the UI reports as generated.
    const customerAddress = customer.addresses[0] ? [customer.addresses[0].address_line_1, customer.addresses[0].address_line_2, customer.addresses[0].city, customer.addresses[0].region].filter(Boolean).join(", ") : null;
    const pdf = await brandedPdfBytes({ type: "quotation", title: "Quotation", number: quoteNumber, issueDate: new Date().toLocaleDateString("en-KE"), dueDate: quoteData.valid_until?.toLocaleDateString("en-KE"), meta: [["LPO No.", quoteData.customer_lpo_number]], customerName: customer.name, customerCompany: customer.company_name, customerEmail: customer.email, customerPhone: customer.phone, customerAddress, customerPin: customer.tax_pin, lines: items.rows.map((item) => ({ description: item.product_id ? names.get(item.product_id) ?? item.description : item.description, quantity: item.quantity, unitPrice: formatKes(item.unit_price_kes), discount: formatKes(item.discount_kes), vat: formatKes(item.vat_kes), total: formatKes(item.line_total_kes) })), totals: [["Subtotal", formatKes(items.subtotal)], ["Discount", formatKes(items.discount)], ["VAT", formatKes(items.vat)], ["Total Due", formatKes(items.total)]], footer: [quoteData.terms, quoteData.notes].filter(Boolean) as string[] });
    const pdfPath = `quotes/${quoteNumber}.pdf`;
    try {
      await uploadBusinessDocument(pdfPath, pdf);
      const quote = await prisma.$transaction(async (tx) => {
        const created = await tx.quote.create({ data: quoteData, include: { customer: true, items: true } });
        if (created.related_quote_request_id) {
          await tx.quoteRequest.update({ where: { id: created.related_quote_request_id }, data: { related_quote_id: created.id, internal_status: "quoted", status: "quoted", converted_at: new Date(), converted_by_id: session.userId } });
          await tx.internalNotification.create({ data: { notification_key: `quote-request:${created.related_quote_request_id}:quoted`, title: "Formal quotation generated", body: `${created.quote_number} is ready for the customer.`, target_type: "Quote", target_id: created.id } });
        }
        await tx.document.create({ data: documentCreateData({ document_type: "quotation", document_number: quoteNumber, title: `Quotation ${quoteNumber}`, storage_path: pdfPath, customer_id: customer.id, quote_id: created.id, created_by_id: session.userId }) });
        return created;
      });
      await queueNotification(quote.customer.profile_id, "quote_created", {
        recipientEmail: quote.customer.email,
        recipientName: quote.customer.name,
        documentNumber: quote.quote_number,
        amountKes: quote.total_kes,
        statusLabel: quote.status
      });
    } catch (error) {
      await deleteBusinessDocuments([pdfPath]).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    messageRedirect(returnTo, "error", formMessage(error, "Quotation could not be created."));
  }
  revalidatePath("/admin/business");
  messageRedirect(returnTo, "success", "Quotation created and PDF stored.");
}

export async function updateQuoteAction(formData: FormData) {
  const session = await requirePermission("quotations.manage");
  const quoteId = text(formData.get("quote_id"));
  const returnTo = returnPath(formData, quoteId ? `/admin/quotes/${quoteId}` : "/admin/quotes");
  if (!quoteId) messageRedirect(returnTo, "error", "Quotation not found.");
  try {
    const existing = await prisma.quote.findUnique({ where: { id: quoteId }, include: { customer: { include: { addresses: { where: { is_default: true }, take: 1 } } }, items: true, invoices: true } });
    if (!existing) throw new Error("Quotation not found.");
    if (existing.invoices.length || !["draft", "sent", "accepted"].includes(existing.status)) throw new Error("This quotation can no longer be edited.");
    const items = parseItems(formData);
    const names = await productNames(items.rows.map((item) => item.product_id).filter((id): id is string => Boolean(id)));
    const lpo = text(formData.get("customer_lpo_number"));
    const notes = text(formData.get("notes"));
    const terms = text(formData.get("terms"));
    const validUntil = dateValue(formData.get("valid_until"));
    const version = existing.version + 1;
    const customerAddress = existing.customer.addresses[0] ? [existing.customer.addresses[0].address_line_1, existing.customer.addresses[0].address_line_2, existing.customer.addresses[0].city, existing.customer.addresses[0].region].filter(Boolean).join(", ") : null;
    const pdf = await brandedPdfBytes({ type: "quotation", title: "Quotation", number: existing.quote_number, issueDate: (existing.issue_date ?? existing.created_at).toLocaleDateString("en-KE"), dueDate: validUntil?.toLocaleDateString("en-KE"), meta: [["LPO No.", lpo]], customerName: existing.customer.name, customerCompany: existing.customer.company_name, customerEmail: existing.customer.email, customerPhone: existing.customer.phone, customerAddress, customerPin: existing.customer.tax_pin, lines: items.rows.map((item) => ({ description: item.product_id ? names.get(item.product_id) ?? item.description : item.description, quantity: item.quantity, unitPrice: formatKes(item.unit_price_kes), discount: formatKes(item.discount_kes), vat: formatKes(item.vat_kes), total: formatKes(item.line_total_kes) })), totals: [["Subtotal", formatKes(items.subtotal)], ["Discount", formatKes(items.discount)], ["VAT", formatKes(items.vat)], ["Total Due", formatKes(items.total)]], footer: [terms, notes].filter(Boolean) as string[] });
    const pdfPath = `quotes/${existing.quote_number}-v${version}.pdf`;
    await uploadBusinessDocument(pdfPath, pdf);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.quote.update({ where: { id: quoteId }, data: { version, customer_lpo_number: lpo, notes, terms, valid_until: validUntil, subtotal_kes: items.subtotal, discount_kes: items.discount, vat_kes: items.vat, total_kes: items.total, vat_enabled: items.vatEnabled } });
        await tx.quoteItem.deleteMany({ where: { quote_id: quoteId } });
        await tx.quoteItem.createMany({ data: items.rows.map((item) => ({ ...item, quote_id: quoteId, description: item.product_id ? names.get(item.product_id) ?? item.description : item.description })) });
        await tx.document.create({ data: documentCreateData({ document_type: "quotation", document_number: `${existing.quote_number} v${version}`, title: `Quotation ${existing.quote_number} (version ${version})`, storage_path: pdfPath, customer_id: existing.customer_id, quote_id: quoteId, created_by_id: session.userId }) });
      });
    } catch (error) {
      await deleteBusinessDocuments([pdfPath]).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    messageRedirect(returnTo, "error", formMessage(error, "Quotation could not be updated."));
  }
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/business");
  messageRedirect(returnTo, "success", "Quotation updated. A new version PDF is available in Documents.");
}

export async function createSaleAction(formData: FormData) {
  const session = await requireAnyPermission(["sales.create", "invoices.create"]);
  const returnTo = returnPath(formData, "/admin/business?tab=sales");
  const customerId = text(formData.get("customer_id"));
  if (!customerId) messageRedirect(returnTo, "error", "Select a customer.");
  try {
    const items = parseItems(formData);
    const names = await productNames(items.rows.map((item) => item.product_id).filter((id): id is string => Boolean(id)));
    const invoiceNumber = await nextNumber("INV");
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          customer_id: customerId,
          customer_lpo_number: text(formData.get("customer_lpo_number")),
          status: "sent",
          subtotal_kes: items.subtotal,
          discount_kes: items.discount,
          vat_kes: items.vat,
          total_kes: items.total,
          balance_kes: items.total,
          vat_enabled: items.vatEnabled,
          notes: text(formData.get("notes")),
          terms: text(formData.get("terms")),
          due_date: dateValue(formData.get("due_date")),
          payment_terms: text(formData.get("payment_timing")) === "now" ? "Paid at sale" : "Pay later",
          created_by_id: session.userId,
          items: { create: items.rows.map((item) => ({ ...item, description: item.product_id ? names.get(item.product_id) ?? item.description : item.description })) }
        },
        include: { customer: true, items: true }
      });
      await tx.transaction.createMany({ data: [
        { transaction_type: "invoice_created", direction: "debit", amount_kes: created.total_kes, customer_id: created.customer_id, invoice_id: created.id, memo: "Customer balance increased", created_by_id: session.userId },
        { transaction_type: "sales_recorded", direction: "credit", amount_kes: created.total_kes, customer_id: created.customer_id, invoice_id: created.id, memo: "Sales recorded", created_by_id: session.userId },
        { transaction_type: "customer_balance_increase", direction: "debit", amount_kes: created.total_kes, customer_id: created.customer_id, invoice_id: created.id, memo: "Invoice issued", created_by_id: session.userId }
      ] });
      await createJournalEntry(tx, {
        sourceType: "sales_invoice",
        memo: `Sales invoice ${created.invoice_number}`,
        createdById: session.userId,
        invoiceId: created.id,
        lines: [
          { code: JOURNAL_ACCOUNTS.receivables, direction: "debit", amount: created.total_kes, memo: "Customer receivable" },
          { code: JOURNAL_ACCOUNTS.productSales, direction: "credit", amount: created.total_kes - created.vat_kes, memo: "Sales revenue" },
          ...(created.vat_kes > 0 ? [{ code: JOURNAL_ACCOUNTS.taxesPayable, direction: "credit" as const, amount: created.vat_kes, memo: "Output VAT" }] : [])
        ]
      });
      await issueInvoiceStock(tx, created, session.userId);
      return created;
    }, { timeout: 20_000 });
    await createDocumentFor("invoice", {
      id: invoice.id,
      number: invoice.invoice_number,
      title: "Invoice",
      customer: invoice.customer,
      lines: invoice.items,
      totals: [["Subtotal", formatKes(invoice.subtotal_kes)], ["Discount", formatKes(invoice.discount_kes)], ["VAT", formatKes(invoice.vat_kes)], ["Total", formatKes(invoice.total_kes)], ["Balance", formatKes(invoice.balance_kes)]],
      userId: session.userId,
      dueDate: invoice.due_date,
      sourceNumber: invoice.customer_lpo_number,
      lpoNumber: invoice.customer_lpo_number,
      vatEnabled: invoice.vat_enabled,
      terms: invoice.terms,
      notes: invoice.notes
    });
    if (text(formData.get("payment_timing")) === "now" && invoice.total_kes > 0) {
      await settleInvoicePayment({
        invoiceId: invoice.id,
        amountKes: invoice.total_kes,
        method: String(formData.get("method") ?? "mpesa") as BusinessPaymentMethod,
        reference: text(formData.get("reference")),
        notes: "Payment recorded during sale creation.",
        createdById: session.userId
      });
    }
    await queueNotification(invoice.customer.profile_id, "invoice_created", {
      recipientEmail: invoice.customer.email,
      recipientName: invoice.customer.name,
      documentNumber: invoice.invoice_number,
      amountKes: invoice.total_kes,
      statusLabel: invoice.status
    });
  } catch (error) {
    messageRedirect(returnTo, "error", formMessage(error, "Sale could not be created."));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/business");
  messageRedirect(returnTo, "success", "Sale invoice created.");
}

export async function updateQuoteStatusAction(formData: FormData) {
  await requirePermission("quotations.update");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=quotes", "error", "Quote id is required.");
  const status = String(formData.get("status") ?? "draft") as BusinessQuoteStatus;
  const quote = await prisma.quote.update({ where: { id }, data: { status }, include: { customer: true } });
  if (status === "accepted") {
    await queueNotification(quote.customer.profile_id, "quote_approved", {
      recipientEmail: quote.customer.email,
      recipientName: quote.customer.name,
      documentNumber: quote.quote_number,
      amountKes: quote.total_kes,
      statusLabel: quote.status
    });
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=quotes", "success", "Quotation status updated.");
}

export async function quoteToProformaAction(formData: FormData) {
  const session = await requirePermission("quotations.convert");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=quotes", "error", "Quote id is required.");
  try {
    const quote = await prisma.quote.findUnique({ where: { id }, include: { customer: true, items: true } });
    if (!quote) throw new Error("Quote not found.");
    const number = await nextNumber("PFI");
    const proforma = await prisma.proformaInvoice.create({
      data: {
        proforma_number: number,
        quote_id: quote.id,
        customer_id: quote.customer_id,
        customer_lpo_number: quote.customer_lpo_number,
        subtotal_kes: quote.subtotal_kes,
        discount_kes: quote.discount_kes,
        vat_kes: quote.vat_kes,
        total_kes: quote.total_kes,
        vat_enabled: quote.vat_enabled,
        notes: quote.notes,
        terms: quote.terms,
        created_by_id: session.userId,
        items: { create: quote.items.map((item) => ({
          product_id: item.product_id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price_kes: item.unit_price_kes,
          discount_kes: item.discount_kes,
          vat_kes: item.vat_kes,
          line_total_kes: item.line_total_kes,
          sort_order: item.sort_order
        })) }
      },
      include: { customer: true, items: true }
    });
    await createDocumentFor("proforma", {
      id: proforma.id,
      number: proforma.proforma_number,
      title: "Pro-forma Invoice",
      customer: proforma.customer,
      lines: proforma.items,
      totals: [["Subtotal", formatKes(proforma.subtotal_kes)], ["Discount", formatKes(proforma.discount_kes)], ["VAT", formatKes(proforma.vat_kes)], ["Total", formatKes(proforma.total_kes)]],
      userId: session.userId,
      sourceNumber: quote.quote_number,
      lpoNumber: proforma.customer_lpo_number,
      vatEnabled: proforma.vat_enabled,
      terms: proforma.terms,
      notes: proforma.notes
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=quotes", "error", formMessage(error, "Pro-forma invoice could not be created."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=proformas", "success", "Quotation converted to pro-forma invoice.");
}

export async function quoteToInvoiceAction(formData: FormData) {
  const id = text(formData.get("id"));
  const form = new FormData();
  form.set("quote_id", id ?? "");
  return createInvoiceFromSource(form);
}

export async function proformaToInvoiceAction(formData: FormData) {
  const id = text(formData.get("id"));
  const form = new FormData();
  form.set("proforma_invoice_id", id ?? "");
  return createInvoiceFromSource(form);
}

async function createInvoiceFromSource(formData: FormData) {
  const session = await requirePermission("quotations.convert");
  const quoteId = text(formData.get("quote_id"));
  const proformaId = text(formData.get("proforma_invoice_id"));
  if (!quoteId && !proformaId) messageRedirect("/admin/business?tab=invoices", "error", "Select a source document.");
  try {
    const source = proformaId
      ? await prisma.proformaInvoice.findUnique({ where: { id: proformaId }, include: { customer: true, items: true } })
      : await prisma.quote.findUnique({ where: { id: quoteId! }, include: { customer: true, items: true } });
    if (!source) throw new Error("Source document not found.");
    const existingInvoice = proformaId
      ? await prisma.invoice.findFirst({ where: { proforma_invoice_id: proformaId } })
      : await prisma.invoice.findFirst({ where: { quote_id: quoteId } });
    if (existingInvoice) throw new Error(`This document was already converted to invoice ${existingInvoice.invoice_number}.`);
    const number = await nextNumber("INV");
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoice_number: number,
          quote_id: "quote_number" in source ? source.id : source.quote_id,
          proforma_invoice_id: "proforma_number" in source ? source.id : null,
          customer_id: source.customer_id,
          customer_lpo_number: "customer_lpo_number" in source ? source.customer_lpo_number : null,
          source_order_id: "quote_number" in source ? source.converted_order_id : null,
          status: "sent",
          subtotal_kes: source.subtotal_kes,
          discount_kes: source.discount_kes,
          vat_kes: source.vat_kes,
          total_kes: source.total_kes,
          balance_kes: source.total_kes,
          vat_enabled: source.vat_enabled,
          notes: source.notes,
          terms: source.terms,
          created_by_id: session.userId,
          items: { create: source.items.map((item) => ({
            product_id: item.product_id,
            item_type: item.item_type,
            description: item.description,
            quantity: item.quantity,
            unit_price_kes: item.unit_price_kes,
            discount_kes: item.discount_kes,
            vat_kes: item.vat_kes,
            line_total_kes: item.line_total_kes,
            sort_order: item.sort_order
          })) }
        },
        include: { customer: true, items: true }
      });
      await tx.transaction.createMany({ data: [
        { transaction_type: "invoice_created", direction: "debit", amount_kes: created.total_kes, customer_id: created.customer_id, invoice_id: created.id, memo: "Customer balance increased", created_by_id: session.userId },
        { transaction_type: "sales_recorded", direction: "credit", amount_kes: created.total_kes, customer_id: created.customer_id, invoice_id: created.id, memo: "Sales recorded", created_by_id: session.userId },
        { transaction_type: "customer_balance_increase", direction: "debit", amount_kes: created.total_kes, customer_id: created.customer_id, invoice_id: created.id, memo: "Invoice issued", created_by_id: session.userId }
      ] });
      await createJournalEntry(tx, {
        sourceType: "sales_invoice",
        memo: `Sales invoice ${created.invoice_number}`,
        createdById: session.userId,
        invoiceId: created.id,
        lines: [
          { code: JOURNAL_ACCOUNTS.receivables, direction: "debit", amount: created.total_kes, memo: "Customer receivable" },
          { code: created.vat_kes > 0 ? JOURNAL_ACCOUNTS.productSales : JOURNAL_ACCOUNTS.productSales, direction: "credit", amount: created.total_kes - created.vat_kes, memo: "Sales revenue" },
          ...(created.vat_kes > 0 ? [{ code: JOURNAL_ACCOUNTS.taxesPayable, direction: "credit" as const, amount: created.vat_kes, memo: "Output VAT" }] : [])
        ]
      });
      await issueInvoiceStock(tx, created, session.userId);
      return created;
    });
    await createDocumentFor("invoice", {
      id: invoice.id,
      number: invoice.invoice_number,
      title: "Invoice",
      customer: invoice.customer,
      lines: invoice.items,
      totals: [["Subtotal", formatKes(invoice.subtotal_kes)], ["Discount", formatKes(invoice.discount_kes)], ["VAT", formatKes(invoice.vat_kes)], ["Total", formatKes(invoice.total_kes)], ["Balance", formatKes(invoice.balance_kes)]],
      userId: session.userId,
      sourceNumber: "quote_number" in source ? source.quote_number : source.proforma_number,
      lpoNumber: invoice.customer_lpo_number,
      vatEnabled: invoice.vat_enabled,
      terms: invoice.terms,
      notes: invoice.notes
    });
    await queueNotification(invoice.customer.profile_id, "invoice_created", {
      recipientEmail: invoice.customer.email,
      recipientName: invoice.customer.name,
      documentNumber: invoice.invoice_number,
      amountKes: invoice.total_kes,
      statusLabel: invoice.status
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=invoices", "error", formMessage(error, "Invoice could not be created."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=invoices", "success", "Invoice created and PDF stored.");
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const session = await requirePermission("invoices.update");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=invoices", "error", "Invoice id is required.");
  try {
    await prisma.$transaction(async (tx) => {
      const status = String(formData.get("status") ?? "sent") as InvoiceStatus;
      const invoice = await tx.invoice.update({
        where: { id },
        data: { status },
        include: { items: true }
      });
      await issueInvoiceStock(tx, invoice, session.userId);
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=invoices", "error", formMessage(error, "Invoice status could not be updated."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=invoices", "success", "Invoice status updated.");
}

export async function updateProformaStatusAction(formData: FormData) {
  await requirePermission("invoices.update");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=proformas", "error", "Pro-forma id is required.");
  await prisma.proformaInvoice.update({ where: { id }, data: { status: String(formData.get("status") ?? "sent") as ProformaStatus } });
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=proformas", "success", "Pro-forma status updated.");
}

export async function recordPaymentAction(formData: FormData) {
  const session = await requirePermission("payments.record");
  const returnTo = returnPath(formData, "/admin/business?tab=payments");
  const invoiceId = text(formData.get("invoice_id"));
  if (!invoiceId) messageRedirect(returnTo, "error", "Select an invoice.");
  const amount = intValue(formData.get("amount_kes"));
  if (amount <= 0) messageRedirect(returnTo, "error", "Payment amount must be above zero.");
  try {
    const result = await settleInvoicePayment({
      invoiceId,
      amountKes: amount,
      method: String(formData.get("method") ?? "mpesa") as BusinessPaymentMethod,
      reference: text(formData.get("reference")),
      notes: text(formData.get("notes")),
      createdById: session.userId,
      operationKey: text(formData.get("operation_key"))
    });
    if (!result.invoice || !result.payment || !result.updatedInvoice) throw new Error("The payment was not fully posted. Check the invoice before retrying.");
    await queueNotification(result.invoice.customer.profile_id, "payment_received", {
      recipientEmail: result.invoice.customer.email,
      recipientName: result.invoice.customer.name,
      documentNumber: result.payment.payment_number,
      amountKes: result.payment.amount_kes,
      statusLabel: result.updatedInvoice.status
    });
  } catch (error) {
    messageRedirect(returnTo, "error", formMessage(error, "Payment could not be recorded."));
  }
  revalidatePath("/admin/business");
  messageRedirect(returnTo, "success", "Payment recorded and receipt generated.");
}

export async function createExpenseAction(formData: FormData) {
  const session = await requirePermission("expenses.create");
  const returnTo = returnPath(formData, "/admin/business?tab=expenses");
  const categoryName = text(formData.get("category_name"));
  if (!categoryName) messageRedirect(returnTo, "error", "Expense category is required.");
  const amount = intValue(formData.get("amount_kes"));
  if (amount <= 0) messageRedirect(returnTo, "error", "Expense amount must be above zero.");
  try {
    const category = await prisma.expenseCategory.upsert({
      where: { name: categoryName },
      update: { is_active: true },
      create: { name: categoryName }
    });
    const expenseNumber = await nextNumber("EXP");
    let attachmentPath: string | null = null;
    const file = formData.get("attachment");
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) throw new Error("Expense attachment must be 5 MB or smaller.");
      const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
      attachmentPath = `expenses/${expenseNumber}.${extension}`;
      const supabase = createAdminClient();
      const { error } = await supabase.storage.from(BUSINESS_DOCUMENT_BUCKET).upload(attachmentPath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type || "application/octet-stream",
        upsert: true
      });
      if (error) throw new Error(`Expense attachment upload failed: ${error.message}`);
    }
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          expense_number: expenseNumber,
          category_id: category.id,
          supplier: text(formData.get("supplier")),
          amount_kes: amount,
          method: String(formData.get("method") ?? "cash") as BusinessPaymentMethod,
          expense_date: dateValue(formData.get("expense_date")) ?? new Date(),
          notes: text(formData.get("notes")),
          attachment_url: null,
          created_by_id: session.userId
        }
      });
      await tx.transaction.create({
        data: { transaction_type: "expense_recorded", direction: "debit", amount_kes: amount, expense_id: created.id, memo: categoryName, created_by_id: session.userId }
      });
      await createJournalEntry(tx, {
        sourceType: "expense",
        memo: `Expense ${created.expense_number}: ${categoryName}`,
        createdById: session.userId,
        expenseId: created.id,
        entryDate: created.expense_date,
        lines: [
          { code: JOURNAL_ACCOUNTS.generalExpense, direction: "debit", amount, memo: categoryName },
          { code: created.method === "cash" ? JOURNAL_ACCOUNTS.cash : JOURNAL_ACCOUNTS.bank, direction: "credit", amount, memo: "Paid from cash or bank" }
        ]
      });
      if (attachmentPath) {
        await tx.document.create({ data: documentCreateData({
          document_type: "expense_attachment",
          document_number: expenseNumber,
          title: `Expense attachment ${expenseNumber}`,
          storage_path: attachmentPath,
          public_url: null,
          expense_id: created.id,
          created_by_id: session.userId
        }) });
      }
      return created;
    });
    void expense;
  } catch (error) {
    messageRedirect(returnTo, "error", formMessage(error, "Expense could not be recorded."));
  }
  revalidatePath("/admin/business");
  messageRedirect(returnTo, "success", "Expense recorded.");
}

function parsePurchaseItems(formData: FormData) {
  const rows = Array.from({ length: 6 }, (_, index) => {
    const productId = text(formData.get(`po_product_id_${index}`));
    const quantity = intValue(formData.get(`po_quantity_${index}`));
    const unitPrice = intValue(formData.get(`po_unit_price_kes_${index}`));
    const vat = intValue(formData.get(`po_vat_kes_${index}`));
    if (!productId) return null;
    if (quantity <= 0) throw new Error("Purchase lines need quantities above zero.");
    return { product_id: productId, quantity, unit_price_kes: unitPrice, vat_kes: vat, line_total_kes: quantity * unitPrice + vat, sort_order: index };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!rows.length) throw new Error("Add at least one purchase line.");
  return {
    rows,
    subtotal: rows.reduce((sum, item) => sum + item.quantity * item.unit_price_kes, 0),
    vat: rows.reduce((sum, item) => sum + item.vat_kes, 0),
    total: rows.reduce((sum, item) => sum + item.line_total_kes, 0)
  };
}

export async function upsertSupplierAction(formData: FormData) {
  const session = await requirePermission("suppliers.manage");
  const id = text(formData.get("id"));
  const companyName = text(formData.get("company_name"));
  if (!companyName) messageRedirect("/admin/business?tab=suppliers", "error", "Supplier company name is required.");
  try {
    const data = {
      company_name: companyName,
      contact_person: text(formData.get("contact_person")),
      phone: text(formData.get("phone")),
      email: text(formData.get("email")),
      address: text(formData.get("address")),
      kra_pin: text(formData.get("kra_pin")),
      notes: text(formData.get("notes")),
      created_by_id: session.userId
    };
    if (id) {
      await prisma.supplier.update({ where: { id }, data });
    } else {
      await prisma.supplier.create({ data });
    }
  } catch (error) {
    messageRedirect("/admin/business?tab=suppliers", "error", formMessage(error, "Supplier could not be saved."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=suppliers", "success", id ? "Supplier updated." : "Supplier created.");
}

export async function deleteSupplierAction(formData: FormData) {
  await requirePermission("suppliers.manage");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=suppliers", "error", "Supplier id is required.");
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchase_orders: true, goods_received_notes: true, supplier_invoices: true, supplier_payments: true, stock_movements: true, documents: true, company_documents: true } }
      }
    });
    if (!supplier) throw new Error("Supplier not found.");
    const linkedRecords = Object.values(supplier._count).reduce((sum, count) => sum + count, 0);
    if (linkedRecords > 0) throw new Error("Supplier has purchase, accounting or document history and cannot be deleted.");
    await prisma.supplier.delete({ where: { id } });
  } catch (error) {
    messageRedirect("/admin/business?tab=suppliers", "error", formMessage(error, "Supplier could not be deleted."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=suppliers", "success", "Supplier deleted.");
}

export async function createPurchaseOrderAction(formData: FormData) {
  const session = await requirePermission("purchases.manage");
  const supplierId = text(formData.get("supplier_id"));
  if (!supplierId) messageRedirect("/admin/business?tab=procurement", "error", "Select a supplier.");
  try {
    const items = parsePurchaseItems(formData);
    const names = await productNames(items.rows.map((item) => item.product_id));
    const poNumber = await nextErpNumber("PO");
    const po = await prisma.purchaseOrder.create({
      data: {
        po_number: poNumber,
        supplier_id: supplierId,
        status: String(formData.get("status") ?? "draft") as PurchaseOrderStatus,
        expected_delivery_date: dateValue(formData.get("expected_delivery_date")),
        subtotal_kes: items.subtotal,
        vat_kes: items.vat,
        total_kes: items.total,
        notes: text(formData.get("notes")),
        created_by_id: session.userId,
        items: { create: items.rows.map((item) => ({ ...item, description: names.get(item.product_id) ?? "Catalogue product" })) }
      },
      include: { supplier: true, items: true }
    });
    const pdf = await brandedPdfBytes({
      type: "purchase_order",
      title: "Purchase Order",
      number: po.po_number,
      dueDate: po.expected_delivery_date?.toLocaleDateString("en-KE"),
      meta: [
        ["Supplier", po.supplier.company_name],
        ["Expected Delivery", po.expected_delivery_date?.toLocaleDateString("en-KE")],
        ["Status", po.status],
        ["VAT Treatment", po.vat_kes > 0 ? "VAT applied where taxable" : "VAT not applied"]
      ],
      customerName: po.supplier.company_name,
      customerEmail: po.supplier.email,
      customerPhone: po.supplier.phone,
      customerAddress: po.supplier.address,
      lines: po.items.map((item) => ({ description: item.description, quantity: item.quantity, unitPrice: formatKes(item.unit_price_kes), vat: formatKes(item.vat_kes), total: formatKes(item.line_total_kes) })),
      totals: [["Subtotal", formatKes(po.subtotal_kes)], ["VAT", formatKes(po.vat_kes)], ["Total", formatKes(po.total_kes)]],
      footer: [po.notes].filter(Boolean) as string[]
    });
    const storagePath = `purchase-orders/${po.po_number}.pdf`;
    const publicUrl = await uploadBusinessDocument(storagePath, pdf);
    await prisma.document.create({ data: documentCreateData({ document_type: "purchase_order", document_number: po.po_number, title: `Purchase Order ${po.po_number}`, storage_path: storagePath, public_url: publicUrl, supplier_id: supplierId, purchase_order_id: po.id, category: "supplier", created_by_id: session.userId }) });
  } catch (error) {
    messageRedirect("/admin/business?tab=procurement", "error", formMessage(error, "Purchase order could not be created."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=procurement", "success", "Purchase order created.");
}

export async function updatePurchaseOrderStatusAction(formData: FormData) {
  await requirePermission("purchases.manage");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=procurement", "error", "Purchase order id is required.");
  try {
    const status = String(formData.get("status") ?? "draft") as PurchaseOrderStatus;
    const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { goods_received_notes: true, supplier_invoices: true } });
    if (!po) throw new Error("Purchase order not found.");
    if (status === "cancelled" && (po.goods_received_notes.length > 0 || po.supplier_invoices.length > 0)) {
      throw new Error("Purchase order has receiving or supplier invoice history and cannot be cancelled.");
    }
    await prisma.purchaseOrder.update({ where: { id }, data: { status } });
  } catch (error) {
    messageRedirect("/admin/business?tab=procurement", "error", formMessage(error, "Purchase order status could not be updated."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=procurement", "success", "Purchase order status updated.");
}

export async function receiveGoodsAction(formData: FormData) {
  const session = await requirePermission("purchases.manage");
  const poId = text(formData.get("purchase_order_id"));
  if (!poId) messageRedirect("/admin/business?tab=procurement", "error", "Select a purchase order.");
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
    if (!po) throw new Error("Purchase order not found.");
    const received = po.items.map((item) => ({ item, quantity: intValue(formData.get(`receive_${item.id}`)) })).filter((row) => row.quantity > 0);
    if (!received.length) throw new Error("Enter at least one received quantity.");
    const overReceived = received.find(({ item, quantity }) => item.received_quantity + quantity > item.quantity);
    if (overReceived) throw new Error(`${overReceived.item.description} cannot be received above the ordered quantity.`);
    const grnNumber = await nextErpNumber("GRN");
    await prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceivedNote.create({
        data: {
          grn_number: grnNumber,
          supplier_id: po.supplier_id,
          purchase_order_id: po.id,
          delivery_date: dateValue(formData.get("delivery_date")) ?? new Date(),
          delivery_reference: text(formData.get("delivery_reference")),
          notes: text(formData.get("notes")),
          created_by_id: session.userId,
          items: { create: received.map(({ item, quantity }) => ({ purchase_order_item_id: item.id, product_id: item.product_id, quantity_received: quantity, unit_cost_kes: item.unit_price_kes })) }
        }
      });
      for (const { item, quantity } of received) {
        await tx.product.update({ where: { id: item.product_id }, data: { stock_quantity: { increment: quantity }, stock_status: "in_stock", cost_price_kes: item.unit_price_kes } });
        await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { received_quantity: { increment: quantity } } });
        await tx.stockMovement.create({ data: { product_id: item.product_id, delta: quantity, reason: "PURCHASE", reference: grn.grn_number, unit_cost_kes: item.unit_price_kes, supplier_id: po.supplier_id, purchase_order_id: po.id, goods_received_note_id: grn.id, user_id: session.userId } });
      }
      const inventoryValue = received.reduce((sum, row) => sum + row.quantity * row.item.unit_price_kes, 0);
      await createJournalEntry(tx, {
        sourceType: "stock_receipt",
        memo: `Goods received ${grn.grn_number} for PO ${po.po_number}`,
        createdById: session.userId,
        goodsReceivedNoteId: grn.id,
        entryDate: grn.delivery_date,
        lines: [
          { code: JOURNAL_ACCOUNTS.inventory, direction: "debit", amount: inventoryValue, memo: "Inventory received" },
          { code: JOURNAL_ACCOUNTS.payables, direction: "credit", amount: inventoryValue, memo: "Goods received supplier liability" }
        ]
      });
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchase_order_id: po.id } });
      const receivedAll = updatedItems.every((item) => item.received_quantity >= item.quantity);
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: receivedAll ? "completed" : "partially_received" } });
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=procurement", "error", formMessage(error, "Goods could not be received."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=procurement", "success", "Goods received and stock updated.");
}

export async function createSupplierInvoiceAction(formData: FormData) {
  const session = await requirePermission("purchases.manage");
  const poId = text(formData.get("purchase_order_id"));
  if (!poId) messageRedirect("/admin/business?tab=procurement", "error", "Select a purchase order.");
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true, supplier: true } });
    if (!po) throw new Error("Purchase order not found.");
    const number = await nextErpNumber("SIN");
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.create({
        data: {
          supplier_invoice_number: number,
          supplier_reference: text(formData.get("supplier_reference")),
          supplier_id: po.supplier_id,
          purchase_order_id: po.id,
          subtotal_kes: po.subtotal_kes,
          vat_kes: po.vat_kes,
          total_kes: po.total_kes,
          balance_kes: po.total_kes,
          invoice_date: dateValue(formData.get("invoice_date")) ?? new Date(),
          due_date: dateValue(formData.get("due_date")),
          notes: text(formData.get("notes")),
          created_by_id: session.userId,
          items: { create: po.items.map((item) => ({ purchase_order_item_id: item.id, product_id: item.product_id, description: item.description, quantity: item.quantity, unit_price_kes: item.unit_price_kes, vat_kes: item.vat_kes, line_total_kes: item.line_total_kes })) }
        }
      });
      await tx.transaction.create({ data: { transaction_type: "expense_recorded", direction: "credit", amount_kes: invoice.total_kes, supplier_invoice_id: invoice.id, memo: "Supplier invoice recorded", created_by_id: session.userId } });
      const hasGrnAccounting = await tx.journalEntry.count({ where: { source_type: "stock_receipt", goods_received_note: { is: { purchase_order_id: po.id } } } });
      const lines = hasGrnAccounting > 0
        ? invoice.vat_kes > 0
          ? [
            { code: JOURNAL_ACCOUNTS.taxesPayable, direction: "debit" as const, amount: invoice.vat_kes, memo: "Input VAT preparation" },
            { code: JOURNAL_ACCOUNTS.payables, direction: "credit" as const, amount: invoice.vat_kes, memo: "Supplier VAT payable" }
          ]
          : []
        : [
          { code: JOURNAL_ACCOUNTS.inventory, direction: "debit" as const, amount: invoice.subtotal_kes, memo: "Inventory purchased" },
          ...(invoice.vat_kes > 0 ? [{ code: JOURNAL_ACCOUNTS.taxesPayable, direction: "debit" as const, amount: invoice.vat_kes, memo: "Input VAT preparation" }] : []),
          { code: JOURNAL_ACCOUNTS.payables, direction: "credit" as const, amount: invoice.total_kes, memo: "Supplier payable" }
        ];
      if (lines.length) {
        await createJournalEntry(tx, {
          sourceType: "supplier_invoice",
          memo: `Supplier invoice ${invoice.supplier_invoice_number}`,
          createdById: session.userId,
          supplierInvoiceId: invoice.id,
          entryDate: invoice.invoice_date,
          lines
        });
      }
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=procurement", "error", formMessage(error, "Supplier invoice could not be created."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=procurement", "success", "Supplier invoice recorded.");
}

export async function recordSupplierPaymentAction(formData: FormData) {
  const session = await requirePermission("supplier_payments.manage");
  const invoiceId = text(formData.get("supplier_invoice_id"));
  if (!invoiceId) messageRedirect("/admin/business?tab=procurement", "error", "Select a supplier invoice.");
  const amount = intValue(formData.get("amount_kes"));
  if (amount <= 0) messageRedirect("/admin/business?tab=procurement", "error", "Payment amount must be above zero.");
  try {
    const invoice = await prisma.supplierInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Supplier invoice not found.");
    if (amount > invoice.balance_kes) throw new Error("Supplier payment cannot exceed invoice balance.");
    const number = await nextErpNumber("SPAY");
    await prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({ data: { supplier_payment_number: number, supplier_id: invoice.supplier_id, supplier_invoice_id: invoice.id, amount_kes: amount, method: String(formData.get("method") ?? "bank_transfer") as BusinessPaymentMethod, reference: text(formData.get("reference")), notes: text(formData.get("notes")), created_by_id: session.userId } });
      const paid = invoice.paid_kes + amount;
      const balance = Math.max(0, invoice.total_kes - paid);
      await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { paid_kes: paid, balance_kes: balance, status: (balance === 0 ? "paid" : "partially_paid") as SupplierInvoiceStatus } });
      await tx.transaction.create({ data: { transaction_type: "payment_received", direction: "debit", amount_kes: amount, supplier_invoice_id: invoice.id, supplier_payment_id: payment.id, memo: "Supplier payment", created_by_id: session.userId } });
      await createJournalEntry(tx, {
        sourceType: "supplier_payment",
        memo: `Supplier payment ${payment.supplier_payment_number}`,
        createdById: session.userId,
        supplierInvoiceId: invoice.id,
        supplierPaymentId: payment.id,
        lines: [
          { code: JOURNAL_ACCOUNTS.payables, direction: "debit", amount, memo: "Supplier payable reduced" },
          { code: payment.method === "cash" ? JOURNAL_ACCOUNTS.cash : JOURNAL_ACCOUNTS.bank, direction: "credit", amount, memo: "Cash or bank paid" }
        ]
      });
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=procurement", "error", formMessage(error, "Supplier payment could not be recorded."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=procurement", "success", "Supplier payment recorded.");
}

export async function createSalesCreditNoteAction(formData: FormData) {
  const session = await requirePermission("credit_debit_notes.create");
  const customerId = text(formData.get("customer_id"));
  const amount = intValue(formData.get("amount_kes"));
  const reason = text(formData.get("reason"));
  if (!customerId) messageRedirect("/admin/business?tab=credit-notes", "error", "Select a customer.");
  if (amount <= 0) messageRedirect("/admin/business?tab=credit-notes", "error", "Credit note amount must be above zero.");
  if (!reason) messageRedirect("/admin/business?tab=credit-notes", "error", "Credit note reason is required.");
  try {
    const invoiceId = text(formData.get("invoice_id"));
    const paymentId = text(formData.get("payment_id"));
    const [invoice, payment] = await Promise.all([
      invoiceId ? prisma.invoice.findUnique({ where: { id: invoiceId }, include: { credit_notes: true } }) : null,
      paymentId ? prisma.payment.findUnique({ where: { id: paymentId }, include: { credit_notes: true } }) : null
    ]);
    if (invoice && invoice.customer_id !== customerId) throw new Error("Selected invoice belongs to a different customer.");
    if (payment && payment.customer_id !== customerId) throw new Error("Selected payment belongs to a different customer.");
    const invoiceCredit = invoice?.credit_notes.reduce((sum, note) => sum + note.amount_kes, 0) ?? 0;
    const paymentCredit = payment?.credit_notes.reduce((sum, note) => sum + note.amount_kes, 0) ?? 0;
    const eligible = invoice ? invoice.total_kes - invoiceCredit : payment ? payment.amount_kes - paymentCredit : amount;
    if (amount > eligible) throw new Error(`Credit note cannot exceed eligible amount of ${formatKes(Math.max(0, eligible))}.`);
    const number = `SCN-${new Date().getFullYear()}-${Date.now()}`;
    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.salesCreditNote.create({
        data: {
          credit_note_number: number,
          customer_id: customerId,
          invoice_id: invoiceId,
          payment_id: paymentId,
          amount_kes: amount,
          reason,
          reference: text(formData.get("reference")),
          status: String(formData.get("status") ?? "draft"),
          issued_at: formData.get("status") === "issued" ? new Date() : null,
          created_by_id: session.userId
        }
      });
      if (created.status === "issued" && invoiceId) {
        await tx.transaction.create({ data: { transaction_type: "customer_balance_decrease", direction: "credit", amount_kes: amount, customer_id: customerId, invoice_id: invoiceId, memo: `Credit note ${created.credit_note_number}`, created_by_id: session.userId } });
      }
      return created;
    });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "sales_credit_note", entity_id: note.id, action: "create", after: note as unknown as Prisma.InputJsonValue } });
  } catch (error) {
    messageRedirect("/admin/business?tab=credit-notes", "error", formMessage(error, "Credit note could not be created."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=credit-notes", "success", "Credit note created.");
}

export async function createPurchaseDebitNoteAction(formData: FormData) {
  const session = await requirePermission("credit_debit_notes.create");
  const supplierId = text(formData.get("supplier_id"));
  const amount = intValue(formData.get("amount_kes"));
  const reason = text(formData.get("reason"));
  if (!supplierId) messageRedirect("/admin/business?tab=debit-notes", "error", "Select a supplier.");
  if (amount <= 0) messageRedirect("/admin/business?tab=debit-notes", "error", "Debit note amount must be above zero.");
  if (!reason) messageRedirect("/admin/business?tab=debit-notes", "error", "Debit note reason is required.");
  try {
    const number = `PDN-${new Date().getFullYear()}-${Date.now()}`;
    const note = await prisma.purchaseDebitNote.create({
      data: {
        debit_note_number: number,
        supplier_id: supplierId,
        supplier_invoice_id: text(formData.get("supplier_invoice_id")),
        purchase_order_id: text(formData.get("purchase_order_id")),
        amount_kes: amount,
        reason,
        reference: text(formData.get("reference")),
        status: String(formData.get("status") ?? "draft"),
        issued_at: formData.get("status") === "issued" ? new Date() : null,
        created_by_id: session.userId
      }
    });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "purchase_debit_note", entity_id: note.id, action: "create", after: note as unknown as Prisma.InputJsonValue } });
  } catch (error) {
    messageRedirect("/admin/business?tab=debit-notes", "error", formMessage(error, "Debit note could not be created."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=debit-notes", "success", "Debit note created.");
}

export async function createRecurringInvoiceScheduleAction(formData: FormData) {
  const session = await requirePermission("invoices.create");
  const customerId = text(formData.get("customer_id"));
  const name = text(formData.get("name"));
  const amount = intValue(formData.get("amount_kes"));
  const nextRun = dateValue(formData.get("next_run_at"));
  if (!customerId || !name || !nextRun || amount <= 0) messageRedirect("/admin/business?tab=recurring-invoices", "error", "Customer, name, next run date and amount are required.");
  try {
    const schedule = await prisma.recurringInvoiceSchedule.create({
      data: {
        customer_id: customerId,
        name,
        frequency: text(formData.get("frequency")) ?? "monthly",
        next_run_at: nextRun,
        amount_kes: amount,
        status: text(formData.get("status")) ?? "active",
        notes: text(formData.get("notes")),
        created_by_id: session.userId
      }
    });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "recurring_invoice_schedule", entity_id: schedule.id, action: "create", after: schedule as unknown as Prisma.InputJsonValue } });
  } catch (error) {
    messageRedirect("/admin/business?tab=recurring-invoices", "error", formMessage(error, "Recurring invoice could not be scheduled."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=recurring-invoices", "success", "Recurring invoice scheduled.");
}

export async function createRecurringExpenseScheduleAction(formData: FormData) {
  const session = await requirePermission("expenses.recurring.manage");
  const name = text(formData.get("name"));
  const amount = intValue(formData.get("amount_kes"));
  const nextRun = dateValue(formData.get("next_run_at"));
  if (!name || !nextRun || amount <= 0) messageRedirect("/admin/business?tab=recurring-expenses", "error", "Name, next run date and amount are required.");
  try {
    const categoryName = text(formData.get("category_name"));
    const category = categoryName ? await prisma.expenseCategory.upsert({
      where: { name: categoryName },
      update: { is_active: true },
      create: { name: categoryName }
    }) : null;
    const schedule = await prisma.recurringExpenseSchedule.create({
      data: {
        category_id: category?.id,
        name,
        supplier: text(formData.get("supplier")),
        frequency: text(formData.get("frequency")) ?? "monthly",
        next_run_at: nextRun,
        amount_kes: amount,
        method: String(formData.get("method") ?? "cash") as BusinessPaymentMethod,
        status: text(formData.get("status")) ?? "active",
        notes: text(formData.get("notes")),
        created_by_id: session.userId
      }
    });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "recurring_expense_schedule", entity_id: schedule.id, action: "create", after: schedule as unknown as Prisma.InputJsonValue } });
  } catch (error) {
    messageRedirect("/admin/business?tab=recurring-expenses", "error", formMessage(error, "Recurring expense could not be scheduled."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=recurring-expenses", "success", "Recurring expense scheduled.");
}

export async function createComplianceItemAction(formData: FormData) {
  await requirePermission("compliance.manage");
  try {
    await prisma.complianceItem.create({ data: { title: text(formData.get("title")) ?? "Compliance item", agency: text(formData.get("agency")) ?? "KRA", compliance_type: String(formData.get("compliance_type") ?? "other") as Prisma.ComplianceItemCreateInput["compliance_type"], due_date: dateValue(formData.get("due_date")) ?? new Date(), amount_kes: intValue(formData.get("amount_kes")), reference: text(formData.get("reference")), notes: text(formData.get("notes")) } });
  } catch (error) {
    messageRedirect("/admin/business?tab=compliance", "error", formMessage(error, "Compliance item could not be saved."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=compliance", "success", "Compliance item saved.");
}

export async function createEmployeeAction(formData: FormData) {
  await requirePermission("accounting.post");
  try {
    await prisma.employee.create({ data: { full_name: text(formData.get("full_name")) ?? "Employee", kra_pin: text(formData.get("kra_pin")), national_id: text(formData.get("national_id")), nssf_number: text(formData.get("nssf_number")), sha_number: text(formData.get("sha_number")), email: text(formData.get("email")), phone: text(formData.get("phone")), base_salary_kes: intValue(formData.get("base_salary_kes")) } });
  } catch (error) {
    messageRedirect("/admin/business?tab=compliance", "error", formMessage(error, "Employee could not be saved."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=compliance", "success", "Employee payroll record saved.");
}

export async function prepareEtimsRecordAction(formData: FormData) {
  await requirePermission("fiscalization.prepare");
  const invoiceId = text(formData.get("invoice_id"));
  if (!invoiceId) messageRedirect("/admin/business?tab=etims", "error", "Select an invoice.");
  try {
    await createEtimsSubmission(invoiceId);
  } catch (error) {
    messageRedirect("/admin/business?tab=etims", "error", formMessage(error, "eTIMS record could not be prepared."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=etims", "success", "Invoice marked pending for future eTIMS integration.");
}

export async function submitEtimsRecordAction(formData: FormData) {
  await requirePermission("fiscalization.submit");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=etims", "error", "eTIMS record id is required.");
  try {
    await submitEtimsRecord(id);
  } catch (error) {
    messageRedirect("/admin/business?tab=etims", "error", formMessage(error, "eTIMS submission could not be processed."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=etims", "success", "eTIMS response processed.");
}

export async function retryEtimsSubmissionAction(formData: FormData) {
  await requirePermission("fiscalization.retry");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=etims", "error", "eTIMS record id is required.");
  try {
    await retryEtimsSubmission(id);
  } catch (error) {
    messageRedirect("/admin/business?tab=etims", "error", formMessage(error, "eTIMS retry could not be processed."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=etims", "success", "eTIMS retry processed.");
}

export async function initiateInvoiceMpesaAction(formData: FormData) {
  await requirePermission("payments.record");
  const invoiceId = text(formData.get("invoice_id"));
  const phoneNumber = text(formData.get("phone_number"));
  if (!invoiceId || !phoneNumber) messageRedirect("/admin/business?tab=payments", "error", "Select an invoice and enter a phone number.");
  try {
    await initiateInvoiceMpesa({ invoiceId, phoneNumber, amountKes: intValue(formData.get("amount_kes")) || undefined });
  } catch (error) {
    messageRedirect("/admin/business?tab=payments", "error", formMessage(error, "M-Pesa request could not be started."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=payments", "success", "M-Pesa STK request created. Await verified callback before receipting.");
}

export async function updateBusinessSettingsAction(formData: FormData) {
  await requirePermission("settings.business.manage");
  const settings = [
    ["kra_pin", "KRA PIN"],
    ["vat_registration_number", "VAT registration number"],
    ["branch_details", "Branch details"],
    ["business_legal_information", "Business legal information"]
  ] as const;
  try {
    await prisma.$transaction(settings.map(([code, labelText]) => prisma.businessSetting.upsert({
      where: { code },
      update: { value: text(formData.get(code)) },
      create: { code, label: labelText, value: text(formData.get(code)) }
    })));
  } catch (error) {
    messageRedirect("/admin/business?tab=etims", "error", formMessage(error, "Business settings could not be saved."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=etims", "success", "Business compliance settings saved.");
}

export async function createTenderAction(formData: FormData) {
  const session = await requirePermission("purchases.manage");
  try {
    const tenderNumber = text(formData.get("tender_number")) ?? await nextErpNumber("TND");
    await prisma.tender.create({
      data: {
        tender_title: text(formData.get("tender_title")) ?? "Tender",
        organization: text(formData.get("organization")) ?? "Organization",
        tender_number: tenderNumber,
        closing_date: dateValue(formData.get("closing_date")),
        tender_value_kes: intValue(formData.get("tender_value_kes")),
        status: String(formData.get("status") ?? "new") as TenderStatus,
        technical_notes: text(formData.get("technical_notes")),
        pricing_notes: text(formData.get("pricing_notes")),
        submission_notes: text(formData.get("submission_notes")),
        created_by_id: session.userId,
        requirements: { create: ["Certificate of Incorporation", "KRA PIN", "Tax Compliance Certificate", "CR12", "Company Profile", "Manufacturer Authorization", "Previous contracts"].map((requirement) => ({ requirement, category: "Company documents" })) }
      }
    });
  } catch (error) {
    messageRedirect("/admin/business?tab=tenders", "error", formMessage(error, "Tender could not be saved."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=tenders", "success", "Tender workspace created.");
}

export async function updateTenderStatusAction(formData: FormData) {
  await requirePermission("purchases.manage");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=tenders", "error", "Tender id is required.");
  try {
    await prisma.tender.update({ where: { id }, data: { status: String(formData.get("status") ?? "new") as TenderStatus } });
  } catch (error) {
    messageRedirect("/admin/business?tab=tenders", "error", formMessage(error, "Tender status could not be updated."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=tenders", "success", "Tender status updated.");
}

export async function updateTenderRequirementAction(formData: FormData) {
  await requirePermission("purchases.manage");
  const id = text(formData.get("id"));
  if (!id) messageRedirect("/admin/business?tab=tenders", "error", "Requirement id is required.");
  await prisma.tenderRequirement.update({ where: { id }, data: { is_complete: formData.get("is_complete") === "on", notes: text(formData.get("notes")) } });
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=tenders", "success", "Tender checklist updated.");
}

export async function uploadCompanyDocumentAction(formData: FormData) {
  const session = await requirePermission("settings.business.manage");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) messageRedirect("/admin/business?tab=vault", "error", "Select a file to upload.");
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("Document must be 10 MB or smaller.");
    const title = text(formData.get("title")) ?? file.name;
    const category = String(formData.get("category") ?? "company") as DocumentCategory;
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    const storagePath = `vault/${category}/${Date.now()}-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${extension}`;
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(BUSINESS_DOCUMENT_BUCKET).upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "application/octet-stream", upsert: true });
    if (error) throw new Error(`Document upload failed: ${error.message}`);
    const companyDocument = await prisma.companyDocument.create({ data: { title, category, bucket: BUSINESS_DOCUMENT_BUCKET, storage_path: storagePath, public_url: null, expiry_date: dateValue(formData.get("expiry_date")), reminder_date: dateValue(formData.get("reminder_date")), notes: text(formData.get("notes")), created_by_id: session.userId } });
    await prisma.document.create({ data: documentCreateData({ document_type: "company_document", document_number: await createBusinessNumber(prisma, "DOC"), title, storage_path: storagePath, public_url: null, company_document_id: companyDocument.id, category, expiry_date: companyDocument.expiry_date, reminder_date: companyDocument.reminder_date, notes: companyDocument.notes, created_by_id: session.userId }) });
  } catch (error) {
    messageRedirect("/admin/business?tab=vault", "error", formMessage(error, "Document could not be uploaded."));
  }
  revalidatePath("/admin/business");
  messageRedirect("/admin/business?tab=vault", "success", "Document uploaded to vault.");
}
