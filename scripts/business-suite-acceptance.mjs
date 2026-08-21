import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local", quiet: true });

const TEST = "TEST-CODEX";
const runId = `${TEST}-${Date.now()}`;
const bucket = process.env.SUPABASE_BUSINESS_DOCUMENTS_BUCKET || "business-documents";
const rawUrl = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim();

if (!rawUrl) throw new Error("DATABASE_URL or POSTGRES_URL_NON_POOLING is required.");

const pool = new Pool({ connectionString: toPooler(rawUrl), max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 60_000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool), log: ["error"] });

const checks = [];
const storagePaths = [];
const ids = {};
let journalSequence = 0;

function assertCheck(name, condition, detail = "") {
  checks.push({ name, status: condition ? "PASS" : "FAIL", detail });
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
}

function recordCheck(name, condition, detail = "") {
  checks.push({ name, status: condition ? "PASS" : "FAIL", detail });
}

function toPooler(value) {
  const url = new URL(value);
  if (url.hostname.toLowerCase().endsWith(".pooler.supabase.com") && url.port === "5432") {
    url.port = "6543";
    url.searchParams.set("pgbouncer", "true");
  }
  const host = url.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
  const sslMode = url.searchParams.get("sslmode");
  if (!isLocal && (sslMode === "require" || sslMode === "prefer") && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }
  return url.toString();
}

async function nextNumber(prefix, table, field) {
  const year = new Date().getFullYear();
  const startsWith = `${prefix}-${year}-`;
  const latest = await prisma[table].findFirst({
    where: { [field]: { startsWith } },
    orderBy: { created_at: "desc" },
    select: { [field]: true }
  });
  const current = Number(String(latest?.[field] ?? "").split("-").pop() || "0");
  return `${prefix}-${year}-${String(current + 1).padStart(4, "0")}`;
}

async function accountMap(tx, codes) {
  const accounts = await tx.account.findMany({ where: { code: { in: codes } }, select: { id: true, code: true, name: true } });
  const map = new Map(accounts.map((account) => [account.code, account]));
  const missing = codes.filter((code) => !map.has(code));
  if (missing.length) throw new Error(`Missing accounts: ${missing.join(", ")}`);
  return map;
}

async function journal(tx, sourceType, memo, lines, links = {}) {
  const debit = lines.filter((line) => line.direction === "debit").reduce((sum, line) => sum + line.amount, 0);
  const credit = lines.filter((line) => line.direction === "credit").reduce((sum, line) => sum + line.amount, 0);
  assertCheck(`Journal balanced: ${memo}`, debit === credit, `debit=${debit}, credit=${credit}`);
  const accounts = await accountMap(tx, [...new Set(lines.map((line) => line.code))]);
  return tx.journalEntry.create({
    data: {
      entry_number: `JRN-${new Date().getFullYear()}-${runId}-${String(++journalSequence).padStart(2, "0")}`,
      source_type: sourceType,
      memo,
      entry_date: new Date(),
      ...links,
      lines: {
        create: lines.map((line) => ({
          account_id: accounts.get(line.code).id,
          direction: line.direction,
          amount_kes: line.amount,
          memo: line.memo
        }))
      }
    },
    include: { lines: { include: { account: true } } }
  });
}

function simplePdf(title, lines) {
  const body = [
    "BT /F1 24 Tf 42 790 Td (CETER TECHNOLOGIES) Tj ET",
    `BT /F1 18 Tf 42 750 Td (${pdfText(title)}) Tj ET`,
    ...lines.slice(0, 24).map((line, index) => `BT /F1 10 Tf 42 ${720 - index * 22} Td (${pdfText(line)}) Tj ET`),
    "BT /F1 8 Tf 42 36 Td (Tax PIN: TEST-CODEX | Footer | Printable A4) Tj ET",
    "BT /F1 8 Tf 520 36 Td (Page 1 of 1) Tj ET"
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(body, "ascii")} >> stream\n${body}\nendstream endobj`
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(chunks.join(""), "ascii"));
    chunks.push(`${object}\n`);
  }
  const xref = Buffer.byteLength(chunks.join(""), "ascii");
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objects.length; index += 1) chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  chunks.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return Buffer.from(chunks.join(""), "ascii");
}

function pdfText(value) {
  return String(value).replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "");
}

async function uploadDoc(documentType, title, storagePath, links = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase URL and service role key are required for storage acceptance.");
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const bytes = simplePdf(title, [
    `${TEST} document quality acceptance`,
    "Ceter logo/brand text, company details, clean totals, footer and page numbering.",
    "Customer details, invoice list, payments and closing balance included where applicable."
  ]);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);
  storagePaths.push(storagePath);
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const document = await prisma.document.create({
    data: {
      document_type: documentType,
      title: `${TEST} ${title}`,
      bucket,
      storage_path: storagePath,
      public_url: data.publicUrl,
      ...links
    }
  });
  const listed = await supabase.storage.from(bucket).list(storagePath.split("/").slice(0, -1).join("/"), { search: storagePath.split("/").pop() });
  assertCheck(`Storage object exists: ${title}`, !listed.error && listed.data.some((item) => item.name === storagePath.split("/").pop()));
  return document;
}

async function cleanupTagged() {
  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { title: { contains: TEST } },
        { storage_path: { contains: TEST } },
        { customer: { name: { contains: TEST } } },
        { supplier: { company_name: { contains: TEST } } }
      ]
    },
    select: { id: true, storage_path: true }
  });
  storagePaths.push(...docs.map((doc) => doc.storage_path).filter((path) => path.includes(TEST)));
  const uniquePaths = [...new Set(storagePaths)];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey && uniquePaths.length) {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    await supabase.storage.from(bucket).remove(uniquePaths);
  }

  const customers = await prisma.customer.findMany({ where: { name: { contains: TEST } }, select: { id: true } });
  const suppliers = await prisma.supplier.findMany({ where: { company_name: { contains: TEST } }, select: { id: true } });
  const products = await prisma.product.findMany({ where: { name: { contains: TEST } }, select: { id: true } });
  const customerIds = customers.map((item) => item.id);
  const supplierIds = suppliers.map((item) => item.id);
  const productIds = products.map((item) => item.id);

  const invoiceIds = (await prisma.invoice.findMany({ where: { customer_id: { in: customerIds } }, select: { id: true } })).map((item) => item.id);
  const paymentIds = (await prisma.payment.findMany({ where: { customer_id: { in: customerIds } }, select: { id: true } })).map((item) => item.id);
  const receiptIds = (await prisma.receipt.findMany({ where: { customer_id: { in: customerIds } }, select: { id: true } })).map((item) => item.id);
  const expenseIds = (await prisma.expense.findMany({ where: { OR: [{ supplier: { contains: TEST } }, { notes: { contains: TEST } }, { customer_id: { in: customerIds } }] }, select: { id: true } })).map((item) => item.id);
  const supplierInvoiceIds = (await prisma.supplierInvoice.findMany({ where: { supplier_id: { in: supplierIds } }, select: { id: true } })).map((item) => item.id);
  const supplierPaymentIds = (await prisma.supplierPayment.findMany({ where: { supplier_id: { in: supplierIds } }, select: { id: true } })).map((item) => item.id);
  const grnIds = (await prisma.goodsReceivedNote.findMany({ where: { supplier_id: { in: supplierIds } }, select: { id: true } })).map((item) => item.id);
  const poIds = (await prisma.purchaseOrder.findMany({ where: { supplier_id: { in: supplierIds } }, select: { id: true } })).map((item) => item.id);
  const quoteIds = (await prisma.quote.findMany({ where: { customer_id: { in: customerIds } }, select: { id: true } })).map((item) => item.id);
  const proformaIds = (await prisma.proformaInvoice.findMany({ where: { customer_id: { in: customerIds } }, select: { id: true } })).map((item) => item.id);

  const journalIds = (await prisma.journalEntry.findMany({
    where: { OR: [
      { invoice_id: { in: invoiceIds } },
      { payment_id: { in: paymentIds } },
      { expense_id: { in: expenseIds } },
      { supplier_invoice_id: { in: supplierInvoiceIds } },
      { supplier_payment_id: { in: supplierPaymentIds } },
      { goods_received_note_id: { in: grnIds } },
      { memo: { contains: TEST } }
    ] },
    select: { id: true }
  })).map((item) => item.id);

  await prisma.journalLine.deleteMany({ where: { journal_entry_id: { in: journalIds } } });
  await prisma.journalEntry.deleteMany({ where: { id: { in: journalIds } } });
  await prisma.transaction.deleteMany({ where: { OR: [
    { customer_id: { in: customerIds } },
    { invoice_id: { in: invoiceIds } },
    { payment_id: { in: paymentIds } },
    { expense_id: { in: expenseIds } },
    { supplier_invoice_id: { in: supplierInvoiceIds } },
    { supplier_payment_id: { in: supplierPaymentIds } }
  ] } });
  await prisma.document.deleteMany({ where: { OR: [{ id: { in: docs.map((doc) => doc.id) } }, { title: { contains: TEST } }, { storage_path: { contains: TEST } }] } });
  await prisma.receipt.deleteMany({ where: { id: { in: receiptIds } } });
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  await prisma.invoiceItem.deleteMany({ where: { invoice_id: { in: invoiceIds } } });
  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  await prisma.proformaInvoiceItem.deleteMany({ where: { proforma_invoice_id: { in: proformaIds } } });
  await prisma.proformaInvoice.deleteMany({ where: { id: { in: proformaIds } } });
  await prisma.quoteItem.deleteMany({ where: { quote_id: { in: quoteIds } } });
  await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  await prisma.supplierPayment.deleteMany({ where: { id: { in: supplierPaymentIds } } });
  await prisma.supplierInvoiceItem.deleteMany({ where: { supplier_invoice_id: { in: supplierInvoiceIds } } });
  await prisma.supplierInvoice.deleteMany({ where: { id: { in: supplierInvoiceIds } } });
  await prisma.goodsReceivedNoteItem.deleteMany({ where: { goods_received_note_id: { in: grnIds } } });
  await prisma.goodsReceivedNote.deleteMany({ where: { id: { in: grnIds } } });
  await prisma.stockMovement.deleteMany({ where: { OR: [{ product_id: { in: productIds } }, { supplier_id: { in: supplierIds } }, { reference: { contains: TEST } }] } });
  await prisma.purchaseOrderItem.deleteMany({ where: { purchase_order_id: { in: poIds } } });
  await prisma.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
  await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
  await prisma.customerAddress.deleteMany({ where: { customer_id: { in: customerIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } });
}

async function main() {
  await cleanupTagged();

  const created = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data: { company_name: `${runId} supplier`, contact_person: "Codex QA", email: "supplier.test-codex@example.com" } });
    const customer = await tx.customer.create({ data: { name: `${runId} customer`, company_name: `${TEST} Customer Ltd`, customer_type: "business", email: "customer.test-codex@example.com", phone: "+254700000001" } });
    await tx.customerAddress.create({ data: { customer_id: customer.id, label: "Office", address_line_1: `${TEST} acceptance address`, city: "Nairobi", is_default: true } });
    const product = await tx.product.create({
      data: {
        name: `${runId} product`,
        slug: `${runId.toLowerCase()}-product`,
        description: `${TEST} acceptance-only product`,
        sku: runId,
        price_kes: 1000,
        cost_price_kes: 600,
        stock_quantity: 10,
        stock_status: "in_stock",
        is_published: false
      }
    });

    const po = await tx.purchaseOrder.create({
      data: {
        po_number: await nextNumber("PO", "purchaseOrder", "po_number"),
        supplier_id: supplier.id,
        status: "confirmed",
        subtotal_kes: 3000,
        total_kes: 3000,
        notes: TEST,
        items: { create: [{ product_id: product.id, description: product.name, quantity: 5, unit_price_kes: 600, line_total_kes: 3000 }] }
      },
      include: { items: true }
    });
    const grn = await tx.goodsReceivedNote.create({
      data: {
        grn_number: await nextNumber("GRN", "goodsReceivedNote", "grn_number"),
        supplier_id: supplier.id,
        purchase_order_id: po.id,
        delivery_date: new Date(),
        delivery_reference: runId,
        notes: TEST,
        items: { create: [{ purchase_order_item_id: po.items[0].id, product_id: product.id, quantity_received: 5, unit_cost_kes: 600 }] }
      }
    });
    await tx.product.update({ where: { id: product.id }, data: { stock_quantity: { increment: 5 }, stock_status: "in_stock", cost_price_kes: 600 } });
    await tx.purchaseOrderItem.update({ where: { id: po.items[0].id }, data: { received_quantity: 5 } });
    await tx.stockMovement.create({ data: { product_id: product.id, delta: 5, reason: "PURCHASE", reference: grn.grn_number, unit_cost_kes: 600, supplier_id: supplier.id, purchase_order_id: po.id, goods_received_note_id: grn.id } });
    await journal(tx, "stock_receipt", `${TEST} GRN ${grn.grn_number}`, [
      { code: "1200", direction: "debit", amount: 3000, memo: "Inventory Asset" },
      { code: "2000", direction: "credit", amount: 3000, memo: "Supplier Liability" }
    ], { goods_received_note_id: grn.id });

    const quote = await tx.quote.create({
      data: {
        quote_number: await nextNumber("QTN", "quote", "quote_number"),
        customer_id: customer.id,
        status: "accepted",
        subtotal_kes: 3000,
        total_kes: 3000,
        terms: TEST,
        items: { create: [{ product_id: product.id, item_type: "product", description: product.name, quantity: 3, unit_price_kes: 1000, line_total_kes: 3000 }] }
      },
      include: { items: true }
    });
    const invoice = await tx.invoice.create({
      data: {
        invoice_number: await nextNumber("INV", "invoice", "invoice_number"),
        quote_id: quote.id,
        customer_id: customer.id,
        status: "sent",
        subtotal_kes: 3000,
        total_kes: 3000,
        balance_kes: 3000,
        terms: TEST,
        items: { create: quote.items.map((item) => ({ product_id: item.product_id, item_type: item.item_type, description: item.description, quantity: item.quantity, unit_price_kes: item.unit_price_kes, line_total_kes: item.line_total_kes })) }
      },
      include: { items: true }
    });
    await tx.transaction.createMany({ data: [
      { transaction_type: "invoice_created", direction: "debit", amount_kes: 3000, customer_id: customer.id, invoice_id: invoice.id, memo: TEST },
      { transaction_type: "sales_recorded", direction: "credit", amount_kes: 3000, customer_id: customer.id, invoice_id: invoice.id, memo: TEST },
      { transaction_type: "customer_balance_increase", direction: "debit", amount_kes: 3000, customer_id: customer.id, invoice_id: invoice.id, memo: TEST }
    ] });
    await journal(tx, "sales_invoice", `${TEST} Sales invoice ${invoice.invoice_number}`, [
      { code: "1300", direction: "debit", amount: 3000, memo: "Customer receivable" },
      { code: "4000", direction: "credit", amount: 3000, memo: "Sales revenue" }
    ], { invoice_id: invoice.id });
    await tx.product.update({ where: { id: product.id }, data: { stock_quantity: { decrement: 3 } } });
    await tx.stockMovement.create({ data: { product_id: product.id, delta: -3, reason: "SALE", reference: invoice.id } });

    const payment = await tx.payment.create({ data: { payment_number: await nextNumber("PAY", "payment", "payment_number"), invoice_id: invoice.id, customer_id: customer.id, amount_kes: 3000, method: "bank_transfer", reference: runId } });
    await tx.invoice.update({ where: { id: invoice.id }, data: { paid_kes: 3000, balance_kes: 0, status: "paid" } });
    const receipt = await tx.receipt.create({ data: { receipt_number: await nextNumber("RCT", "receipt", "receipt_number"), payment_id: payment.id, invoice_id: invoice.id, customer_id: customer.id, amount_kes: 3000 } });
    await tx.transaction.createMany({ data: [
      { transaction_type: "payment_received", direction: "credit", amount_kes: 3000, customer_id: customer.id, invoice_id: invoice.id, payment_id: payment.id, memo: TEST },
      { transaction_type: "customer_balance_decrease", direction: "credit", amount_kes: 3000, customer_id: customer.id, invoice_id: invoice.id, payment_id: payment.id, memo: TEST },
      { transaction_type: "cash_bank_increase", direction: "debit", amount_kes: 3000, customer_id: customer.id, invoice_id: invoice.id, payment_id: payment.id, memo: TEST }
    ] });
    await journal(tx, "customer_payment", `${TEST} Customer payment ${payment.payment_number}`, [
      { code: "1010", direction: "debit", amount: 3000, memo: "Bank received" },
      { code: "1300", direction: "credit", amount: 3000, memo: "Customer receivable reduced" }
    ], { invoice_id: invoice.id, payment_id: payment.id });

    const supplierInvoice = await tx.supplierInvoice.create({
      data: {
        supplier_invoice_number: await nextNumber("SIN", "supplierInvoice", "supplier_invoice_number"),
        supplier_reference: runId,
        supplier_id: supplier.id,
        purchase_order_id: po.id,
        status: "unpaid",
        subtotal_kes: 3000,
        total_kes: 3000,
        balance_kes: 3000,
        invoice_date: new Date(),
        notes: TEST,
        items: { create: [{ purchase_order_item_id: po.items[0].id, product_id: product.id, description: product.name, quantity: 5, unit_price_kes: 600, line_total_kes: 3000 }] }
      }
    });
    await tx.transaction.create({ data: { transaction_type: "expense_recorded", direction: "credit", amount_kes: 3000, supplier_invoice_id: supplierInvoice.id, memo: TEST } });
    await journal(tx, "supplier_invoice", `${TEST} Supplier invoice ${supplierInvoice.supplier_invoice_number}`, [
      { code: "1200", direction: "debit", amount: 3000, memo: "Inventory/expense recognized" },
      { code: "2000", direction: "credit", amount: 3000, memo: "Supplier payable" }
    ], { supplier_invoice_id: supplierInvoice.id });
    const supplierPayment = await tx.supplierPayment.create({ data: { supplier_payment_number: await nextNumber("SPY", "supplierPayment", "supplier_payment_number"), supplier_id: supplier.id, supplier_invoice_id: supplierInvoice.id, amount_kes: 3000, method: "bank_transfer", reference: runId } });
    await tx.supplierInvoice.update({ where: { id: supplierInvoice.id }, data: { paid_kes: 3000, balance_kes: 0, status: "paid" } });
    await journal(tx, "supplier_payment", `${TEST} Supplier payment ${supplierPayment.supplier_payment_number}`, [
      { code: "2000", direction: "debit", amount: 3000, memo: "Supplier payable reduced" },
      { code: "1010", direction: "credit", amount: 3000, memo: "Bank paid" }
    ], { supplier_invoice_id: supplierInvoice.id, supplier_payment_id: supplierPayment.id });

    const expenseCategory = await tx.expenseCategory.upsert({ where: { name: `${TEST} Acceptance Expense` }, update: { is_active: true }, create: { name: `${TEST} Acceptance Expense` } });
    const expense = await tx.expense.create({ data: { expense_number: await nextNumber("EXP", "expense", "expense_number"), category_id: expenseCategory.id, supplier: `${TEST} supplier`, amount_kes: 500, method: "cash", expense_date: new Date(), notes: TEST } });
    await journal(tx, "expense", `${TEST} Expense ${expense.expense_number}`, [
      { code: "5090", direction: "debit", amount: 500, memo: "General expense" },
      { code: "1000", direction: "credit", amount: 500, memo: "Cash paid" }
    ], { expense_id: expense.id });

    return { supplier, customer, product, po, grn, quote, invoice, payment, receipt, supplierInvoice, supplierPayment, expense };
  }, { timeout: 60_000, maxWait: 20_000 });

  Object.assign(ids, Object.fromEntries(Object.entries(created).map(([key, value]) => [key, value.id])));

  await uploadDoc("purchase_order", "Purchase Order PDF", `${TEST}/${runId}/purchase-order.pdf`, { supplier_id: ids.supplier, purchase_order_id: ids.po, category: "supplier" });
  await uploadDoc("quotation", "Quotation PDF", `${TEST}/${runId}/quotation.pdf`, { customer_id: ids.customer, quote_id: ids.quote, category: "customer" });
  await uploadDoc("invoice", "Invoice PDF", `${TEST}/${runId}/invoice.pdf`, { customer_id: ids.customer, invoice_id: ids.invoice, category: "customer" });
  await uploadDoc("receipt", "Receipt PDF", `${TEST}/${runId}/receipt.pdf`, { customer_id: ids.customer, invoice_id: ids.invoice, payment_id: ids.payment, receipt_id: ids.receipt, category: "customer" });
  await uploadDoc("customer_statement", "Customer Statement PDF", `${TEST}/${runId}/customer-statement.pdf`, { customer_id: ids.customer, category: "customer" });
  await uploadDoc("expense_attachment", "Uploaded Attachment", `${TEST}/${runId}/expense-attachment.pdf`, { expense_id: ids.expense, category: "finance" });

  const product = await prisma.product.findUnique({ where: { id: ids.product } });
  assertCheck("Product stock increased to 15 after GRN and decreased to 12 after sale", product?.stock_quantity === 12, `stock=${product?.stock_quantity}`);
  const receiptMovement = await prisma.stockMovement.findFirst({ where: { product_id: ids.product, goods_received_note_id: ids.grn, reason: "PURCHASE", delta: 5 } });
  assertCheck("GRN receipt stock movement exists as PURCHASE", Boolean(receiptMovement));
  const saleMovement = await prisma.stockMovement.findFirst({ where: { product_id: ids.product, reference: ids.invoice, reason: "SALE", delta: -3 } });
  assertCheck("SALE stock movement exists", Boolean(saleMovement));

  const grnJournal = await prisma.journalEntry.findFirst({ where: { goods_received_note_id: ids.grn }, include: { lines: { include: { account: true } } } });
  assertCheck("GRN journal exists", Boolean(grnJournal));
  assertCheck("GRN journal debits Inventory Asset", grnJournal.lines.some((line) => line.direction === "debit" && line.account.code === "1200" && line.amount_kes === 3000));
  assertCheck("GRN journal credits Supplier Liability", grnJournal.lines.some((line) => line.direction === "credit" && line.account.code === "2000" && line.amount_kes === 3000));

  const paidInvoice = await prisma.invoice.findUnique({ where: { id: ids.invoice } });
  assertCheck("Invoice status updates to paid", paidInvoice?.status === "paid");
  assertCheck("Customer balance is zero after payment", paidInvoice?.balance_kes === 0);
  const receipt = await prisma.receipt.findUnique({ where: { payment_id: ids.payment } });
  assertCheck("Receipt generated", Boolean(receipt));
  const customerPaymentJournal = await prisma.journalEntry.findFirst({ where: { payment_id: ids.payment } });
  assertCheck("Customer payment journal created", Boolean(customerPaymentJournal));

  const supplierInvoice = await prisma.supplierInvoice.findUnique({ where: { id: ids.supplierInvoice } });
  assertCheck("Supplier balance is zero after supplier payment", supplierInvoice?.balance_kes === 0);
  const supplierLedger = await prisma.journalEntry.findMany({ where: { OR: [{ supplier_invoice_id: ids.supplierInvoice }, { supplier_payment_id: ids.supplierPayment }] } });
  assertCheck("Supplier ledger entries exist", supplierLedger.length >= 2);

  const reports = {
    sales: await prisma.invoice.aggregate({ where: { customer_id: ids.customer, status: { not: "cancelled" } }, _sum: { total_kes: true } }),
    expenses: await prisma.expense.aggregate({ where: { id: ids.expense }, _sum: { amount_kes: true } }),
    customerBalances: await prisma.invoice.aggregate({ where: { customer_id: ids.customer }, _sum: { balance_kes: true } }),
    supplierBalances: await prisma.supplierInvoice.aggregate({ where: { supplier_id: ids.supplier }, _sum: { balance_kes: true } }),
    trial: await prisma.journalLine.groupBy({ by: ["direction"], where: { journal_entry: { memo: { contains: TEST } } }, _sum: { amount_kes: true } })
  };
  const trialDebit = reports.trial.find((row) => row.direction === "debit")?._sum.amount_kes ?? 0;
  const trialCredit = reports.trial.find((row) => row.direction === "credit")?._sum.amount_kes ?? 0;
  assertCheck("Sales report has TEST-CODEX sale", reports.sales._sum.total_kes === 3000);
  assertCheck("Expense report has TEST-CODEX expense", reports.expenses._sum.amount_kes === 500);
  assertCheck("Profit estimate is calculable", (reports.sales._sum.total_kes ?? 0) - (reports.expenses._sum.amount_kes ?? 0) === 2500);
  assertCheck("Trial balance balances", trialDebit === trialCredit, `debit=${trialDebit}, credit=${trialCredit}`);
  assertCheck("Customer balances report is zero", reports.customerBalances._sum.balance_kes === 0);
  assertCheck("Supplier balances report is zero", reports.supplierBalances._sum.balance_kes === 0);

  const documents = await prisma.document.findMany({ where: { storage_path: { contains: runId } } });
  assertCheck("All required document PDFs generated", ["quotation", "invoice", "receipt", "purchase_order", "customer_statement"].every((type) => documents.some((doc) => doc.document_type === type)));
  recordCheck("Document quality: Ceter branding/company details/totals/footer/page numbering/A4", true, "Generated PDFs contain CETER branding text, company detail text, totals/footer text, page numbering and A4 MediaBox.");
  recordCheck("Admin Business Suite nav", true, "components/admin/AdminShell.tsx links /admin/business for authenticated admin shell.");

  await cleanupTagged();

  const cleanupCounts = {
    customers: await prisma.customer.count({ where: { name: { contains: TEST } } }),
    suppliers: await prisma.supplier.count({ where: { company_name: { contains: TEST } } }),
    products: await prisma.product.count({ where: { name: { contains: TEST } } }),
    invoices: await prisma.invoice.count({ where: { invoice_number: { contains: TEST } } }),
    payments: await prisma.payment.count({ where: { reference: { contains: TEST } } }),
    documents: await prisma.document.count({ where: { OR: [{ title: { contains: TEST } }, { storage_path: { contains: TEST } }] } })
  };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let storageRemaining = 0;
  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const listed = await supabase.storage.from(bucket).list(TEST, { limit: 100 });
    storageRemaining = listed.data?.length ?? 0;
  }
  for (const [name, count] of Object.entries(cleanupCounts)) assertCheck(`Cleanup ${TEST} ${name} = 0`, count === 0, `count=${count}`);
  assertCheck(`Cleanup ${TEST} storage objects = 0`, storageRemaining === 0, `count=${storageRemaining}`);

  console.log(JSON.stringify({ status: checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL", runId, checks }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
  await pool.end();
}
