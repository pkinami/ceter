"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { approveExpense, createAccount, createAccountingPeriod, createAccountingReconciliationSnapshot, createCollectionCase, createExpenseDraft, createManualJournal, createSourceEvent, postAccountingSourceEvent, reverseJournal } from "@/lib/admin/accounting";

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

function messageRedirect(path: string, key: "success" | "error", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function returnTo(formData: FormData, fallback: string) {
  const requested = text(formData.get("return_to"));
  return requested.startsWith("/admin/") ? requested : fallback;
}

export async function createAccountAction(formData: FormData) {
  const session = await requirePermission("accounting.accounts.manage");
  const target = returnTo(formData, "/admin/accounting/chart-of-accounts");
  try {
    const account = await createAccount(session, formData);
    revalidatePath("/admin/accounting/chart-of-accounts");
    redirect(`/admin/accounting/chart-of-accounts/${account.id}`);
  } catch (error) {
    messageRedirect(target, "error", error instanceof Error ? error.message : "Account could not be created.");
  }
}

export async function createAccountingPeriodAction(formData: FormData) {
  const session = await requirePermission("accounting.periods.manage");
  try {
    await createAccountingPeriod(session, formData);
    revalidatePath("/admin/accounting/periods");
    messageRedirect("/admin/accounting/periods", "success", "Accounting period created.");
  } catch (error) {
    messageRedirect("/admin/accounting/periods", "error", error instanceof Error ? error.message : "Accounting period could not be created.");
  }
}

export async function createExpenseAction(formData: FormData) {
  const session = await requirePermission("expenses.create");
  try {
    const expense = await createExpenseDraft(session, formData);
    revalidatePath("/admin/expenses");
    redirect(`/admin/expenses/${expense.id}`);
  } catch (error) {
    messageRedirect("/admin/expenses/new", "error", error instanceof Error ? error.message : "Expense could not be created.");
  }
}

export async function approveExpenseAction(formData: FormData) {
  const session = await requirePermission("expenses.approve");
  const target = returnTo(formData, "/admin/expenses");
  const expenseId = text(formData.get("expense_id"));
  if (!expenseId) messageRedirect(target, "error", "Expense id is required.");
  try {
    await approveExpense(session, expenseId);
    revalidatePath("/admin/expenses");
    messageRedirect(target, "success", "Expense approved.");
  } catch (error) {
    messageRedirect(target, "error", error instanceof Error ? error.message : "Expense could not be approved.");
  }
}

export async function createManualJournalAction(formData: FormData) {
  const session = await requirePermission("accounting.journals.post");
  const accountIds = formData.getAll("account_id").map(String);
  const directions = formData.getAll("direction").map(String);
  const amounts = formData.getAll("amount").map(String);
  const memos = formData.getAll("line_memo").map(String);
  try {
    const journal = await createManualJournal(session, {
      entryDate: text(formData.get("entry_date")) ? new Date(`${text(formData.get("entry_date"))}T00:00:00.000Z`) : new Date(),
      memo: text(formData.get("memo")) || "Manual journal",
      reference: text(formData.get("reference")) || null,
      idempotencyKey: text(formData.get("idempotency_key")) || null,
      lines: accountIds.map((accountId, index) => ({
        accountId,
        direction: (directions[index] === "credit" ? "credit" : "debit") as "credit" | "debit",
        amount: amounts[index] ?? "0",
        memo: memos[index] ?? null
      })).filter((line): line is { accountId: string; direction: "debit" | "credit"; amount: string; memo: string } => Boolean(line.accountId))
    });
    revalidatePath("/admin/accounting/journals");
    redirect(`/admin/accounting/journals/${journal.id}`);
  } catch (error) {
    messageRedirect("/admin/accounting/journals/new", "error", error instanceof Error ? error.message : "Journal could not be posted.");
  }
}

export async function reverseJournalAction(formData: FormData) {
  const session = await requirePermission("accounting.journals.reverse");
  const journalId = text(formData.get("journal_id"));
  const reason = text(formData.get("reason"));
  const target = returnTo(formData, "/admin/accounting/journals");
  if (!journalId || !reason) messageRedirect(target, "error", "Journal and reason are required.");
  try {
    await reverseJournal(session, journalId, reason);
    revalidatePath("/admin/accounting/journals");
    messageRedirect(target, "success", "Journal reversed with a linked correcting entry.");
  } catch (error) {
    messageRedirect(target, "error", error instanceof Error ? error.message : "Journal could not be reversed.");
  }
}

export async function createCollectionCaseAction(formData: FormData) {
  const session = await requirePermission("accounting.collections.manage");
  const invoiceId = text(formData.get("invoice_id"));
  if (!invoiceId) messageRedirect("/admin/accounting/collections", "error", "Invoice is required.");
  try {
    await createCollectionCase(session, invoiceId, text(formData.get("priority")) || "normal");
    revalidatePath("/admin/accounting/collections");
    messageRedirect("/admin/accounting/collections", "success", "Collection case created.");
  } catch (error) {
    messageRedirect("/admin/accounting/collections", "error", error instanceof Error ? error.message : "Collection case could not be created.");
  }
}

export async function queueAccountingSourceEventAction(formData: FormData) {
  const session = await requirePermission("accounting.source_events.manage");
  try {
    await createSourceEvent(session, {
      sourceType: text(formData.get("source_type")),
      sourceId: text(formData.get("source_id")),
      eventType: text(formData.get("event_type")),
      amount: text(formData.get("amount")),
      taxAmount: text(formData.get("tax_amount")),
      idempotencyKey: text(formData.get("idempotency_key"))
    });
    revalidatePath("/admin/accounting/reconciliation");
    messageRedirect("/admin/accounting/reconciliation", "success", "Source event queued for mapping review.");
  } catch (error) {
    messageRedirect("/admin/accounting/reconciliation", "error", error instanceof Error ? error.message : "Source event could not be queued.");
  }
}

export async function postAccountingSourceEventAction(formData: FormData) {
  const session = await requirePermission("accounting.post");
  const eventId = text(formData.get("event_id"));
  const reason = text(formData.get("reason"));
  if (!eventId || !reason) messageRedirect("/admin/accounting/reconciliation", "error", "Source event and posting reason are required.");
  try {
    const journal = await postAccountingSourceEvent(session, eventId, reason);
    revalidatePath("/admin/accounting/reconciliation");
    revalidatePath("/admin/accounting/journals");
    redirect(`/admin/accounting/journals/${journal.id}`);
  } catch (error) {
    messageRedirect("/admin/accounting/reconciliation", "error", error instanceof Error ? error.message : "Source event could not be posted.");
  }
}

export async function createAccountingReconciliationSnapshotAction(formData: FormData) {
  const session = await requirePermission("accounting.reconcile");
  try {
    await createAccountingReconciliationSnapshot(session, text(formData.get("reconciliation_type")) || "accounting_reconciliation");
    revalidatePath("/admin/accounting/reconciliation");
    messageRedirect("/admin/accounting/reconciliation", "success", "Accounting reconciliation snapshot recorded.");
  } catch (error) {
    messageRedirect("/admin/accounting/reconciliation", "error", error instanceof Error ? error.message : "Reconciliation snapshot could not be recorded.");
  }
}
