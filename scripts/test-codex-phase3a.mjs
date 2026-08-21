import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
}
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const connectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim();
if (!connectionString) throw new Error("DATABASE_URL or POSTGRES_URL_NON_POOLING is required.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    max: Number.parseInt(process.env.PRISMA_POOL_MAX ?? "5", 10),
    connectionTimeoutMillis: Number.parseInt(process.env.PRISMA_CONNECTION_TIMEOUT_MS ?? "60000", 10),
    ssl: connectionString.includes("sslmode=") ? { rejectUnauthorized: false } : undefined
  })
});
const tag = "TEST-CODEX-PHASE3A";

async function main() {
  const runStartedAt = new Date();
  await cleanup();
  const customer = await prisma.customer.create({
    data: { name: `${tag} Customer`, company_name: `${tag} Company`, customer_type: "business", phone: "254700000000", email: "test-codex-phase3a@example.invalid", tax_pin: "P000000000X" }
  });
  const quote = await prisma.quote.create({
    data: {
      quote_number: `${tag}-QTN`,
      customer_id: customer.id,
      status: "sent",
      subtotal_kes: 1000,
      vat_kes: 160,
      total_kes: 1160,
      vat_enabled: true,
      items: { create: [{ item_type: "service", description: `${tag} Service`, quantity: 1, unit_price_kes: 1000, vat_kes: 160, line_total_kes: 1160 }] }
    }
  });
  const invoice = await prisma.invoice.create({
    data: {
      invoice_number: `${tag}-INV`,
      quote_id: quote.id,
      customer_id: customer.id,
      status: "sent",
      subtotal_kes: 1000,
      vat_kes: 160,
      total_kes: 1160,
      balance_kes: 1160,
      vat_enabled: true,
      items: { create: [{ item_type: "service", description: `${tag} Service`, quantity: 1, unit_price_kes: 1000, vat_kes: 160, line_total_kes: 1160 }] }
    }
  });
  const payment = await prisma.payment.create({
    data: { payment_number: `${tag}-PAY`, invoice_id: invoice.id, customer_id: customer.id, amount_kes: 1160, method: "mpesa", reference: `${tag}-MPESA` }
  });
  const receipt = await prisma.receipt.create({
    data: { receipt_number: `${tag}-RCT`, payment_id: payment.id, invoice_id: invoice.id, customer_id: customer.id, amount_kes: payment.amount_kes }
  });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { paid_kes: 1160, balance_kes: 0, status: "paid" } });
  await prisma.document.createMany({
    data: [
      { document_type: "quotation", title: `${tag} Quote PDF`, bucket: "test-codex", storage_path: `${tag}/quote.pdf`, customer_id: customer.id, quote_id: quote.id },
      { document_type: "invoice", title: `${tag} Invoice PDF`, bucket: "test-codex", storage_path: `${tag}/invoice.pdf`, customer_id: customer.id, invoice_id: invoice.id },
      { document_type: "receipt", title: `${tag} Receipt PDF`, bucket: "test-codex", storage_path: `${tag}/receipt.pdf`, customer_id: customer.id, invoice_id: invoice.id, payment_id: payment.id, receipt_id: receipt.id },
      { document_type: "customer_statement", title: `${tag} Statement PDF`, bucket: "test-codex", storage_path: `${tag}/statement.pdf`, customer_id: customer.id }
    ]
  });
  const etims = await prisma.etimsRecord.create({
    data: {
      invoice_id: invoice.id,
      status: "failed",
      payload: { test: tag },
      response: { result: "mock-failed" },
      last_error: "Mock TEST-CODEX eTIMS failure for retry handling.",
      retry_count: 1,
      logs: { create: [{ status: "pending", message: "Mock pending" }, { status: "failed", message: "Mock failure" }] }
    }
  });
  const mpesa = await prisma.mpesaTransaction.create({
    data: { invoice_id: invoice.id, customer_id: customer.id, payment_id: payment.id, phone_number: "254700000000", amount: 1160, transaction_reference: `${tag}-TX`, checkout_request_id: `${tag}-CHECKOUT`, callback_payload: { test: tag }, payment_status: "completed", verified_at: new Date() }
  });
  await prisma.notificationHistory.createMany({
    data: [
      { notification_type: "quote_created", status: "pending" },
      { notification_type: "invoice_created", status: "pending" },
      { notification_type: "payment_received", status: "pending" },
      { notification_type: "receipt_generated", status: "pending" }
    ]
  });

  const checks = {
    users: 0,
    customer: Boolean(customer.id),
    quote: Boolean(quote.id),
    invoicePaid: (await prisma.invoice.findUnique({ where: { id: invoice.id } }))?.balance_kes === 0,
    receiptLinked: Boolean(receipt.payment_id),
    documents: await prisma.document.count({ where: { title: { startsWith: tag } } }),
    etimsLogs: await prisma.etimsSubmissionLog.count({ where: { etims_record_id: etims.id } }),
    mpesaCompleted: mpesa.payment_status === "completed"
  };
  console.log(JSON.stringify({ created: checks }, null, 2));
  await cleanup(runStartedAt);
  const remaining = await counts();
  console.log(JSON.stringify({ cleanup: remaining }, null, 2));
  if (Object.values(remaining).some((count) => count !== 0)) {
    throw new Error("TEST-CODEX cleanup left records behind.");
  }
}

async function counts() {
  return {
    users: await prisma.profile.count({ where: { full_name: { startsWith: tag } } }),
    customers: await prisma.customer.count({ where: { name: { startsWith: tag } } }),
    invoices: await prisma.invoice.count({ where: { invoice_number: { startsWith: tag } } }),
    payments: await prisma.payment.count({ where: { payment_number: { startsWith: tag } } }),
    documents: await prisma.document.count({ where: { title: { startsWith: tag } } })
  };
}

async function cleanup(notificationCreatedAfter) {
  const customers = await prisma.customer.findMany({ where: { name: { startsWith: tag } }, select: { id: true } });
  const customerIds = customers.map((customer) => customer.id);
  await prisma.document.deleteMany({ where: { OR: [{ title: { startsWith: tag } }, { customer_id: { in: customerIds } }] } });
  await prisma.mpesaTransaction.deleteMany({ where: { customer_id: { in: customerIds } } });
  await prisma.etimsSubmissionLog.deleteMany({ where: { etims_record: { invoice: { customer_id: { in: customerIds } } } } });
  await prisma.etimsRecord.deleteMany({ where: { invoice: { customer_id: { in: customerIds } } } });
  await prisma.receipt.deleteMany({ where: { customer_id: { in: customerIds } } });
  await prisma.payment.deleteMany({ where: { customer_id: { in: customerIds } } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { customer_id: { in: customerIds } } } });
  await prisma.invoice.deleteMany({ where: { customer_id: { in: customerIds } } });
  await prisma.quoteItem.deleteMany({ where: { quote: { customer_id: { in: customerIds } } } });
  await prisma.quote.deleteMany({ where: { customer_id: { in: customerIds } } });
  if (notificationCreatedAfter) {
    await prisma.notificationHistory.deleteMany({ where: { user_id: null, created_at: { gte: notificationCreatedAfter }, notification_type: { in: ["quote_created", "invoice_created", "payment_received", "receipt_generated"] } } });
  }
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  await prisma.profile.deleteMany({ where: { full_name: { startsWith: tag } } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
