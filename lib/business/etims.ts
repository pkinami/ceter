import type { EtimsSubmissionStatus, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
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
    itemCode?: string | null;
    classificationCode?: string | null;
    unitCode?: string | null;
    taxTypeCode?: string | null;
    taxRate?: string | null;
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
    include: { customer: true, items: { orderBy: { sort_order: "asc" }, include: { product: true } } }
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
      totalKes: item.line_total_kes,
      itemCode: item.product?.etims_item_code,
      classificationCode: item.product?.etims_classification_code,
      unitCode: item.product?.etims_unit_code,
      taxTypeCode: item.product?.tax_type_code,
      taxRate: item.product?.tax_rate?.toString() ?? null
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
    if (!line.itemCode) missing.push(`line ${index + 1} eTIMS item code`);
    if (!line.classificationCode) missing.push(`line ${index + 1} eTIMS classification`);
    if (!line.unitCode) missing.push(`line ${index + 1} unit of measure`);
    if (!line.taxTypeCode) missing.push(`line ${index + 1} tax type`);
  });
  const lineTotal = payload.lines.reduce((sum, line) => sum + line.totalKes, 0);
  if (lineTotal !== payload.totals.totalKes) missing.push("invoice totals matching line totals");
  if (missing.length) throw new Error(`Missing eTIMS required fields: ${missing.join(", ")}.`);
}

export async function createEtimsSubmission(invoiceId: string) {
  const accepted = await prisma.etimsRecord.findFirst({ where: { invoice_id: invoiceId, internal_state: "accepted" } });
  if (accepted) throw new Error("This invoice is already accepted by the fiscalization provider and cannot be submitted again.");
  const duplicate = await prisma.etimsRecord.findFirst({ where: { invoice_id: invoiceId, internal_state: { in: ["queued", "submitting", "accepted"] } } });
  if (duplicate) return duplicate;
  const payload = await prepareEtimsPayload(invoiceId);
  validateEtimsPayload(payload);
  const mode = fiscalizationMode();
  const environment = fiscalizationEnvironment();
  const idempotencyKey = createHash("sha256").update(`${invoiceId}:v1:${mode}:${environment}`).digest("hex");
  const record = await prisma.etimsRecord.create({
    data: {
      invoice_id: invoiceId,
      status: "pending",
      internal_state: "queued",
      provider_mode: mode,
      environment,
      invoice_version: 1,
      idempotency_key: idempotencyKey,
      taxpayer_pin_hash: createHash("sha256").update(payload.taxpayerPin).digest("hex"),
      sanitized_request: json(redactPayload(payload)),
      payload: json(payload),
      reference_information: json({ preparedBy: "ceter-fiscalization-service", externalSubmission: false, mode, environment }),
      logs: { create: { status: "pending", message: "Prepared for eTIMS submission. No KRA approval has been claimed.", request_payload: json(redactPayload(payload)) } }
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
  if (record.status === "accepted" || record.internal_state === "accepted") throw new Error("Accepted eTIMS records cannot be submitted again.");
  const apiUrl = process.env.ETIMS_API_URL;
  const apiKey = process.env.ETIMS_API_KEY;
  const payload = record.payload ?? json(await prepareEtimsPayload(record.invoice_id));
  validateEtimsPayload(payload as EtimsPayload);
  const mode = record.provider_mode ?? fiscalizationMode();
  if (mode === "disabled" || mode === "manual") {
    const message = "Production eTIMS is disabled or manual. Configure a legitimate provider before live submission.";
    await prisma.etimsRecord.update({
      where: { id: record.id },
      data: { status: "failed", internal_state: "retryable_error", last_error: message, retry_count: { increment: 1 }, last_attempt_at: new Date(), logs: { create: { status: "failed", message, request_payload: json(redactPayload(payload as EtimsPayload)) } } }
    });
    await prisma.invoice.update({ where: { id: record.invoice_id }, data: { etims_status: "failed" } });
    throw new Error(message);
  }

  await prisma.etimsRecord.update({ where: { id: record.id }, data: { status: "submitted", internal_state: "submitting", attempt_number: { increment: 1 }, submitted_at: new Date(), last_attempt_at: new Date(), logs: { create: { status: "submitted", message: `Submitted through ${mode} adapter.`, request_payload: json(redactPayload(payload as EtimsPayload)) } } } });
  if (mode === "sandbox" && (!apiUrl || !apiKey)) {
    const sandboxResponse = { status: "submitted", message: "Sandbox validation completed locally. No KRA acceptance or QR has been generated." };
    const updated = await prisma.etimsRecord.update({
      where: { id: record.id },
      data: {
        status: "submitted",
        internal_state: "reconciliation_required",
        sanitized_response: json(sandboxResponse),
        response: json(sandboxResponse),
        response_code: "SANDBOX_VALIDATED",
        response_message: sandboxResponse.message,
        logs: { create: { status: "submitted", message: sandboxResponse.message, response_payload: json(sandboxResponse) } }
      }
    });
    await prisma.invoice.update({ where: { id: record.invoice_id }, data: { etims_status: "submitted" } });
    return updated;
  }
  if (!apiUrl || !apiKey) {
    throw new Error("ETIMS_API_URL and ETIMS_API_KEY are required for configured provider submission.");
  }
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
        internal_state: "retryable_error",
        response: json(failurePayload),
        sanitized_response: json(failurePayload),
        last_error: message,
        retry_count: { increment: 1 },
        last_attempt_at: new Date(),
        logs: { create: { status: "retry_required", message, request_payload: json(redactPayload(payload as EtimsPayload)), response_payload: json(failurePayload) } }
      }
    });
    await prisma.invoice.update({ where: { id: record.invoice_id }, data: { etims_status: "retry_required" } });
    throw new Error(message);
  }
  const data = await response.json().catch(() => ({ status: response.ok ? "submitted" : "failed", httpStatus: response.status }));
  const status = response.ok ? responseStatus(data as Record<string, unknown>) : "retry_required";
  const internalState = internalStateForStatus(status);
  const message = status === "retry_required" ? `eTIMS submission failed with HTTP ${response.status}. Check credentials, payload, or KRA endpoint availability before retrying.` : "eTIMS response stored.";
  const updated = await prisma.etimsRecord.update({
    where: { id: record.id },
    data: {
      status,
      internal_state: internalState,
      response: json(data),
      sanitized_response: json(redactObject(data as Record<string, unknown>)),
      control_number: typeof data.control_number === "string" ? data.control_number : typeof data.controlNumber === "string" ? data.controlNumber : undefined,
      qr_reference: typeof data.qr_code_reference === "string" ? data.qr_code_reference : typeof data.qrReference === "string" ? data.qrReference : undefined,
      verification_url: typeof data.verification_url === "string" ? data.verification_url : undefined,
      official_qr_payload: typeof data.qr_payload === "string" ? data.qr_payload : typeof data.qrPayload === "string" ? data.qrPayload : undefined,
      accepted_at: status === "accepted" ? new Date() : undefined,
      response_code: typeof data.code === "string" ? data.code : typeof data.responseCode === "string" ? data.responseCode : undefined,
      response_message: typeof data.message === "string" ? data.message : typeof data.responseMessage === "string" ? data.responseMessage : message,
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
  if (record.internal_state === "accepted" || record.status === "accepted") throw new Error("Accepted eTIMS records cannot be retried.");
  if (!["failed", "rejected", "retry_required", "pending", "submitted"].includes(record.status)) {
    throw new Error("Only pending, failed, rejected or retry-required eTIMS records can be retried.");
  }
  await prisma.etimsRecord.update({ where: { id: record.id }, data: { retry_count: { increment: 1 } } });
  return submitEtimsRecord(record.id);
}

function fiscalizationMode() {
  const mode = (process.env.ETIMS_PROVIDER_MODE ?? process.env.ETIMS_MODE ?? "disabled").toLowerCase();
  if (["oscu", "vscu", "legacy_tims_etr", "sandbox", "manual"].includes(mode)) return mode as "oscu" | "vscu" | "legacy_tims_etr" | "sandbox" | "manual";
  return "disabled";
}

function fiscalizationEnvironment() {
  return process.env.ETIMS_ENVIRONMENT === "production" ? "production" : "sandbox";
}

function internalStateForStatus(status: EtimsSubmissionStatus) {
  if (status === "accepted") return "accepted";
  if (status === "rejected") return "rejected";
  if (status === "retry_required" || status === "failed") return "retryable_error";
  if (status === "submitted") return "reconciliation_required";
  return "queued";
}

function redactPayload(payload: EtimsPayload) {
  return {
    ...payload,
    taxpayerPin: "[redacted]",
    customer: {
      ...payload.customer,
      pin: payload.customer.pin ? "[redacted]" : null,
      email: payload.customer.email ? "[redacted]" : null,
      phone: payload.customer.phone ? "[redacted]" : null
    }
  };
}

function redactObject(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => (/pin|key|secret|token|password|credential/i.test(key) ? [key, "[redacted]"] : [key, entry])));
}
