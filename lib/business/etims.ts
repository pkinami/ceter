import type { EtimsSubmissionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EtimsPayload = {
  invoiceNumber: string;
  invoiceDate: string;
  taxpayerPin: string;
  vatRegistrationNumber?: string | null;
  branchDetails?: string | null;
  customer: {
    name: string;
    companyName?: string | null;
    pin?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  totals: {
    subtotalKes: number;
    discountKes: number;
    vatKes: number;
    totalKes: number;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceKes: number;
    discountKes: number;
    vatKes: number;
    totalKes: number;
  }>;
};

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function businessSetting(code: string) {
  const setting = await prisma.businessSetting.findUnique({ where: { code } });
  return setting?.value?.trim() || null;
}

export async function prepareEtimsPayload(invoiceId: string): Promise<EtimsPayload> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, items: { orderBy: { sort_order: "asc" } } }
  });
  if (!invoice) throw new Error("Invoice not found.");
  const taxpayerPin = await businessSetting("kra_pin") ?? process.env.ETIMS_TAXPAYER_PIN ?? process.env.CETER_COMPANY_TAX_PIN ?? null;
  if (!taxpayerPin) throw new Error("Company KRA PIN is required before eTIMS submission.");
  return {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.created_at.toISOString(),
    taxpayerPin,
    vatRegistrationNumber: await businessSetting("vat_registration_number"),
    branchDetails: await businessSetting("branch_details"),
    customer: {
      name: invoice.customer.name,
      companyName: invoice.customer.company_name,
      pin: invoice.customer.tax_pin,
      email: invoice.customer.email,
      phone: invoice.customer.phone
    },
    totals: {
      subtotalKes: invoice.subtotal_kes,
      discountKes: invoice.discount_kes,
      vatKes: invoice.vat_kes,
      totalKes: invoice.total_kes
    },
    lines: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceKes: item.unit_price_kes,
      discountKes: item.discount_kes,
      vatKes: item.vat_kes,
      totalKes: item.line_total_kes
    }))
  };
}

export function validateEtimsPayload(payload: EtimsPayload) {
  const missing: string[] = [];
  if (!payload.taxpayerPin) missing.push("company KRA PIN");
  if (!payload.invoiceNumber) missing.push("invoice number");
  if (!payload.invoiceDate) missing.push("invoice date");
  if (!payload.customer.name) missing.push("customer name");
  if (!payload.lines.length) missing.push("invoice items");
  if (payload.totals.totalKes <= 0) missing.push("invoice total");
  payload.lines.forEach((line, index) => {
    if (!line.description) missing.push(`line ${index + 1} description`);
    if (line.quantity <= 0) missing.push(`line ${index + 1} quantity`);
    if (line.unitPriceKes < 0) missing.push(`line ${index + 1} unit price`);
    if (line.totalKes <= 0) missing.push(`line ${index + 1} total`);
  });
  const lineTotal = payload.lines.reduce((sum, line) => sum + line.totalKes, 0);
  if (lineTotal !== payload.totals.totalKes) missing.push("invoice totals matching line totals");
  if (missing.length) throw new Error(`Missing eTIMS required fields: ${missing.join(", ")}.`);
}

export async function createEtimsSubmission(invoiceId: string) {
  const payload = await prepareEtimsPayload(invoiceId);
  validateEtimsPayload(payload);
  const record = await prisma.etimsRecord.create({
    data: {
      invoice_id: invoiceId,
      status: "pending",
      payload: json(payload),
      reference_information: json({ preparedBy: "ceter-phase-3a", externalSubmission: false }),
      logs: { create: { status: "pending", message: "Prepared for eTIMS submission. No KRA approval has been claimed.", request_payload: json(payload) } }
    }
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { etims_status: "pending" } });
  return record;
}

function responseStatus(data: Record<string, unknown>): EtimsSubmissionStatus {
  const raw = String(data.status ?? data.submission_status ?? data.result ?? "").toLowerCase();
  if (["accepted", "approved", "success", "successful"].includes(raw)) return "accepted";
  if (["rejected", "declined"].includes(raw)) return "rejected";
  if (["submitted", "received", "processing"].includes(raw)) return "submitted";
  return "submitted";
}

export async function submitEtimsRecord(recordId: string) {
  const record = await prisma.etimsRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error("eTIMS record not found.");
  if (record.status === "accepted") throw new Error("Accepted eTIMS records cannot be submitted again.");
  const apiUrl = process.env.ETIMS_API_URL;
  const apiKey = process.env.ETIMS_API_KEY;
  const payload = record.payload ?? json(await prepareEtimsPayload(record.invoice_id));
  validateEtimsPayload(payload as EtimsPayload);
  if (!apiUrl || !apiKey) {
    const message = "ETIMS_API_URL and ETIMS_API_KEY are required for live submission.";
    await prisma.etimsRecord.update({
      where: { id: record.id },
      data: { status: "failed", last_error: message, retry_count: { increment: 1 }, last_attempt_at: new Date(), logs: { create: { status: "failed", message, request_payload: payload } } }
    });
    await prisma.invoice.update({ where: { id: record.invoice_id }, data: { etims_status: "failed" } });
    throw new Error(message);
  }

  await prisma.etimsRecord.update({ where: { id: record.id }, data: { status: "submitted", submitted_at: new Date(), last_attempt_at: new Date(), logs: { create: { status: "submitted", message: "Submitted to configured eTIMS endpoint.", request_payload: payload } } } });
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(Number.parseInt(process.env.ETIMS_REQUEST_TIMEOUT_MS ?? "20000", 10))
    });
  } catch (error) {
    const message = error instanceof Error ? `eTIMS request failed: ${error.message}` : "eTIMS request failed before a response was received.";
    const failurePayload = { error: message, occurredAt: new Date().toISOString() };
    await prisma.etimsRecord.update({
      where: { id: record.id },
      data: {
        status: "retry_required",
        response: json(failurePayload),
        last_error: message,
        retry_count: { increment: 1 },
        last_attempt_at: new Date(),
        logs: { create: { status: "retry_required", message, request_payload: payload, response_payload: json(failurePayload) } }
      }
    });
    await prisma.invoice.update({ where: { id: record.invoice_id }, data: { etims_status: "retry_required" } });
    throw new Error(message);
  }
  const data = await response.json().catch(() => ({ status: response.ok ? "submitted" : "failed", httpStatus: response.status }));
  const status = response.ok ? responseStatus(data as Record<string, unknown>) : "retry_required";
  const message = status === "retry_required" ? `eTIMS submission failed with HTTP ${response.status}. Check credentials, payload, or KRA endpoint availability before retrying.` : "eTIMS response stored.";
  const updated = await prisma.etimsRecord.update({
    where: { id: record.id },
    data: {
      status,
      response: json(data),
      control_number: typeof data.control_number === "string" ? data.control_number : typeof data.controlNumber === "string" ? data.controlNumber : undefined,
      qr_reference: typeof data.qr_code_reference === "string" ? data.qr_code_reference : typeof data.qrReference === "string" ? data.qrReference : undefined,
      verification_url: typeof data.verification_url === "string" ? data.verification_url : undefined,
      last_error: status === "failed" || status === "rejected" || status === "retry_required" ? message : null,
      logs: { create: { status, message, response_payload: json(data) } }
    }
  });
  await prisma.invoice.update({
    where: { id: record.invoice_id },
    data: {
      etims_status: status,
      etims_control_number: updated.control_number,
      etims_qr_reference: updated.qr_reference,
      etims_verification_url: updated.verification_url
    }
  });
  return updated;
}

export async function retryEtimsSubmission(recordId: string) {
  const record = await prisma.etimsRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error("eTIMS record not found.");
  if (!["failed", "rejected", "retry_required", "pending"].includes(record.status)) {
    throw new Error("Only pending, failed, rejected or retry-required eTIMS records can be retried.");
  }
  await prisma.etimsRecord.update({ where: { id: record.id }, data: { retry_count: { increment: 1 } } });
  return submitEtimsRecord(record.id);
}
