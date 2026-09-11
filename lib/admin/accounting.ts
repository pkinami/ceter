import { Prisma, type AccountType, type BusinessPaymentMethod, type JournalSourceType, type TransactionDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/admin/auth";
import { createBusinessNumber } from "@/lib/business/numbering";

type JournalLineInput = {
  accountId: string;
  direction: TransactionDirection;
  amount: string | number | Prisma.Decimal;
  memo?: string | null;
};

type PostingLogic = {
  accountId?: string;
  account_id?: string;
  amount?: "amount" | "tax" | "cost" | "net";
  amount_basis?: "amount" | "tax" | "cost" | "net";
  memo?: string;
};

const money = (value: unknown) => {
  const decimal = new Prisma.Decimal(String(value ?? "0"));
  if (decimal.isNegative()) throw new Error("Amounts must not be negative.");
  return decimal.toDecimalPlaces(2);
};

const sum = (values: Prisma.Decimal[]) => values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

const dateValue = (value: FormDataEntryValue | null) => {
  const raw = text(value);
  return raw ? new Date(`${raw}T00:00:00.000Z`) : new Date();
};

async function nextNumber(prefix: string) {
  return createBusinessNumber(prefix);
}

async function openPeriod(tx: Prisma.TransactionClient, accountingDate: Date) {
  const period = await tx.accountingPeriod.findFirst({
    where: { start_date: { lte: accountingDate }, end_date: { gte: accountingDate } },
    orderBy: { start_date: "desc" }
  });
  if (!period) throw new Error("No open accounting period exists for the selected accounting date.");
  if (period.status === "locked" || period.locked_at) throw new Error("The selected accounting period is locked.");
  return period;
}

async function assertPostableAccounts(tx: Prisma.TransactionClient, lines: JournalLineInput[]) {
  const ids = [...new Set(lines.map((line) => line.accountId))];
  const accounts = await tx.account.findMany({ where: { id: { in: ids } }, select: { id: true, is_active: true, is_posting_account: true, archived_at: true } });
  const map = new Map(accounts.map((account) => [account.id, account]));
  for (const id of ids) {
    const account = map.get(id);
    if (!account) throw new Error("Journal line references an unknown account.");
    if (!account.is_active || account.archived_at) throw new Error("Archived or inactive accounts cannot receive postings.");
    if (!account.is_posting_account) throw new Error("Header accounts cannot receive postings.");
  }
}

function sourceType(value: string): JournalSourceType {
  const allowed: JournalSourceType[] = ["sales_invoice", "customer_payment", "expense", "supplier_invoice", "supplier_payment", "stock_receipt", "manual"];
  if (allowed.includes(value as JournalSourceType)) return value as JournalSourceType;
  return "manual";
}

function readLogic(value: Prisma.JsonValue, direction: TransactionDirection): JournalLineInput[] {
  const entries = (Array.isArray(value) ? value : [value]) as PostingLogic[];
  return entries.map((entry) => {
    const accountId = entry.accountId ?? entry.account_id;
    if (!accountId) throw new Error(`Active posting rule ${direction} logic must specify an account.`);
    return {
      accountId,
      direction,
      amount: entry.amount ?? entry.amount_basis ?? "amount",
      memo: entry.memo ?? null
    };
  });
}

function sourceAmount(event: { amount: Prisma.Decimal; tax_amount: Prisma.Decimal; cost_amount: Prisma.Decimal | null }, basis: unknown) {
  if (basis === "tax") return event.tax_amount;
  if (basis === "cost") {
    if (!event.cost_amount) throw new Error("Posting rule requires a cost amount, but the source event has no cost snapshot.");
    return event.cost_amount;
  }
  if (basis === "net") return event.amount.minus(event.tax_amount);
  return event.amount;
}

export async function createAccount(session: AdminSession, formData: FormData) {
  const code = text(formData.get("code"));
  const name = text(formData.get("name"));
  const type = text(formData.get("type")) as AccountType;
  if (!code || !name || !type) throw new Error("Account code, name and class are required.");
  return prisma.$transaction(async (tx) => {
    const parent = text(formData.get("parent_account_id")) || null;
    if (parent) {
      const parentAccount = await tx.account.findUnique({ where: { id: parent }, select: { parent_account_id: true } });
      if (!parentAccount) throw new Error("Parent account was not found.");
      if (parentAccount.parent_account_id === parent) throw new Error("Account hierarchy cycle rejected.");
    }
    const account = await tx.account.create({
      data: {
        code,
        name,
        type,
        subtype: text(formData.get("subtype")) || null,
        parent_account_id: parent,
        normal_balance: (text(formData.get("normal_balance")) || "debit") as TransactionDirection,
        is_posting_account: text(formData.get("is_posting_account")) !== "false",
        currency: text(formData.get("currency")) || "KES",
        finance_review_status: "draft_requires_review",
        description: text(formData.get("description")) || null
      }
    });
    await audit(tx, session, "accounting.account.create", "account", account.id, null, { code, name, type });
    return account;
  });
}

export async function createAccountingPeriod(session: AdminSession, formData: FormData) {
  const fiscalYear = text(formData.get("fiscal_year"));
  const periodName = text(formData.get("period_name"));
  const startDate = dateValue(formData.get("start_date"));
  const endDate = dateValue(formData.get("end_date"));
  if (!fiscalYear || !periodName || endDate < startDate) throw new Error("Valid fiscal year and period dates are required.");
  return prisma.$transaction(async (tx) => {
    const overlap = await tx.accountingPeriod.findFirst({ where: { start_date: { lte: endDate }, end_date: { gte: startDate } } });
    if (overlap) throw new Error("Accounting periods must not overlap.");
    const period = await tx.accountingPeriod.create({ data: { fiscal_year: fiscalYear, period_name: periodName, start_date: startDate, end_date: endDate, status: "open" } });
    await audit(tx, session, "accounting.period.create", "accounting_period", period.id, null, period);
    return period;
  });
}

export async function createManualJournal(session: AdminSession, input: { entryDate: Date; memo: string; reference?: string | null; idempotencyKey?: string | null; lines: JournalLineInput[] }) {
  if (!input.lines.length) throw new Error("A journal must contain lines.");
  const normalized = input.lines.map((line) => ({ ...line, amount: money(line.amount) }));
  const debits = sum(normalized.filter((line) => line.direction === "debit").map((line) => line.amount));
  const credits = sum(normalized.filter((line) => line.direction === "credit").map((line) => line.amount));
  if (debits.isZero() && credits.isZero()) throw new Error("Zero-value journals cannot be posted.");
  if (!debits.equals(credits)) throw new Error("Journal debits must equal credits.");
  return prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.journalEntry.findUnique({ where: { idempotency_key: input.idempotencyKey }, include: { lines: true } });
      if (existing) return existing;
    }
    const period = await openPeriod(tx, input.entryDate);
    await assertPostableAccounts(tx, normalized);
    const journal = await tx.journalEntry.create({
      data: {
        entry_number: await nextNumber("JRN"),
        source_type: "manual" as JournalSourceType,
        status: "posted",
        memo: input.memo,
        reference: input.reference,
        entry_date: input.entryDate,
        accounting_period_id: period.id,
        idempotency_key: input.idempotencyKey,
        total_debit: debits,
        total_credit: credits,
        posted_by_id: session.userId,
        posted_at: new Date(),
        lines: {
          create: normalized.map((line, index) => ({
            account_id: line.accountId,
            line_number: index + 1,
            direction: line.direction,
            amount_kes: line.amount.toNumber(),
            debit_amount: line.direction === "debit" ? line.amount : new Prisma.Decimal(0),
            credit_amount: line.direction === "credit" ? line.amount : new Prisma.Decimal(0),
            memo: line.memo ?? null
          }))
        }
      },
      include: { lines: true }
    });
    await audit(tx, session, "accounting.journal.post", "journal_entry", journal.id, null, { entry_number: journal.entry_number, total_debit: debits.toString(), total_credit: credits.toString() });
    return journal;
  });
}

export async function reverseJournal(session: AdminSession, journalId: string, reason: string, accountingDate = new Date()) {
  if (!reason) throw new Error("A reversal reason is required.");
  return prisma.$transaction(async (tx) => {
    const journal = await tx.journalEntry.findUnique({ where: { id: journalId }, include: { lines: true } });
    if (!journal) throw new Error("Journal not found.");
    if (journal.status !== "posted") throw new Error("Only posted journals can be reversed.");
    if (journal.reversed_at) return journal;
    const existing = await tx.journalEntry.findUnique({ where: { idempotency_key: `reversal:${journal.id}` }, include: { lines: true } });
    const period = await openPeriod(tx, accountingDate);
    const reversal = existing ?? await tx.journalEntry.create({
      data: {
        entry_number: await nextNumber("JRN"),
        source_type: "manual" as JournalSourceType,
        status: "posted",
        memo: `Reversal of ${journal.entry_number}: ${reason}`,
        reference: journal.entry_number,
        entry_date: accountingDate,
        accounting_period_id: period.id,
        idempotency_key: `reversal:${journal.id}`,
        total_debit: journal.total_credit,
        total_credit: journal.total_debit,
        posted_by_id: session.userId,
        posted_at: new Date(),
        reversal_of_journal_id: journal.id,
        reversal_reason: reason,
        lines: {
          create: journal.lines.map((line, index) => ({
            account_id: line.account_id,
            line_number: index + 1,
            direction: line.direction === "debit" ? "credit" : "debit",
            amount_kes: line.amount_kes,
            debit_amount: line.credit_amount,
            credit_amount: line.debit_amount,
            memo: `Reversal: ${line.memo ?? journal.memo ?? ""}`
          }))
        }
      },
      include: { lines: true }
    });
    await tx.journalEntry.update({ where: { id: journal.id }, data: { status: "reversed", reversed_by_id: session.userId, reversed_at: new Date(), reversal_reason: reason } });
    await audit(tx, session, "accounting.journal.reverse", "journal_entry", journal.id, { status: journal.status }, { status: "reversed", reversal: reversal.entry_number });
    return reversal;
  });
}

export async function createSourceEvent(session: AdminSession, input: { sourceType: string; sourceId: string; eventType: string; amount: string | number; taxAmount?: string | number; accountingDate?: Date; idempotencyKey: string }) {
  if (!input.sourceType || !input.sourceId || !input.eventType || !input.idempotencyKey) throw new Error("Source type, source id, event type and idempotency key are required.");
  return prisma.$transaction(async (tx) => {
    const event = await tx.accountingSourceEvent.upsert({
      where: { idempotency_key: input.idempotencyKey },
      update: {},
      create: {
        source_type: input.sourceType,
        source_id: input.sourceId,
        event_type: input.eventType,
        event_date: input.accountingDate ?? new Date(),
        accounting_date: input.accountingDate ?? new Date(),
        amount: money(input.amount),
        tax_amount: money(input.taxAmount ?? 0),
        idempotency_key: input.idempotencyKey,
        status: "awaiting_mapping",
        created_by_id: session.userId
      }
    });
    await audit(tx, session, "accounting.source_event.queue", "accounting_source_event", event.id, null, { source_type: event.source_type, source_id: event.source_id, event_type: event.event_type, status: event.status });
    return event;
  });
}

export async function postAccountingSourceEvent(session: AdminSession, eventId: string, reason: string) {
  if (!eventId || !reason) throw new Error("Source event and posting reason are required.");
  return prisma.$transaction(async (tx) => {
    const event = await tx.accountingSourceEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Accounting source event not found.");
    if (event.status === "posted" && event.journal_entry_id) {
      const existing = await tx.journalEntry.findUnique({ where: { id: event.journal_entry_id }, include: { lines: true } });
      if (existing) return existing;
    }
    if (["posting", "reversed", "ignored"].includes(event.status)) throw new Error("The source event is not eligible for posting.");

    const rule = await tx.accountingPostingRule.findFirst({
      where: { source_event_type: event.event_type, status: "active", archived_at: null },
      orderBy: { version: "desc" }
    });
    if (!rule) {
      await tx.accountingSourceEvent.update({ where: { id: event.id }, data: { status: "awaiting_mapping", error_message: "No active posting rule is configured for this source event type." } });
      throw new Error("No active posting rule is configured for this source event type.");
    }

    const rawLines = [...readLogic(rule.debit_logic, "debit"), ...readLogic(rule.credit_logic, "credit")];
    const lines = rawLines.map((line) => ({ ...line, amount: sourceAmount(event, line.amount) }));
    const debits = sum(lines.filter((line) => line.direction === "debit").map((line) => line.amount));
    const credits = sum(lines.filter((line) => line.direction === "credit").map((line) => line.amount));
    if (debits.isZero() && credits.isZero()) throw new Error("Zero-value source events cannot be posted.");
    if (!debits.equals(credits)) throw new Error("Mapped source event debits must equal credits.");

    const idempotencyKey = `source-event:${event.id}:rule:${rule.version}`;
    const existing = await tx.journalEntry.findUnique({ where: { idempotency_key: idempotencyKey }, include: { lines: true } });
    if (existing) {
      await tx.accountingSourceEvent.update({ where: { id: event.id }, data: { status: "posted", journal_entry_id: existing.id, posting_rule_key: rule.rule_key, posting_rule_version: rule.version } });
      return existing;
    }

    const period = await openPeriod(tx, event.accounting_date);
    await assertPostableAccounts(tx, lines);
    await tx.accountingSourceEvent.update({ where: { id: event.id }, data: { status: "posting", posting_rule_key: rule.rule_key, posting_rule_version: rule.version } });
    const journal = await tx.journalEntry.create({
      data: {
        entry_number: await nextNumber("JRN"),
        source_type: sourceType(event.source_type),
        status: "posted",
        memo: `Posted ${event.event_type} from ${event.source_type}:${event.source_id}. ${reason}`,
        reference: event.source_id,
        entry_date: event.accounting_date,
        accounting_period_id: period.id,
        source_event_id: event.id,
        idempotency_key: idempotencyKey,
        total_debit: debits,
        total_credit: credits,
        currency: event.currency,
        posting_rule_version: rule.version,
        correlation_id: event.correlation_id,
        posted_by_id: session.userId,
        posted_at: new Date(),
        lines: {
          create: lines.map((line, index) => ({
            account_id: line.accountId,
            line_number: index + 1,
            direction: line.direction,
            amount_kes: line.amount.toNumber(),
            debit_amount: line.direction === "debit" ? line.amount : new Prisma.Decimal(0),
            credit_amount: line.direction === "credit" ? line.amount : new Prisma.Decimal(0),
            currency: event.currency,
            source_line_id: event.id,
            memo: line.memo ?? event.event_type
          }))
        }
      },
      include: { lines: true }
    });
    await tx.accountingSourceEvent.update({ where: { id: event.id }, data: { status: "posted", journal_entry_id: journal.id, error_message: null } });
    await audit(tx, session, "accounting.source_event.post", "accounting_source_event", event.id, { status: event.status }, { status: "posted", journal: journal.entry_number, rule: rule.rule_key, version: rule.version });
    return journal;
  });
}

export async function createAccountingReconciliationSnapshot(session: AdminSession, reconciliationType = "accounting_reconciliation") {
  return prisma.$transaction(async (tx) => {
    const [events, journals] = await Promise.all([
      tx.accountingSourceEvent.findMany({ take: 1000 }),
      tx.journalEntry.findMany({ where: { status: "posted" }, select: { total_debit: true, total_credit: true } })
    ]);
    const sourceTotal = events.reduce((total, event) => total.plus(event.amount), new Prisma.Decimal(0));
    const ledgerTotal = journals.reduce((total, journal) => total.plus(journal.total_debit), new Prisma.Decimal(0));
    const journalCredit = journals.reduce((total, journal) => total.plus(journal.total_credit), new Prisma.Decimal(0));
    const snapshot = {
      journals: journals.length,
      sourceEvents: events.length,
      journalDebit: ledgerTotal.toString(),
      journalCredit: journalCredit.toString(),
      trialDifference: ledgerTotal.minus(journalCredit).toString(),
      unresolvedEvents: events.filter((event) => event.status !== "posted").length,
      missingOpeningBalances: true,
      valuationPolicyApproved: false
    };
    const run = await tx.accountingReconciliationRun.create({
      data: {
        reconciliation_type: reconciliationType,
        source_total: sourceTotal,
        ledger_total: ledgerTotal,
        difference: sourceTotal.minus(ledgerTotal),
        unposted_count: events.filter((event) => event.status !== "posted").length,
        failed_count: events.filter((event) => event.status === "failed").length,
        mapping_exception_count: events.filter((event) => event.status === "awaiting_mapping").length,
        status: "open",
        snapshot,
        created_by_id: session.userId
      }
    });
    await audit(tx, session, "accounting.reconciliation.snapshot", "accounting_reconciliation_run", run.id, null, snapshot);
    return run;
  });
}

export async function createExpenseDraft(session: AdminSession, formData: FormData) {
  const categoryId = text(formData.get("category_id"));
  const gross = money(formData.get("gross_amount") || formData.get("amount_kes"));
  if (!categoryId || gross.lte(0)) throw new Error("Expense category and positive amount are required.");
  return prisma.$transaction(async (tx) => {
    const category = await tx.expenseCategory.findUnique({ where: { id: categoryId } });
    if (!category || !category.is_active || category.archived_at) throw new Error("Expense category is inactive or archived.");
    const payee = text(formData.get("payee")) || text(formData.get("supplier")) || null;
    const expense = await tx.expense.create({
      data: {
        expense_number: await nextNumber("EXP"),
        category_id: categoryId,
        supplier: payee,
        payee,
        amount_kes: gross.toNumber(),
        gross_amount: gross,
        net_amount: money(formData.get("net_amount") || gross),
        tax_amount: money(formData.get("tax_amount")),
        currency: text(formData.get("currency")) || "KES",
        method: (text(formData.get("method")) || "cash") as BusinessPaymentMethod,
        expense_date: dateValue(formData.get("expense_date")),
        status: "draft",
        payment_status: "unpaid",
        accounting_status: "not_posted",
        approval_status: "not_submitted",
        transaction_reference: text(formData.get("transaction_reference")) || null,
        duplicate_review_key: [payee, gross.toString(), text(formData.get("expense_date"))].join("|").toLowerCase(),
        notes: text(formData.get("notes")) || null,
        created_by_id: session.userId
      }
    });
    await audit(tx, session, "accounting.expense.create", "expense", expense.id, null, { expense_number: expense.expense_number, gross: gross.toString() });
    return expense;
  });
}

export async function approveExpense(session: AdminSession, expenseId: string) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new Error("Expense not found.");
    if (["posted", "reversed", "cancelled"].includes(expense.status)) throw new Error("Posted or reversed expenses cannot be approved again.");
    const updated = await tx.expense.update({ where: { id: expense.id }, data: { status: "approved", approval_status: "approved", approved_by_id: session.userId, approved_at: new Date() } });
    await audit(tx, session, "accounting.expense.approve", "expense", expense.id, { status: expense.status }, { status: updated.status });
    return updated;
  });
}

export async function createCollectionCase(session: AdminSession, invoiceId: string, priority = "normal") {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { customer: true } });
    if (!invoice || invoice.balance_kes <= 0) throw new Error("Only outstanding invoices can be assigned for collection.");
    const existing = await tx.collectionCase.findFirst({ where: { invoice_id: invoice.id, status: { notIn: ["paid", "closed"] } } });
    if (existing) return existing;
    const bucket = agingBucket(invoice.due_date ?? invoice.created_at);
    const item = await tx.collectionCase.create({
      data: { case_number: await nextNumber("COL"), customer_id: invoice.customer_id, invoice_id: invoice.id, outstanding_amount: invoice.balance_kes, aging_bucket: bucket, priority, created_by_id: session.userId }
    });
    await audit(tx, session, "accounting.collection.create", "collection_case", item.id, null, { invoice: invoice.invoice_number, bucket });
    return item;
  });
}

export async function getTrialBalance() {
  const accounts = await prisma.account.findMany({ where: { is_active: true }, include: { lines: { include: { journal_entry: true } } }, orderBy: { code: "asc" } });
  const rows = accounts.map((account) => {
    const posted = account.lines.filter((line) => line.journal_entry.status === "posted");
    const debit = posted.reduce((total, line) => total.plus(line.debit_amount), new Prisma.Decimal(0));
    const credit = posted.reduce((total, line) => total.plus(line.credit_amount), new Prisma.Decimal(0));
    return { account, debit, credit, balance: debit.minus(credit) };
  });
  const totalDebit = rows.reduce((total, row) => total.plus(row.debit), new Prisma.Decimal(0));
  const totalCredit = rows.reduce((total, row) => total.plus(row.credit), new Prisma.Decimal(0));
  return { rows, totalDebit, totalCredit, difference: totalDebit.minus(totalCredit) };
}

export async function getReceivablesAging() {
  const customers = await prisma.customer.findMany({ include: { invoices: true, payments: true }, orderBy: { name: "asc" }, take: 300 });
  return customers.map((customer) => {
    const buckets = { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, over_90: 0 };
    for (const invoice of customer.invoices.filter((item) => item.balance_kes > 0 && !["cancelled"].includes(item.status))) {
      buckets[agingBucketKey(invoice.due_date ?? invoice.created_at)] += invoice.balance_kes;
    }
    return { customer, total: Object.values(buckets).reduce((a, b) => a + b, 0), buckets, lastPayment: customer.payments[0]?.paid_at ?? null };
  }).filter((row) => row.total > 0);
}

export async function getPayablesAging() {
  const suppliers = await prisma.supplier.findMany({ include: { supplier_invoices: true, supplier_payments: true }, orderBy: { company_name: "asc" }, take: 300 });
  return suppliers.map((supplier) => {
    const buckets = { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, over_90: 0 };
    for (const invoice of supplier.supplier_invoices.filter((item) => item.balance_kes > 0 && item.status !== "cancelled")) {
      buckets[agingBucketKey(invoice.due_date ?? invoice.invoice_date)] += invoice.balance_kes;
    }
    return { supplier, total: Object.values(buckets).reduce((a, b) => a + b, 0), buckets, lastPayment: supplier.supplier_payments[0]?.paid_at ?? null };
  }).filter((row) => row.total > 0);
}

export async function getAccountingReconciliation() {
  const [events, journals, invoices, supplierInvoices, expenses] = await Promise.all([
    prisma.accountingSourceEvent.findMany({ take: 500, orderBy: { created_at: "desc" } }),
    prisma.journalEntry.findMany({ where: { status: "posted" }, take: 500, include: { lines: true } }),
    prisma.invoice.findMany({ where: { balance_kes: { gt: 0 } }, select: { balance_kes: true } }),
    prisma.supplierInvoice.findMany({ where: { balance_kes: { gt: 0 } }, select: { balance_kes: true } }),
    prisma.expense.findMany({ where: { accounting_status: { not: "posted" } }, select: { gross_amount: true, amount_kes: true } })
  ]);
  const journalDebit = journals.reduce((total, journal) => total.plus(journal.total_debit), new Prisma.Decimal(0));
  const journalCredit = journals.reduce((total, journal) => total.plus(journal.total_credit), new Prisma.Decimal(0));
  return {
    sourceEvents: events,
    unpostedEvents: events.filter((event) => event.status !== "posted").length,
    mappingExceptions: events.filter((event) => event.status === "awaiting_mapping").length,
    failedPostings: events.filter((event) => event.status === "failed").length,
    journalDebit,
    journalCredit,
    trialDifference: journalDebit.minus(journalCredit),
    debtorTotal: invoices.reduce((total, invoice) => total + invoice.balance_kes, 0),
    creditorTotal: supplierInvoices.reduce((total, invoice) => total + invoice.balance_kes, 0),
    unpostedExpenseTotal: expenses.reduce((total, expense) => total + (expense.gross_amount ? Number(expense.gross_amount) : expense.amount_kes), 0)
  };
}

function agingBucket(date: Date) {
  const key = agingBucketKey(date);
  return key === "b1_30" ? "1-30" : key === "b31_60" ? "31-60" : key === "b61_90" ? "61-90" : key === "over_90" ? "over_90" : "current";
}

function agingBucketKey(date: Date): "current" | "b1_30" | "b31_60" | "b61_90" | "over_90" {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "b1_30";
  if (days <= 60) return "b31_60";
  if (days <= 90) return "b61_90";
  return "over_90";
}

async function audit(tx: Prisma.TransactionClient, session: AdminSession, action: string, entity: string, entityId: string, before: unknown, after: unknown) {
  await tx.auditLog.create({
    data: {
      user_id: session.userId,
      entity,
      entity_id: entityId,
      action,
      before: before as Prisma.InputJsonValue,
      after: after as Prisma.InputJsonValue
    }
  });
}
