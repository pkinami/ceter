"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import {
  assignServiceTicket,
  completeInstallation,
  createCustomerContract,
  createInstallation,
  createLoanUnit,
  createMaintenancePlan,
  createMpsAgreement,
  createServiceDocument,
  createServiceTicket,
  createWarrantyClaim,
  generateMaintenanceOccurrence,
  issueLoanUnit,
  issueServicePart,
  recordMeterReading,
  recordTechnicianWork,
  registerCustomerEquipment,
  requestServicePart,
  reserveServicePart,
  returnLoanUnit,
  returnServicePart,
  transitionServiceTicket
} from "@/lib/admin/service";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function registerEquipmentAction(formData: FormData) {
  const session = await requirePermission("service.equipment.create");
  const equipment = await registerCustomerEquipment(session, formData);
  revalidatePath("/admin/customer-equipment");
  redirect(`/admin/customer-equipment/${equipment.id}`);
}

export async function createServiceTicketAction(formData: FormData) {
  const session = await requirePermission("service.tickets.create");
  const ticket = await createServiceTicket(session, formData);
  revalidatePath("/admin/service/tickets");
  redirect(`/admin/service/tickets/${ticket.id}`);
}

export async function assignServiceTicketAction(formData: FormData) {
  const session = await requirePermission("service.tickets.assign");
  await assignServiceTicket(session, text(formData.get("ticket_id")), text(formData.get("technician_id")), text(formData.get("reason")));
  revalidatePath("/admin/service/tickets");
}

export async function transitionServiceTicketAction(formData: FormData) {
  const status = text(formData.get("status"));
  const permission = status === "closed" ? "service.tickets.close" : status === "resolved" ? "service.tickets.resolve" : status === "reopened" ? "service.tickets.reopen" : status === "cancelled" ? "service.tickets.cancel" : "service.tickets.update";
  const session = await requirePermission(permission);
  await transitionServiceTicket(session, text(formData.get("ticket_id")), status, text(formData.get("reason")));
  revalidatePath("/admin/service/tickets");
}

export async function recordWorkLogAction(formData: FormData) {
  const session = await requirePermission("service.tickets.work");
  await recordTechnicianWork(session, formData);
  revalidatePath("/admin/service/tickets");
}

export async function requestServicePartAction(formData: FormData) {
  const session = await requirePermission("service.stock.request");
  await requestServicePart(session, formData);
  revalidatePath("/admin/service/tickets");
}

export async function reserveServicePartAction(formData: FormData) {
  const session = await requirePermission("service.stock.reserve");
  await reserveServicePart(session, text(formData.get("part_id")), text(formData.get("correlation_id")));
  revalidatePath("/admin/service/tickets");
}

export async function issueServicePartAction(formData: FormData) {
  const session = await requirePermission("service.stock.issue");
  await issueServicePart(session, text(formData.get("part_id")), text(formData.get("correlation_id")));
  revalidatePath("/admin/service/tickets");
}

export async function returnServicePartAction(formData: FormData) {
  const session = await requirePermission("service.stock.return");
  await returnServicePart(session, text(formData.get("part_id")), text(formData.get("correlation_id")), text(formData.get("defective")) === "true");
  revalidatePath("/admin/service/tickets");
}

export async function createContractAction(formData: FormData) {
  const session = await requirePermission("service.contracts.create");
  const contract = await createCustomerContract(session, formData);
  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/${contract.id}`);
}

export async function createInstallationAction(formData: FormData) {
  const session = await requirePermission("service.installations.create");
  const installation = await createInstallation(session, formData);
  revalidatePath("/admin/service/installations");
  redirect(`/admin/service/installations/${installation.id}`);
}

export async function completeInstallationAction(formData: FormData) {
  const session = await requirePermission("service.installations.complete");
  await completeInstallation(session, text(formData.get("installation_id")), text(formData.get("notes")));
  revalidatePath("/admin/service/installations");
}

export async function createMaintenancePlanAction(formData: FormData) {
  const session = await requirePermission("service.maintenance.plans.create");
  const plan = await createMaintenancePlan(session, formData);
  revalidatePath("/admin/service/maintenance");
  redirect(`/admin/service/maintenance/${plan.id}`);
}

export async function generateMaintenanceOccurrenceAction(formData: FormData) {
  const session = await requirePermission("service.maintenance.schedule");
  await generateMaintenanceOccurrence(session, text(formData.get("plan_id")), new Date(text(formData.get("due_date"))), text(formData.get("correlation_id")));
  revalidatePath("/admin/service/maintenance");
}

export async function createWarrantyClaimAction(formData: FormData) {
  const session = await requirePermission("service.warranties.claims.create");
  const claim = await createWarrantyClaim(session, formData);
  revalidatePath("/admin/service/warranties/claims");
  redirect(`/admin/service/warranties/claims/${claim.id}`);
}

export async function createMpsAgreementAction(formData: FormData) {
  const session = await requirePermission("service.mps.manage");
  const agreement = await createMpsAgreement(session, formData);
  revalidatePath("/admin/service/mps");
  redirect(`/admin/service/mps/${agreement.id}`);
}

export async function recordMeterReadingAction(formData: FormData) {
  const session = await requirePermission("service.meter_readings.record");
  const reading = await recordMeterReading(session, formData);
  revalidatePath("/admin/service/meter-readings");
  redirect(`/admin/service/meter-readings/${reading.id}`);
}

export async function createLoanUnitAction(formData: FormData) {
  const session = await requirePermission("service.loan_units.reserve");
  const loan = await createLoanUnit(session, formData);
  revalidatePath("/admin/service/loan-units");
  redirect(`/admin/service/loan-units/${loan.id}`);
}

export async function issueLoanUnitAction(formData: FormData) {
  const session = await requirePermission("service.loan_units.issue");
  await issueLoanUnit(session, text(formData.get("loan_unit_id")), text(formData.get("customer_id")), text(formData.get("ticket_id")) || null, text(formData.get("expected_return_date")) ? new Date(text(formData.get("expected_return_date"))) : null, text(formData.get("correlation_id")));
  revalidatePath("/admin/service/loan-units");
}

export async function returnLoanUnitAction(formData: FormData) {
  const session = await requirePermission("service.loan_units.receive");
  await returnLoanUnit(session, text(formData.get("loan_unit_id")), text(formData.get("condition")), text(formData.get("correlation_id")));
  revalidatePath("/admin/service/loan-units");
}

export async function createServiceDocumentAction(formData: FormData) {
  const session = await requirePermission("service.documents.generate");
  const document = await createServiceDocument(session, formData);
  revalidatePath("/admin/service/reports");
  redirect(`/admin/service/reports/${document.id}`);
}
