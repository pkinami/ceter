import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/admin/auth";
import { ensureDefaultInventoryLocation, postInventoryMovement, recordAudit } from "@/lib/admin/inventory";

type Tx = Prisma.TransactionClient;

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: FormDataEntryValue | null) {
  const current = text(value);
  return current || null;
}

function numberFrom(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requireText(value: string, message: string) {
  if (!value) throw new Error(message);
  return value;
}

function reference(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${Date.now()}`;
}

export function calendarSla(priority: string, openedAt = new Date()) {
  const targets: Record<string, { response: number; resolution: number }> = {
    low: { response: 24 * 60, resolution: 5 * 24 * 60 },
    normal: { response: 8 * 60, resolution: 3 * 24 * 60 },
    high: { response: 4 * 60, resolution: 24 * 60 },
    urgent: { response: 60, resolution: 8 * 60 }
  };
  const selected = targets[priority] ?? targets.normal;
  return {
    responseDueAt: new Date(openedAt.getTime() + selected.response * 60_000),
    resolutionDueAt: new Date(openedAt.getTime() + selected.resolution * 60_000),
    snapshot: {
      policy: "calendar_time_default",
      timezone: process.env.TZ || "Africa/Nairobi",
      priority,
      response_minutes: selected.response,
      resolution_minutes: selected.resolution,
      pause_waiting_customer: false,
      pause_waiting_parts: false
    }
  };
}

export async function registerCustomerEquipment(session: AdminSession, formData: FormData) {
  const customerId = requireText(text(formData.get("customer_id")), "Customer is required.");
  const modelName = requireText(text(formData.get("model_name")), "Model is required.");
  const serial = optional(formData.get("external_serial"));
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error("Customer was not found.");
    if (serial) {
      const duplicate = await tx.customerEquipment.findFirst({ where: { customer_id: customerId, external_serial: serial, archived_at: null } });
      if (duplicate) throw new Error("This customer already has equipment with the same serial number.");
    }
    const equipment = await tx.customerEquipment.create({
      data: {
        equipment_number: reference("EQ"),
        customer_id: customerId,
        product_id: optional(formData.get("product_id")),
        serial_number_id: optional(formData.get("serial_number_id")),
        brand_name: optional(formData.get("brand_name")),
        model_name: modelName,
        external_serial: serial,
        ownership_type: (text(formData.get("ownership_type")) || "customer_owned") as never,
        status: (text(formData.get("status")) || "active") as never,
        condition: optional(formData.get("condition")),
        site_label: optional(formData.get("site_label")),
        department: optional(formData.get("department")),
        site_contact: optional(formData.get("site_contact")),
        meter_required: text(formData.get("meter_required")) === "on",
        notes: optional(formData.get("notes")),
        created_by_id: session.userId
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "CustomerEquipment", entityId: equipment.id, action: "service.equipment.create", after: { customer_id: customerId, model_name: modelName, serial_provided: Boolean(serial) } });
    return equipment;
  });
}

export async function createServiceTicket(session: AdminSession, formData: FormData) {
  const customerId = requireText(text(formData.get("customer_id")), "Customer is required.");
  const issue = requireText(text(formData.get("reported_issue")), "Reported issue is required.");
  const equipmentId = optional(formData.get("equipment_id"));
  const priority = text(formData.get("priority")) || "normal";
  const now = new Date();
  const sla = calendarSla(priority, now);
  return prisma.$transaction(async (tx) => {
    if (equipmentId) {
      const equipment = await tx.customerEquipment.findUnique({ where: { id: equipmentId } });
      if (!equipment || equipment.customer_id !== customerId) throw new Error("Equipment must belong to the selected customer.");
    }
    const ticket = await tx.serviceTicket.create({
      data: {
        ticket_number: reference("SVC"),
        customer_id: customerId,
        equipment_id: equipmentId,
        priority: priority as never,
        category: optional(formData.get("category")),
        reported_issue: issue,
        source: (text(formData.get("source")) || "admin") as never,
        status: "new",
        response_due_at: sla.responseDueAt,
        resolution_due_at: sla.resolutionDueAt,
        sla_policy_snapshot: sla.snapshot,
        customer_notes: optional(formData.get("customer_notes")),
        private_notes: optional(formData.get("private_notes")),
        created_by_id: session.userId,
        status_history: { create: { to_status: "new", user_id: session.userId, correlation_id: reference("svc-open") } }
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "ServiceTicket", entityId: ticket.id, action: "service.ticket.create", after: { customer_id: customerId, equipment_id: equipmentId, priority } });
    return ticket;
  });
}

export async function assignServiceTicket(session: AdminSession, ticketId: string, technicianId: string, reason: string) {
  if (!reason.trim()) throw new Error("Assignment reason is required.");
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.serviceTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket was not found.");
    const updated = await tx.serviceTicket.update({ where: { id: ticket.id }, data: { assigned_to_id: technicianId, status: "assigned" } });
    await tx.serviceTicketAssignment.create({ data: { ticket_id: ticket.id, technician_id: technicianId, assigned_by_id: session.userId, reason } });
    await tx.serviceTicketStatusHistory.create({ data: { ticket_id: ticket.id, from_status: ticket.status, to_status: "assigned", reason, user_id: session.userId, correlation_id: reference("svc-assign") } });
    await createInternalNotification(tx, technicianId, "Ticket assigned", ticket.ticket_number, "ServiceTicket", ticket.id, `ticket:${ticket.id}:assign:${technicianId}`);
    await recordAudit(tx, { userId: session.userId, entity: "ServiceTicket", entityId: ticket.id, action: "service.ticket.assign", before: { assigned_to_id: ticket.assigned_to_id }, after: { assigned_to_id: technicianId, reason } });
    return updated;
  });
}

export async function transitionServiceTicket(session: AdminSession, ticketId: string, status: string, reason: string) {
  if (["closed", "reopened", "cancelled"].includes(status) && !reason.trim()) throw new Error("A reason is required for this transition.");
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.serviceTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket was not found.");
    if (ticket.status === status) return ticket;
    if (status === "closed" && !ticket.resolution) throw new Error("Closure requires resolution information.");
    const data: Prisma.ServiceTicketUpdateInput = { status: status as never };
    if (status === "resolved") data.resolved_at = new Date();
    if (status === "closed") data.closed_at = new Date();
    const updated = await tx.serviceTicket.update({ where: { id: ticket.id }, data });
    await tx.serviceTicketStatusHistory.create({ data: { ticket_id: ticket.id, from_status: ticket.status, to_status: status as never, reason: reason || null, user_id: session.userId, correlation_id: reference("svc-status") } });
    await recordAudit(tx, { userId: session.userId, entity: "ServiceTicket", entityId: ticket.id, action: "service.ticket.transition", before: { status: ticket.status }, after: { status, reason } });
    return updated;
  });
}

export async function recordTechnicianWork(session: AdminSession, formData: FormData) {
  const ticketId = requireText(text(formData.get("ticket_id")), "Ticket is required.");
  const start = new Date(requireText(text(formData.get("work_started_at")), "Start time is required."));
  const end = new Date(requireText(text(formData.get("work_ended_at")), "End time is required."));
  if (!(end > start)) throw new Error("End time must be after start time.");
  const duration = Math.round((end.getTime() - start.getTime()) / 60_000);
  return prisma.$transaction(async (tx) => {
    const overlap = await tx.technicianWorkLog.findFirst({ where: { technician_id: session.userId, work_started_at: { lt: end }, work_ended_at: { gt: start } } });
    if (overlap) throw new Error("This work log overlaps another technician entry.");
    const log = await tx.technicianWorkLog.create({
      data: {
        ticket_id: ticketId,
        technician_id: session.userId,
        work_started_at: start,
        work_ended_at: end,
        duration_minutes: duration,
        work_performed: requireText(text(formData.get("work_performed")), "Work performed is required."),
        customer_visible_summary: optional(formData.get("customer_visible_summary")),
        private_notes: optional(formData.get("private_notes")),
        chargeable: text(formData.get("chargeable")) === "on",
        labour_rate_kes: text(formData.get("labour_rate_kes")) ? numberFrom(formData.get("labour_rate_kes")) : null,
        correlation_id: optional(formData.get("correlation_id"))
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "TechnicianWorkLog", entityId: log.id, action: "service.work_log.create", after: { ticket_id: ticketId, duration_minutes: duration } });
    return log;
  });
}

export async function requestServicePart(session: AdminSession, formData: FormData) {
  const ticketId = requireText(text(formData.get("ticket_id")), "Ticket is required.");
  const productId = requireText(text(formData.get("product_id")), "Product is required.");
  const quantity = numberFrom(formData.get("quantity"));
  if (quantity <= 0) throw new Error("Quantity must be positive.");
  return prisma.$transaction(async (tx) => {
    const location = optional(formData.get("location_id")) ? await tx.inventoryLocation.findUnique({ where: { id: text(formData.get("location_id")) } }) : await ensureDefaultInventoryLocation(tx);
    if (!location) throw new Error("Inventory location was not found.");
    const part = await tx.servicePartUsage.create({
      data: {
        ticket_id: ticketId,
        product_id: productId,
        location_id: location.id,
        quantity,
        chargeable: text(formData.get("chargeable")) === "on",
        covered_by: optional(formData.get("covered_by")),
        requested_by_id: session.userId,
        notes: optional(formData.get("notes"))
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "ServicePartUsage", entityId: part.id, action: "service.part.request", after: { ticket_id: ticketId, product_id: productId, quantity } });
    return part;
  });
}

export async function createCustomerContract(session: AdminSession, formData: FormData) {
  const customerId = requireText(text(formData.get("customer_id")), "Customer is required.");
  const contractType = text(formData.get("contract_type")) || "maintenance";
  return prisma.$transaction(async (tx) => {
    const contract = await tx.customerContract.create({
      data: {
        contract_number: reference("CTR"),
        customer_id: customerId,
        contract_type: contractType as never,
        status: "draft",
        start_date: text(formData.get("start_date")) ? new Date(text(formData.get("start_date"))) : null,
        end_date: text(formData.get("end_date")) ? new Date(text(formData.get("end_date"))) : null,
        renewal_date: text(formData.get("renewal_date")) ? new Date(text(formData.get("renewal_date"))) : null,
        response_minutes: text(formData.get("response_minutes")) ? numberFrom(formData.get("response_minutes")) : null,
        resolution_minutes: text(formData.get("resolution_minutes")) ? numberFrom(formData.get("resolution_minutes")) : null,
        billing_schedule: optional(formData.get("billing_schedule")),
        payment_terms: optional(formData.get("payment_terms")),
        pricing_snapshot: { note: "Captured manually; confirmed pricing only.", monthly_kes: numberFrom(formData.get("monthly_kes"), 0) },
        created_by_id: session.userId
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "CustomerContract", entityId: contract.id, action: "service.contract.create", after: { customer_id: customerId, contract_type: contractType } });
    return contract;
  });
}

export async function createInstallation(session: AdminSession, formData: FormData) {
  const customerId = requireText(text(formData.get("customer_id")), "Customer is required.");
  const equipmentId = requireText(text(formData.get("equipment_id")), "Equipment is required.");
  return prisma.$transaction(async (tx) => {
    const equipment = await tx.customerEquipment.findUnique({ where: { id: equipmentId } });
    if (!equipment || equipment.customer_id !== customerId) throw new Error("Equipment must belong to the selected customer.");
    const installation = await tx.serviceInstallation.create({
      data: {
        installation_number: reference("INS"),
        customer_id: customerId,
        equipment_id: equipmentId,
        order_id: optional(formData.get("order_id")),
        delivery_id: optional(formData.get("delivery_id")),
        scheduled_at: text(formData.get("scheduled_at")) ? new Date(text(formData.get("scheduled_at"))) : null,
        assigned_to_id: optional(formData.get("assigned_to_id")),
        site_snapshot: { site: optional(formData.get("site_label")) ?? equipment.site_label },
        site_contact_snapshot: { contact: optional(formData.get("site_contact")) ?? equipment.site_contact },
        checklist_snapshot: [],
        status: "scheduled",
        created_by_id: session.userId
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "ServiceInstallation", entityId: installation.id, action: "service.installation.create", after: { equipment_id: equipmentId } });
    return installation;
  });
}

export async function completeInstallation(session: AdminSession, installationId: string, notes: string) {
  return prisma.$transaction(async (tx) => {
    const installation = await tx.serviceInstallation.findUnique({ where: { id: installationId } });
    if (!installation) throw new Error("Installation was not found.");
    if (installation.status === "completed") return installation;
    const updated = await tx.serviceInstallation.update({ where: { id: installation.id }, data: { status: "completed", completed_at: new Date(), outstanding_actions: notes || null } });
    await tx.customerEquipment.update({ where: { id: installation.equipment_id }, data: { status: "active", installed_at: new Date() } });
    await recordAudit(tx, { userId: session.userId, entity: "ServiceInstallation", entityId: installation.id, action: "service.installation.complete", after: { notes } });
    return updated;
  });
}

export async function createMaintenancePlan(session: AdminSession, formData: FormData) {
  const customerId = requireText(text(formData.get("customer_id")), "Customer is required.");
  const startDate = requireText(text(formData.get("start_date")), "Start date is required.");
  const plan = await prisma.maintenancePlan.create({
    data: {
      plan_number: reference("PM"),
      customer_id: customerId,
      contract_id: optional(formData.get("contract_id")),
      equipment_id: optional(formData.get("equipment_id")),
      maintenance_type: requireText(text(formData.get("maintenance_type")), "Maintenance type is required."),
      frequency: text(formData.get("frequency")) || "monthly",
      scheduling_basis: text(formData.get("scheduling_basis")) || "calendar_interval",
      start_date: new Date(startDate),
      next_due_date: text(formData.get("next_due_date")) ? new Date(text(formData.get("next_due_date"))) : new Date(startDate),
      checklist_template: [],
      required_parts: [],
      created_by_id: session.userId
    }
  });
  await prisma.auditLog.create({ data: { user_id: session.userId, entity: "MaintenancePlan", entity_id: plan.id, action: "service.maintenance.plan.create", after: { customer_id: customerId } } });
  return plan;
}

export async function generateMaintenanceOccurrence(session: AdminSession, planId: string, dueDate: Date, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.maintenancePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Maintenance plan was not found.");
    const occurrence = await tx.maintenanceOccurrence.upsert({
      where: { plan_id_due_date: { plan_id: plan.id, due_date: dueDate } },
      update: {},
      create: { occurrence_number: reference("PMV"), plan_id: plan.id, customer_id: plan.customer_id, equipment_id: plan.equipment_id, due_date: dueDate, status: "due", correlation_id: idempotencyKey }
    });
    await recordAudit(tx, { userId: session.userId, entity: "MaintenanceOccurrence", entityId: occurrence.id, action: "service.maintenance.occurrence.generate", after: { plan_id: plan.id, due_date: dueDate.toISOString() } });
    return occurrence;
  });
}

export async function recordMeterReading(session: AdminSession, formData: FormData) {
  const equipmentId = requireText(text(formData.get("equipment_id")), "Equipment is required.");
  const counterType = text(formData.get("counter_type")) || "total";
  const value = numberFrom(formData.get("reading_value"), -1);
  if (value < 0) throw new Error("Reading value must be non-negative.");
  return prisma.$transaction(async (tx) => {
    const equipment = await tx.customerEquipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) throw new Error("Equipment was not found.");
    const previous = await tx.meterReading.findFirst({ where: { equipment_id: equipmentId, counter_type: counterType as never, validation_status: { in: ["accepted", "billed"] } }, orderBy: { reading_at: "desc" } });
    if (previous && value < previous.reading_value) throw new Error("Reading cannot be lower than the previous accepted reading without a reset/correction event.");
    const reading = await tx.meterReading.create({
      data: {
        reading_number: reference("MTR"),
        customer_id: equipment.customer_id,
        equipment_id: equipment.id,
        contract_id: optional(formData.get("contract_id")),
        mps_agreement_id: optional(formData.get("mps_agreement_id")),
        reading_at: text(formData.get("reading_at")) ? new Date(text(formData.get("reading_at"))) : new Date(),
        counter_type: counterType as never,
        reading_value: value,
        previous_reading: previous?.reading_value ?? null,
        calculated_usage: previous ? value - previous.reading_value : null,
        source: (text(formData.get("source")) || "manual") as never,
        captured_by_id: session.userId,
        evidence_path: optional(formData.get("evidence_path")),
        validation_status: "pending",
        correlation_id: optional(formData.get("correlation_id"))
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "MeterReading", entityId: reading.id, action: "service.meter_reading.create", after: { equipment_id: equipment.id, counter_type: counterType, reading_value: value } });
    return reading;
  });
}

export async function createWarrantyClaim(session: AdminSession, formData: FormData) {
  const warrantyId = requireText(text(formData.get("warranty_id")), "Warranty is required.");
  return prisma.$transaction(async (tx) => {
    const warranty = await tx.equipmentWarranty.findUnique({ where: { id: warrantyId } });
    if (!warranty) throw new Error("Warranty was not found.");
    const claim = await tx.warrantyClaim.create({
      data: {
        claim_number: reference("WCL"),
        warranty_id: warranty.id,
        customer_id: warranty.customer_id,
        equipment_id: warranty.equipment_id,
        ticket_id: optional(formData.get("ticket_id")),
        reported_fault: requireText(text(formData.get("reported_fault")), "Reported fault is required."),
        eligibility_snapshot: { status: warranty.status, end_date: warranty.end_date },
        created_by_id: session.userId
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "WarrantyClaim", entityId: claim.id, action: "service.warranty_claim.create", after: { warranty_id: warranty.id } });
    return claim;
  });
}

export async function createMpsAgreement(session: AdminSession, formData: FormData) {
  const customerId = requireText(text(formData.get("customer_id")), "Customer is required.");
  const contractId = requireText(text(formData.get("contract_id")), "Contract is required.");
  return prisma.$transaction(async (tx) => {
    const contract = await tx.customerContract.findUnique({ where: { id: contractId } });
    if (!contract || contract.customer_id !== customerId) throw new Error("MPS agreement must use a contract for the same customer.");
    const agreement = await tx.mpsAgreement.create({
      data: {
        agreement_number: reference("MPS"),
        customer_id: customerId,
        contract_id: contractId,
        product_id: optional(formData.get("product_id")),
        counter_types: ["mono", "colour", "total"],
        reading_frequency: optional(formData.get("reading_frequency")),
        billing_frequency: optional(formData.get("billing_frequency")),
        included_volumes: { mono: numberFrom(formData.get("included_mono"), 0), colour: numberFrom(formData.get("included_colour"), 0) },
        overage_rates: { mono_kes: numberFrom(formData.get("mono_rate_kes"), 0), colour_kes: numberFrom(formData.get("colour_rate_kes"), 0) },
        minimum_charge_kes: text(formData.get("minimum_charge_kes")) ? numberFrom(formData.get("minimum_charge_kes")) : null,
        billing_day: text(formData.get("billing_day")) ? numberFrom(formData.get("billing_day")) : null,
        next_reading_due: text(formData.get("next_reading_due")) ? new Date(text(formData.get("next_reading_due"))) : null
      }
    });
    await recordAudit(tx, { userId: session.userId, entity: "MpsAgreement", entityId: agreement.id, action: "service.mps.create", after: { contract_id: contractId } });
    return agreement;
  });
}

export async function createLoanUnit(session: AdminSession, formData: FormData) {
  const loan = await prisma.serviceLoanUnit.create({
    data: {
      loan_unit_number: reference("LOAN"),
      product_id: optional(formData.get("product_id")),
      equipment_id: optional(formData.get("equipment_id")),
      serial_number_id: optional(formData.get("serial_number_id")),
      current_location_id: optional(formData.get("current_location_id")),
      condition: optional(formData.get("condition")),
      status: "available"
    }
  });
  await prisma.auditLog.create({ data: { user_id: session.userId, entity: "ServiceLoanUnit", entity_id: loan.id, action: "service.loan_unit.create", after: { product_id: optional(formData.get("product_id")) } } });
  return loan;
}

export async function issueLoanUnit(session: AdminSession, loanUnitId: string, customerId: string, ticketId: string | null, expectedReturnDate: Date | null, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.serviceLoanUnit.findUnique({ where: { id: loanUnitId } });
    if (!loan) throw new Error("Loan unit was not found.");
    if (loan.issue_key) return loan;
    if (!["available", "reserved", "returned"].includes(loan.status)) throw new Error("Loan unit is not available for issue.");
    if (loan.product_id && loan.current_location_id) {
      await postInventoryMovement(tx, {
        productId: loan.product_id,
        locationId: loan.current_location_id,
        quantity: -1,
        movementType: "loan_unit_issue",
        sourceDocumentType: "ServiceLoanUnit",
        sourceDocumentId: loan.id,
        sourceLineId: loan.id,
        reference: loan.loan_unit_number,
        reason: "Loan unit issued to customer custody",
        userId: session.userId,
        branch: session.role,
        correlationId: idempotencyKey
      });
    }
    const updated = await tx.serviceLoanUnit.update({ where: { id: loan.id }, data: { status: "issued", customer_id: customerId, ticket_id: ticketId, issue_date: new Date(), expected_return_date: expectedReturnDate, issuing_user_id: session.userId, issue_key: idempotencyKey } });
    await recordAudit(tx, { userId: session.userId, entity: "ServiceLoanUnit", entityId: loan.id, action: "service.loan_unit.issue", after: { customer_id: customerId, ticket_id: ticketId } });
    return updated;
  });
}

export async function returnLoanUnit(session: AdminSession, loanUnitId: string, condition: string, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.serviceLoanUnit.findUnique({ where: { id: loanUnitId } });
    if (!loan) throw new Error("Loan unit was not found.");
    if (loan.return_key) return loan;
    if (loan.product_id && loan.current_location_id) {
      await postInventoryMovement(tx, {
        productId: loan.product_id,
        locationId: loan.current_location_id,
        quantity: 1,
        movementType: "loan_unit_return",
        sourceDocumentType: "ServiceLoanUnitReturn",
        sourceDocumentId: loan.id,
        sourceLineId: loan.id,
        reference: loan.loan_unit_number,
        reason: "Loan unit returned from customer custody",
        userId: session.userId,
        branch: session.role,
        correlationId: idempotencyKey
      });
    }
    const status = /damage|fault|broken/i.test(condition) ? "damaged" : "under_inspection";
    const updated = await tx.serviceLoanUnit.update({ where: { id: loan.id }, data: { status: status as never, actual_return_date: new Date(), condition_at_return: condition, receiving_user_id: session.userId, return_key: idempotencyKey } });
    await recordAudit(tx, { userId: session.userId, entity: "ServiceLoanUnit", entityId: loan.id, action: "service.loan_unit.return", after: { condition, status } });
    return updated;
  });
}

export async function createServiceDocument(session: AdminSession, formData: FormData) {
  const document = await prisma.document.create({
    data: {
      document_type: "contract",
      document_number: reference("SDOC"),
      operational_barcode: reference("BAR"),
      title: requireText(text(formData.get("title")), "Document title is required."),
      bucket: "business-documents",
      storage_path: `service/${Date.now()}.pdf`,
      lifecycle_status: "draft",
      signature_status: "not_configured",
      verification_status: "not_issued",
      customer_id: optional(formData.get("customer_id")),
      equipment_id: optional(formData.get("equipment_id")),
      service_ticket_id: optional(formData.get("service_ticket_id")),
      customer_contract_id: optional(formData.get("customer_contract_id")),
      notes: "Service document draft; final signing uses the document-trust service.",
      created_by_id: session.userId
    }
  });
  await prisma.auditLog.create({ data: { user_id: session.userId, entity: "Document", entity_id: document.id, action: "service.document.create", after: { document_number: document.document_number } } });
  return document;
}

export async function reserveServicePart(session: AdminSession, partId: string, idempotencyKey: string) {
  return servicePartMovement(session, partId, "service_reservation", "reserved", idempotencyKey, 1);
}

export async function issueServicePart(session: AdminSession, partId: string, idempotencyKey: string) {
  return servicePartMovement(session, partId, "service_issue", "issued", idempotencyKey, -1);
}

export async function returnServicePart(session: AdminSession, partId: string, idempotencyKey: string, defective = false) {
  return servicePartMovement(session, partId, "service_return", defective ? "returned_defective" : "returned_unused", idempotencyKey, 1);
}

async function servicePartMovement(session: AdminSession, partId: string, movementType: Prisma.InventoryMovementCreateInput["movement_type"], status: string, key: string, sign: 1 | -1) {
  return prisma.$transaction(async (tx) => {
    const part = await tx.servicePartUsage.findUnique({ where: { id: partId }, include: { ticket: true } });
    if (!part) throw new Error("Service part request was not found.");
    if ((movementType === "service_issue" && part.issue_key) || (movementType === "service_return" && part.return_key) || (movementType === "service_reservation" && part.reservation_key)) return part;
    await postInventoryMovement(tx, {
      productId: part.product_id,
      locationId: part.location_id,
      quantity: Number(part.quantity) * sign,
      movementType: movementType as never,
      sourceDocumentType: "ServicePartUsage",
      sourceDocumentId: part.id,
      sourceLineId: part.id,
      reference: part.ticket.ticket_number,
      reason: `Service part ${status.replace("_", " ")}`,
      userId: session.userId,
      branch: session.role,
      correlationId: key
    });
    const data: Prisma.ServicePartUsageUpdateInput = { status: status as never };
    if (movementType === "service_reservation") data.reservation_key = key;
    if (movementType === "service_issue") data.issue_key = key;
    if (movementType === "service_return") data.return_key = key;
    const updated = await tx.servicePartUsage.update({ where: { id: part.id }, data });
    await recordAudit(tx, { userId: session.userId, entity: "ServicePartUsage", entityId: part.id, action: `service.part.${status}`, after: { correlation_id: key } });
    return updated;
  });
}

export async function createInternalNotification(tx: Tx, recipientId: string | null, title: string, body: string, targetType: string, targetId: string | null, key: string) {
  return tx.internalNotification.upsert({
    where: { notification_key: key },
    update: {},
    create: { recipient_id: recipientId, notification_key: key, title, body, target_type: targetType, target_id: targetId }
  });
}
