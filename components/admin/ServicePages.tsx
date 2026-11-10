import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";
import {
  assignServiceTicketAction,
  completeInstallationAction,
  createContractAction,
  createInstallationAction,
  createLoanUnitAction,
  createMaintenancePlanAction,
  createMpsAgreementAction,
  createServiceDocumentAction,
  createServiceTicketAction,
  createWarrantyClaimAction,
  generateMaintenanceOccurrenceAction,
  issueLoanUnitAction,
  issueServicePartAction,
  recordMeterReadingAction,
  recordWorkLogAction,
  registerEquipmentAction,
  requestServicePartAction,
  reserveServicePartAction,
  returnLoanUnitAction,
  returnServicePartAction,
  transitionServiceTicketAction
} from "@/app/admin/service/actions";

export async function ServiceDashboard() {
  await requirePermission("service.view");
  const [tickets, installations, plans, warranties, contracts, readings, loans, recent] = await Promise.all([
    prisma.serviceTicket.findMany({ include: { customer: true, equipment: true, assigned_to: true }, orderBy: { updated_at: "desc" }, take: 25 }),
    prisma.serviceInstallation.findMany({ include: { customer: true, equipment: true }, orderBy: { scheduled_at: "asc" }, take: 25 }),
    prisma.maintenancePlan.findMany({ include: { customer: true, equipment: true }, orderBy: { next_due_date: "asc" }, take: 25 }),
    prisma.equipmentWarranty.findMany({ include: { customer: true, equipment: true }, orderBy: { end_date: "asc" }, take: 25 }),
    prisma.customerContract.findMany({ include: { customer: true }, orderBy: { end_date: "asc" }, take: 25 }),
    prisma.meterReading.findMany({ include: { customer: true, equipment: true }, orderBy: { reading_at: "desc" }, take: 25 }),
    prisma.serviceLoanUnit.findMany({ include: { customer: true, ticket: true }, orderBy: { updated_at: "desc" }, take: 25 }),
    prisma.auditLog.findMany({ where: { action: { startsWith: "service." } }, orderBy: { created_at: "desc" }, take: 12 })
  ]);
  const now = Date.now();
  return <PageShell eyebrow="Service" title="Service Operations" subtitle="Equipment, repairs, SLA, maintenance, contracts, meters and loan-unit work connected to customers, inventory and billing.">
    <Kpis items={[
      ["Open tickets", tickets.filter((ticket) => !["closed", "cancelled"].includes(ticket.status)).length],
      ["Unassigned", tickets.filter((ticket) => !ticket.assigned_to_id).length],
      ["SLA breaches", tickets.filter((ticket) => ticket.resolution_due_at && ticket.resolution_due_at.getTime() < now && !["resolved", "closed", "cancelled"].includes(ticket.status)).length],
      ["Loan units issued", loans.filter((loan) => loan.status === "issued").length],
      ["Installations scheduled", installations.filter((item) => item.status === "scheduled").length],
      ["Maintenance due", plans.filter((plan) => plan.next_due_date && plan.next_due_date.getTime() < now).length],
      ["Warranties expiring", warranties.filter((warranty) => warranty.end_date && warranty.end_date.getTime() < now + 30 * 24 * 60 * 60 * 1000).length],
      ["Contracts expiring", contracts.filter((contract) => contract.end_date && contract.end_date.getTime() < now + 60 * 24 * 60 * 60 * 1000).length],
      ["Meter readings", readings.length]
    ]} />
    <QuickLinks />
    <Table columns={["Recent activity", "Target", "When"]} rows={recent.map((event) => [event.action, `${event.entity} ${event.entity_id.slice(0, 8)}`, date(event.created_at)])} empty="No service activity yet." />
    <Table columns={["Operational queue", "Customer", "Status", "Due / update", "Open"]} rows={[
      ...tickets.slice(0, 8).map((ticket) => [ticket.ticket_number, ticket.customer.name, <Badge key={ticket.id} value={ticket.status} />, ticket.resolution_due_at ? dateTime(ticket.resolution_due_at) : date(ticket.updated_at), <Link key="a" href={`/admin/service/tickets/${ticket.id}`}>Open</Link>]),
      ...installations.slice(0, 4).map((item) => [item.installation_number, item.customer.name, <Badge key={item.id} value={item.status} />, item.scheduled_at ? dateTime(item.scheduled_at) : "-", <Link key="a" href={`/admin/service/installations/${item.id}`}>Open</Link>]),
      ...plans.slice(0, 4).map((plan) => [plan.plan_number, plan.customer.name, <Badge key={plan.id} value={plan.is_active ? "active" : "inactive"} />, plan.next_due_date ? date(plan.next_due_date) : "-", <Link key="a" href={`/admin/service/maintenance/${plan.id}`}>Open</Link>])
    ]} empty="No operational service queue." />
  </PageShell>;
}

export async function EquipmentPage({ id, form = false }: { id?: string; form?: boolean }) {
  await requirePermission(form ? "service.equipment.create" : "service.equipment.view");
  const [customers, products, serials] = await Promise.all([
    prisma.customer.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 200 }),
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 200 }),
    prisma.serialNumber.findMany({ where: { status: "available" }, include: { product: true }, orderBy: { serial_number: "asc" }, take: 200 })
  ]);
  if (form) return <PageShell eyebrow="Customer Equipment" title="Register Equipment" subtitle="Use confirmed customer, product and serial references; external equipment is allowed without fabricated serials."><EquipmentForm customers={customers} products={products} serials={serials} /></PageShell>;
  const equipment = await prisma.customerEquipment.findMany({ where: id ? { id } : { archived_at: null }, include: { customer: true, product: true, serial_number: true, tickets: true, warranties: true, contract_coverages: { include: { contract: true } }, meter_readings: true, documents: true }, orderBy: { updated_at: "desc" }, take: 100 });
  const selected = id ? equipment[0] : null;
  return <PageShell eyebrow="Customer Equipment" title={selected?.equipment_number ?? "Customer Equipment"} subtitle="Installed, supported, loaned, leased and external customer equipment." action={<Link className="ceter-admin-primary-button" href="/admin/customer-equipment/new">Register equipment</Link>}>
    <Kpis items={[["Equipment", equipment.length], ["Under repair", equipment.filter((item) => item.status === "under_repair").length], ["Metered", equipment.filter((item) => item.meter_required).length], ["With contracts", equipment.filter((item) => item.contract_coverages.length).length]]} />
    <FilterBar placeholder="Search equipment, customer, model or serial..." />
    <Table columns={["Equipment", "Customer", "Product / model", "Serial", "Warranty", "Contract", "Status", "Open"]} rows={equipment.map((item) => [<Cell key="e" title={item.equipment_number} note={item.asset_tag ?? item.site_label ?? "No site tag"} />, item.customer.name, item.product?.name ?? item.model_name ?? "External equipment", item.serial_number?.serial_number ?? item.external_serial ?? "Not supplied", item.warranties[0]?.status ?? "unconfirmed", item.contract_coverages[0]?.contract.contract_number ?? "None", <Badge key={item.id} value={item.status} />, <Link key="a" href={`/admin/customer-equipment/${item.id}`}>Open</Link>])} empty="No customer equipment registered." />
  </PageShell>;
}

export async function TicketsPage({ id, form = false }: { id?: string; form?: boolean }) {
  await requirePermission(form ? "service.tickets.create" : "service.tickets.view_all");
  const [customers, equipment, technicians, products, locations] = await Promise.all([
    prisma.customer.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 200 }),
    prisma.customerEquipment.findMany({ where: { archived_at: null }, include: { customer: true }, orderBy: { equipment_number: "asc" }, take: 200 }),
    prisma.profile.findMany({ where: { role: { in: ["admin", "manager", "store"] } }, orderBy: { full_name: "asc" }, take: 50 }),
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 200 }),
    prisma.inventoryLocation.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 50 })
  ]);
  if (form) return <PageShell eyebrow="Service Tickets" title="New Service Ticket" subtitle="Ticket creation snapshots SLA targets on the server."><TicketForm customers={customers} equipment={equipment} /></PageShell>;
  const tickets = await prisma.serviceTicket.findMany({ where: id ? { id } : undefined, include: { customer: true, equipment: true, assigned_to: true, contract: true, warranty: true, parts: { include: { product: true, location: true } }, work_logs: true, status_history: true, documents: true }, orderBy: { updated_at: "desc" }, take: 100 });
  return <PageShell eyebrow="Service Tickets" title={id ? tickets[0]?.ticket_number ?? "Ticket Detail" : "Tickets and Repairs"} subtitle="Repair workflow with assignment, SLA, parts, work logs, documents and audit history." action={<Link className="ceter-admin-primary-button" href="/admin/service/tickets/new">New ticket</Link>}>
    <Kpis items={[["Open", tickets.filter((ticket) => !["closed", "cancelled"].includes(ticket.status)).length], ["Waiting parts", tickets.filter((ticket) => ticket.status === "waiting_for_parts").length], ["Work logs", tickets.reduce((sum, ticket) => sum + ticket.work_logs.length, 0)], ["Parts", tickets.reduce((sum, ticket) => sum + ticket.parts.length, 0)]]} />
    <FilterBar placeholder="Search ticket, customer, equipment or technician..." />
    <Table columns={["Ticket", "Customer", "Equipment", "Priority", "SLA deadline", "Technician", "Status", "Open"]} rows={tickets.map((ticket) => [ticket.ticket_number, ticket.customer.name, ticket.equipment?.equipment_number ?? "Unlinked", <Badge key="p" value={ticket.priority} />, ticket.resolution_due_at ? dateTime(ticket.resolution_due_at) : "-", ticket.assigned_to?.full_name ?? "Unassigned", <Badge key={ticket.id} value={ticket.status} />, <Link key="a" href={`/admin/service/tickets/${ticket.id}`}>Open</Link>])} empty="No service tickets found." />
    {id && tickets[0] ? <TicketWorkflow ticket={tickets[0]} technicians={technicians} products={products} locations={locations} /> : null}
  </PageShell>;
}

export async function InstallationsPage({ id, form = false }: { id?: string; form?: boolean }) {
  await requirePermission(form ? "service.installations.create" : "service.installations.view");
  const [customers, equipment] = await Promise.all([prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200 }), prisma.customerEquipment.findMany({ include: { customer: true }, orderBy: { equipment_number: "asc" }, take: 200 })]);
  if (form) return <PageShell eyebrow="Installations" title="Schedule Installation" subtitle="Installation is explicit and not inferred from delivery or payment."><InstallationForm customers={customers} equipment={equipment} /></PageShell>;
  const installations = await prisma.serviceInstallation.findMany({ where: id ? { id } : undefined, include: { customer: true, equipment: true, order: true, delivery: true, documents: true }, orderBy: { scheduled_at: "asc" }, take: 100 });
  return <Records eyebrow="Service" title={id ? installations[0]?.installation_number ?? "Installation Detail" : "Installations and Commissioning"} rows={installations.map((item) => [item.installation_number, item.customer.name, item.equipment.equipment_number, item.scheduled_at ? dateTime(item.scheduled_at) : "-", <Badge key={item.id} value={item.status} />, item.documents.length, <Link key="a" href={`/admin/service/installations/${item.id}`}>Open</Link>])} columns={["Installation", "Customer", "Equipment", "Scheduled", "Status", "Documents", "Open"]} action={<Link className="ceter-admin-primary-button" href="/admin/service/installations/new">Schedule</Link>} extra={id && installations[0] ? <CompleteInstallation id={installations[0].id} /> : null} />;
}

export async function MaintenancePage({ id, form = false }: { id?: string; form?: boolean }) {
  await requirePermission(form ? "service.maintenance.plans.create" : "service.maintenance.view");
  const [customers, equipment, contracts] = await Promise.all([prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200 }), prisma.customerEquipment.findMany({ include: { customer: true }, take: 200 }), prisma.customerContract.findMany({ include: { customer: true }, take: 200 })]);
  if (form) return <PageShell eyebrow="Maintenance" title="Create Maintenance Plan" subtitle="Occurrence generation is idempotent by plan and due date."><MaintenanceForm customers={customers} equipment={equipment} contracts={contracts} /></PageShell>;
  const plans = await prisma.maintenancePlan.findMany({ where: id ? { id } : undefined, include: { customer: true, equipment: true, contract: true, occurrences: true }, orderBy: { next_due_date: "asc" }, take: 100 });
  return <Records eyebrow="Service" title={id ? plans[0]?.plan_number ?? "Maintenance Detail" : "Preventive Maintenance"} rows={plans.map((plan) => [plan.plan_number, plan.customer.name, plan.equipment?.equipment_number ?? "Multiple / unassigned", plan.frequency, plan.next_due_date ? date(plan.next_due_date) : "-", plan.occurrences.length, <Badge key={plan.id} value={plan.is_active ? "active" : "inactive"} />, <Link key="a" href={`/admin/service/maintenance/${plan.id}`}>Open</Link>])} columns={["Plan", "Customer", "Equipment", "Frequency", "Next due", "Visits", "Status", "Open"]} action={<Link className="ceter-admin-primary-button" href="/admin/service/maintenance/new">New plan</Link>} extra={id && plans[0] ? <GenerateOccurrence plan={plans[0]} /> : null} />;
}

export async function WarrantyPage({ claims = false, id, form = false }: { claims?: boolean; id?: string; form?: boolean }) {
  await requirePermission(claims ? "service.warranties.view" : "service.warranties.view");
  const warranties = await prisma.equipmentWarranty.findMany({ include: { customer: true, equipment: true, claims: true }, orderBy: { end_date: "asc" }, take: 100 });
  if (form) return <PageShell eyebrow="Warranty Claims" title="New Warranty Claim" subtitle="Eligibility is calculated from the stored warranty record and can be overridden only by permissioned action."><WarrantyClaimForm warranties={warranties} /></PageShell>;
  if (claims) {
    const claimRows = await prisma.warrantyClaim.findMany({ where: id ? { id } : undefined, include: { customer: true, equipment: true, warranty: true, documents: true }, orderBy: { created_at: "desc" }, take: 100 });
    return <Records eyebrow="Service" title={id ? claimRows[0]?.claim_number ?? "Warranty Claim" : "Warranty Claims"} rows={claimRows.map((claim) => [claim.claim_number, claim.customer.name, claim.equipment.equipment_number, claim.warranty.warranty_number, <Badge key={claim.id} value={claim.status} />, claim.documents.length, <Link key="a" href={`/admin/service/warranties/claims/${claim.id}`}>Open</Link>])} columns={["Claim", "Customer", "Equipment", "Warranty", "Status", "Documents", "Open"]} action={<Link className="ceter-admin-primary-button" href="/admin/service/warranties/claims/new">New claim</Link>} />;
  }
  return <Records eyebrow="Service" title={id ? warranties.find((item) => item.id === id)?.warranty_number ?? "Warranty Detail" : "Equipment Warranties"} rows={warranties.map((warranty) => [warranty.warranty_number, warranty.customer.name, warranty.equipment.equipment_number, warranty.provider ?? "Unconfirmed", warranty.end_date ? date(warranty.end_date) : "Unconfirmed", warranty.claims.length, <Badge key={warranty.id} value={warranty.status} />, <Link key="a" href={`/admin/service/warranties/${warranty.id}`}>Open</Link>])} columns={["Warranty", "Customer", "Equipment", "Provider", "Ends", "Claims", "Status", "Open"]} />;
}

export async function ContractsPage({ id, form = false, serviceView = false }: { id?: string; form?: boolean; serviceView?: boolean }) {
  await requirePermission(form ? "service.contracts.create" : "service.contracts.view");
  const customers = await prisma.customer.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 200 });
  if (form) return <PageShell eyebrow="Contracts" title="New Customer Contract" subtitle="Contracts are versioned authority for maintenance, consumables, MPS and SLA entitlements."><ContractForm customers={customers} /></PageShell>;
  const contracts = await prisma.customerContract.findMany({ where: id ? { id } : serviceView ? { contract_type: { in: ["maintenance", "consumables", "managed_print_services", "service_level_agreement", "mixed_service_contract"] } } : undefined, include: { customer: true, equipment_coverages: true, tickets: true, mps_agreements: true, documents: true }, orderBy: { end_date: "asc" }, take: 100 });
  return <Records eyebrow="Contracts" title={id ? contracts[0]?.contract_number ?? "Contract Detail" : serviceView ? "Service Contracts" : "Customer Contracts"} rows={contracts.map((contract) => [contract.contract_number, contract.customer.name, label(contract.contract_type), contract.version, contract.end_date ? date(contract.end_date) : "-", contract.equipment_coverages.length, contract.mps_agreements.length, <Badge key={contract.id} value={contract.status} />, <Link key="a" href={`/admin/contracts/${contract.id}`}>Open</Link>])} columns={["Contract", "Customer", "Type", "Version", "Ends", "Equipment", "MPS", "Status", "Open"]} action={<Link className="ceter-admin-primary-button" href="/admin/contracts/new">New contract</Link>} />;
}

export async function MpsPage({ id }: { id?: string }) {
  await requirePermission("service.mps.view");
  const [agreements, customers, contracts, products] = await Promise.all([
    prisma.mpsAgreement.findMany({ where: id ? { id } : undefined, include: { customer: true, contract: true, meter_readings: true, billing_cycles: true }, orderBy: { next_reading_due: "asc" }, take: 100 }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.customerContract.findMany({ where: { contract_type: "managed_print_services" }, include: { customer: true }, take: 100 }),
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 100 })
  ]);
  return <PageShell eyebrow="Managed Print Services" title={id ? agreements[0]?.agreement_number ?? "MPS Agreement" : "MPS Agreements"} subtitle="Metered service agreements use customer contracts and billing, with remote readings disabled until configured.">
    <Kpis items={[["Agreements", agreements.length], ["Readings due", agreements.filter((item) => item.next_reading_due && item.next_reading_due < new Date()).length], ["Billing cycles", agreements.reduce((sum, item) => sum + item.billing_cycles.length, 0)], ["Remote meters", "Disabled"]]} />
    <MpsForm customers={customers} contracts={contracts} products={products} />
    <Table columns={["Agreement", "Customer", "Contract", "Reading due", "Billing", "Status", "Open"]} rows={agreements.map((agreement) => [agreement.agreement_number, agreement.customer.name, agreement.contract.contract_number, agreement.next_reading_due ? date(agreement.next_reading_due) : "-", agreement.next_billing_period ?? "Not set", <Badge key={agreement.id} value={agreement.status} />, <Link key="a" href={`/admin/service/mps/${agreement.id}`}>Open</Link>])} empty="No MPS agreements." />
  </PageShell>;
}

export async function MeterReadingsPage({ id, form = false }: { id?: string; form?: boolean }) {
  await requirePermission(form ? "service.meter_readings.record" : "service.mps.view");
  const equipment = await prisma.customerEquipment.findMany({ include: { customer: true }, orderBy: { equipment_number: "asc" }, take: 200 });
  if (form) return <PageShell eyebrow="Meter Readings" title="Record Meter Reading" subtitle="Usage is calculated server-side from previous accepted readings."><MeterForm equipment={equipment} /></PageShell>;
  const readings = await prisma.meterReading.findMany({ where: id ? { id } : undefined, include: { customer: true, equipment: true, mps_agreement: true }, orderBy: { reading_at: "desc" }, take: 100 });
  return <Records eyebrow="Service" title={id ? readings[0]?.reading_number ?? "Meter Reading" : "Meter Readings"} rows={readings.map((reading) => [reading.reading_number, reading.customer.name, reading.equipment.equipment_number, label(reading.counter_type), reading.reading_value, reading.calculated_usage ?? "-", <Badge key={reading.id} value={reading.validation_status} />, <Link key="a" href={`/admin/service/meter-readings/${reading.id}`}>Open</Link>])} columns={["Reading", "Customer", "Equipment", "Counter", "Value", "Usage", "Validation", "Open"]} action={<Link className="ceter-admin-primary-button" href="/admin/service/meter-readings/new">Record reading</Link>} />;
}

export async function LoanUnitsPage({ id, form = false }: { id?: string; form?: boolean }) {
  await requirePermission(form ? "service.loan_units.reserve" : "service.loan_units.view");
  const [products, equipment, locations, customers, tickets] = await Promise.all([
    prisma.product.findMany({ where: { archived_at: null }, take: 200 }),
    prisma.customerEquipment.findMany({ include: { customer: true }, take: 200 }),
    prisma.inventoryLocation.findMany({ where: { archived_at: null }, take: 50 }),
    prisma.customer.findMany({ where: { archived_at: null }, take: 200 }),
    prisma.serviceTicket.findMany({ where: { status: { notIn: ["closed", "cancelled"] } }, include: { customer: true }, take: 100 })
  ]);
  if (form) return <PageShell eyebrow="Loan Units" title="Register Loan Unit" subtitle="Ceter-owned loan units keep custody and stock effects explicit."><LoanForm products={products} equipment={equipment} locations={locations} /></PageShell>;
  const loans = await prisma.serviceLoanUnit.findMany({ where: id ? { id } : undefined, include: { product: true, equipment: true, customer: true, ticket: true, documents: true }, orderBy: { updated_at: "desc" }, take: 100 });
  return <PageShell eyebrow="Service" title={id ? loans[0]?.loan_unit_number ?? "Loan Unit" : "Loan Units"} subtitle="Loan-unit issue and return use controlled custody records and inventory movements.">
    <Kpis items={[["Loan units", loans.length], ["Available", loans.filter((loan) => loan.status === "available").length], ["Issued", loans.filter((loan) => loan.status === "issued").length], ["Overdue", loans.filter((loan) => loan.expected_return_date && loan.expected_return_date < new Date() && loan.status === "issued").length]]} />
    <LoanIssueForm loans={loans} customers={customers} tickets={tickets} />
    <Table columns={["Loan unit", "Product / equipment", "Customer", "Ticket", "Expected return", "Status", "Actions"]} rows={loans.map((loan) => [loan.loan_unit_number, loan.product?.name ?? loan.equipment?.equipment_number ?? "Unlinked", loan.customer?.name ?? "In stock", loan.ticket?.ticket_number ?? "-", loan.expected_return_date ? date(loan.expected_return_date) : "-", <Badge key={loan.id} value={loan.status} />, <LoanActions key="a" loan={loan} />])} empty="No loan units registered." />
  </PageShell>;
}

export async function ServiceReportsPage({ id }: { id?: string }) {
  await requirePermission("service.documents.view");
  const docs = await prisma.document.findMany({
    where: id ? { id } : { OR: [{ service_ticket_id: { not: null } }, { equipment_id: { not: null } }, { customer_contract_id: { not: null } }, { installation_id: { not: null } }, { maintenance_occurrence_id: { not: null } }, { loan_unit_id: { not: null } }, { meter_reading_id: { not: null } }] },
    include: { customer: true, equipment: true, service_ticket: true, customer_contract: true },
    orderBy: { created_at: "desc" },
    take: 100
  });
  return <PageShell eyebrow="Service Documents" title={id ? docs[0]?.document_number ?? "Service Document" : "Service Reports and Documents"} subtitle="Drafts and final issued service documents use the document trust lifecycle.">
    <DocumentForm />
    <Table columns={["Document", "Title", "Related", "Customer", "Lifecycle", "Signature", "Verification", "Open"]} rows={docs.map((doc) => [doc.document_number ?? "-", doc.title, doc.service_ticket?.ticket_number ?? doc.equipment?.equipment_number ?? doc.customer_contract?.contract_number ?? "-", doc.customer?.name ?? "-", <Badge key={`${doc.id}l`} value={doc.lifecycle_status} />, <Badge key={`${doc.id}s`} value={doc.signature_status} />, <Badge key={`${doc.id}v`} value={doc.verification_status} />, <Link key="a" href={`/admin/service/reports/${doc.id}`}>Open</Link>])} empty="No service documents generated." />
  </PageShell>;
}

function EquipmentForm({ customers, products, serials }: { customers: Array<{ id: string; name: string }>; products: Array<{ id: string; name: string }>; serials: Array<{ id: string; serial_number: string; product: { name: string } }> }) {
  return <Form action={registerEquipmentAction}><Select name="customer_id" labelText="Customer *" items={customers} /><Select name="product_id" labelText="Matched product" items={products} optional /><Select name="serial_number_id" labelText="Inventory serial" items={serials.map((serial) => ({ id: serial.id, name: `${serial.product.name} - ${serial.serial_number}` }))} optional /><label>Brand<input name="brand_name" /></label><label>Model *<input name="model_name" required /></label><label>External serial<input name="external_serial" /></label><label>Ownership<select name="ownership_type"><option value="customer_owned">Customer-owned</option><option value="ceter_owned">Ceter-owned</option><option value="loan_unit">Loan unit</option><option value="leased_managed">Leased or managed</option></select></label><label>Site<input name="site_label" /></label><label>Department<input name="department" /></label><label>Site contact<input name="site_contact" /></label><label>Condition<input name="condition" /></label><ToggleSwitch name="meter_required" label="Meter readings required" /><label className="wide">Notes<textarea name="notes" /></label><Actions href="/admin/customer-equipment" labelText="Save equipment" /></Form>;
}

function TicketForm({ customers, equipment }: { customers: Array<{ id: string; name: string }>; equipment: Array<{ id: string; equipment_number: string; customer: { name: string } }> }) {
  return <Form action={createServiceTicketAction}><Select name="customer_id" labelText="Customer *" items={customers} /><Select name="equipment_id" labelText="Equipment" items={equipment.map((item) => ({ id: item.id, name: `${item.equipment_number} - ${item.customer.name}` }))} optional /><label>Priority<select name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label>Category<input name="category" /></label><label className="wide">Reported issue *<textarea name="reported_issue" required /></label><label className="wide">Customer-facing notes<textarea name="customer_notes" /></label><label className="wide">Private internal notes<textarea name="private_notes" /></label><Actions href="/admin/service/tickets" labelText="Create ticket" /></Form>;
}

function TicketWorkflow({ ticket, technicians, products, locations }: { ticket: { id: string; ticket_number: string; parts: Array<{ id: string; product: { name: string }; status: string; quantity: Prisma.Decimal }>; work_logs: unknown[] }; technicians: Array<{ id: string; full_name: string | null; email: string | null }>; products: Array<{ id: string; name: string }>; locations: Array<{ id: string; name: string }> }) {
  return <section className="ceter-admin-grid two"><article className="ceter-admin-panel ceter-admin-form-panel"><h2>Assign / transition</h2><Form action={assignServiceTicketAction}><input type="hidden" name="ticket_id" value={ticket.id} /><Select name="technician_id" labelText="Technician" items={technicians.map((tech) => ({ id: tech.id, name: tech.full_name ?? tech.email ?? tech.id.slice(0, 8) }))} /><label>Reason<input name="reason" required defaultValue="Assigned from service desk" /></label><button className="ceter-admin-secondary-button">Assign</button></Form><Form action={transitionServiceTicketAction}><input type="hidden" name="ticket_id" value={ticket.id} /><label>Status<select name="status"><option value="triaged">Triaged</option><option value="scheduled">Scheduled</option><option value="in_progress">In progress</option><option value="waiting_for_parts">Waiting for parts</option><option value="waiting_for_customer">Waiting for customer</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="reopened">Reopened</option><option value="cancelled">Cancelled</option></select></label><label>Reason<input name="reason" /></label><button className="ceter-admin-secondary-button">Update status</button></Form></article><article className="ceter-admin-panel ceter-admin-form-panel"><h2>Work and parts</h2><Form action={recordWorkLogAction}><input type="hidden" name="ticket_id" value={ticket.id} /><input type="hidden" name="correlation_id" value={`work-${ticket.id}`} /><label>Start<input type="datetime-local" name="work_started_at" required /></label><label>End<input type="datetime-local" name="work_ended_at" required /></label><label className="wide">Work performed<textarea name="work_performed" required /></label><button className="ceter-admin-secondary-button">Record work</button></Form><Form action={requestServicePartAction}><input type="hidden" name="ticket_id" value={ticket.id} /><Select name="product_id" labelText="Part" items={products} /><Select name="location_id" labelText="Location" items={locations} /><label>Quantity<input name="quantity" type="number" min="1" defaultValue="1" /></label><ToggleSwitch name="chargeable" label="Chargeable" /><button className="ceter-admin-secondary-button">Request part</button></Form></article><Table columns={["Part", "Qty", "Status", "Actions"]} rows={ticket.parts.map((part) => [part.product.name, Number(part.quantity), <Badge key={part.id} value={part.status} />, <PartActions key="a" partId={part.id} />])} empty="No parts requested." /></section>;
}

function PartActions({ partId }: { partId: string }) {
  return <AdminActionMenu label={`Actions for part ${partId}`}><MiniForm action={reserveServicePartAction} fields={{ part_id: partId, correlation_id: `reserve-${partId}` }} labelText="Reserve" /><MiniForm action={issueServicePartAction} fields={{ part_id: partId, correlation_id: `issue-${partId}` }} labelText="Issue" /><MiniForm action={returnServicePartAction} fields={{ part_id: partId, correlation_id: `return-${partId}` }} labelText="Return" /></AdminActionMenu>;
}

function InstallationForm({ customers, equipment }: { customers: Array<{ id: string; name: string }>; equipment: Array<{ id: string; equipment_number: string; customer: { name: string } }> }) {
  return <Form action={createInstallationAction}><Select name="customer_id" labelText="Customer *" items={customers} /><Select name="equipment_id" labelText="Equipment *" items={equipment.map((item) => ({ id: item.id, name: `${item.equipment_number} - ${item.customer.name}` }))} /><label>Scheduled<input name="scheduled_at" type="datetime-local" /></label><label>Site<input name="site_label" /></label><label>Site contact<input name="site_contact" /></label><Actions href="/admin/service/installations" labelText="Schedule installation" /></Form>;
}

function CompleteInstallation({ id }: { id: string }) {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><h2>Completion</h2><Form action={completeInstallationAction}><input type="hidden" name="installation_id" value={id} /><label className="wide">Completion notes<textarea name="notes" /></label><button className="ceter-admin-secondary-button">Complete installation</button></Form></article>;
}

function MaintenanceForm({ customers, equipment, contracts }: { customers: Array<{ id: string; name: string }>; equipment: Array<{ id: string; equipment_number: string; customer: { name: string } }>; contracts: Array<{ id: string; contract_number: string; customer: { name: string } }> }) {
  return <Form action={createMaintenancePlanAction}><Select name="customer_id" labelText="Customer *" items={customers} /><Select name="contract_id" labelText="Contract" items={contracts.map((item) => ({ id: item.id, name: `${item.contract_number} - ${item.customer.name}` }))} optional /><Select name="equipment_id" labelText="Equipment" items={equipment.map((item) => ({ id: item.id, name: `${item.equipment_number} - ${item.customer.name}` }))} optional /><label>Maintenance type *<input name="maintenance_type" required /></label><label>Frequency<select name="frequency"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semi_annually">Semi annually</option><option value="annually">Annually</option></select></label><label>Start date *<input name="start_date" type="date" required /></label><label>Next due<input name="next_due_date" type="date" /></label><Actions href="/admin/service/maintenance" labelText="Create plan" /></Form>;
}

function GenerateOccurrence({ plan }: { plan: { id: string; next_due_date: Date | null } }) {
  const due = plan.next_due_date ? plan.next_due_date.toISOString().slice(0, 10) : "";
  return <article className="ceter-admin-panel ceter-admin-form-panel"><h2>Schedule visit</h2><Form action={generateMaintenanceOccurrenceAction}><input type="hidden" name="plan_id" value={plan.id} /><input type="hidden" name="correlation_id" value={`pm-${plan.id}-${due}`} /><label>Due date<input name="due_date" type="date" required defaultValue={due} /></label><button className="ceter-admin-secondary-button">Generate occurrence</button></Form></article>;
}

function WarrantyClaimForm({ warranties }: { warranties: Array<{ id: string; warranty_number: string; customer: { name: string }; equipment: { equipment_number: string } }> }) {
  return <Form action={createWarrantyClaimAction}><Select name="warranty_id" labelText="Warranty *" items={warranties.map((item) => ({ id: item.id, name: `${item.warranty_number} - ${item.customer.name} - ${item.equipment.equipment_number}` }))} /><label className="wide">Reported fault *<textarea name="reported_fault" required /></label><Actions href="/admin/service/warranties/claims" labelText="Create claim" /></Form>;
}

function ContractForm({ customers }: { customers: Array<{ id: string; name: string }> }) {
  return <Form action={createContractAction}><Select name="customer_id" labelText="Customer *" items={customers} /><label>Type<select name="contract_type"><option value="maintenance">Maintenance</option><option value="consumables">Consumables</option><option value="managed_print_services">Managed Print Services</option><option value="service_level_agreement">SLA</option><option value="mixed_service_contract">Mixed service contract</option></select></label><label>Start date<input name="start_date" type="date" /></label><label>End date<input name="end_date" type="date" /></label><label>Renewal date<input name="renewal_date" type="date" /></label><label>Response minutes<input name="response_minutes" type="number" /></label><label>Resolution minutes<input name="resolution_minutes" type="number" /></label><label>Monthly charge KES<input name="monthly_kes" type="number" min="0" /></label><label>Billing schedule<input name="billing_schedule" /></label><label className="wide">Payment terms<textarea name="payment_terms" /></label><Actions href="/admin/contracts" labelText="Create contract" /></Form>;
}

function MpsForm({ customers, contracts, products }: { customers: Array<{ id: string; name: string }>; contracts: Array<{ id: string; contract_number: string; customer: { name: string } }>; products: Array<{ id: string; name: string }> }) {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><h2>New MPS agreement</h2><Form action={createMpsAgreementAction}><Select name="customer_id" labelText="Customer" items={customers} /><Select name="contract_id" labelText="MPS contract" items={contracts.map((item) => ({ id: item.id, name: `${item.contract_number} - ${item.customer.name}` }))} /><Select name="product_id" labelText="Billing product" items={products} optional /><label>Reading frequency<input name="reading_frequency" placeholder="monthly" /></label><label>Billing frequency<input name="billing_frequency" placeholder="monthly" /></label><label>Included mono<input name="included_mono" type="number" min="0" /></label><label>Included colour<input name="included_colour" type="number" min="0" /></label><label>Mono overage KES<input name="mono_rate_kes" type="number" min="0" /></label><label>Colour overage KES<input name="colour_rate_kes" type="number" min="0" /></label><button className="ceter-admin-secondary-button">Create MPS</button></Form></article>;
}

function MeterForm({ equipment }: { equipment: Array<{ id: string; equipment_number: string; customer: { name: string } }> }) {
  return <Form action={recordMeterReadingAction}><Select name="equipment_id" labelText="Equipment *" items={equipment.map((item) => ({ id: item.id, name: `${item.equipment_number} - ${item.customer.name}` }))} /><label>Counter<select name="counter_type"><option value="total">Total</option><option value="mono">Mono</option><option value="colour">Colour</option><option value="scans">Scans</option></select></label><label>Reading value *<input name="reading_value" type="number" min="0" required /></label><label>Reading time<input name="reading_at" type="datetime-local" /></label><label>Evidence path<input name="evidence_path" /></label><Actions href="/admin/service/meter-readings" labelText="Record reading" /></Form>;
}

function LoanForm({ products, equipment, locations }: { products: Array<{ id: string; name: string }>; equipment: Array<{ id: string; equipment_number: string; customer: { name: string } }>; locations: Array<{ id: string; name: string }> }) {
  return <Form action={createLoanUnitAction}><Select name="product_id" labelText="Product" items={products} optional /><Select name="equipment_id" labelText="Equipment record" items={equipment.map((item) => ({ id: item.id, name: `${item.equipment_number} - ${item.customer.name}` }))} optional /><Select name="current_location_id" labelText="Stock location" items={locations} optional /><label>Condition<input name="condition" /></label><Actions href="/admin/service/loan-units" labelText="Register loan unit" /></Form>;
}

function LoanIssueForm({ loans, customers, tickets }: { loans: Array<{ id: string; loan_unit_number: string; status: string }>; customers: Array<{ id: string; name: string }>; tickets: Array<{ id: string; ticket_number: string; customer: { name: string } }> }) {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><h2>Issue loan unit</h2><Form action={issueLoanUnitAction}><Select name="loan_unit_id" labelText="Loan unit" items={loans.map((loan) => ({ id: loan.id, name: `${loan.loan_unit_number} - ${label(loan.status)}` }))} /><Select name="customer_id" labelText="Customer" items={customers} /><Select name="ticket_id" labelText="Ticket" items={tickets.map((ticket) => ({ id: ticket.id, name: `${ticket.ticket_number} - ${ticket.customer.name}` }))} optional /><input type="hidden" name="correlation_id" value={`loan-${Date.now()}`} /><label>Expected return<input name="expected_return_date" type="date" /></label><button className="ceter-admin-secondary-button">Issue</button></Form></article>;
}

function LoanActions({ loan }: { loan: { id: string } }) {
  return <MiniForm action={returnLoanUnitAction} fields={{ loan_unit_id: loan.id, condition: "Returned for inspection", correlation_id: `return-loan-${loan.id}` }} labelText="Return" />;
}

function DocumentForm() {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><h2>Generate service document draft</h2><Form action={createServiceDocumentAction}><label className="wide">Title *<input name="title" required placeholder="Service report" /></label><label>Customer ID<input name="customer_id" /></label><label>Equipment ID<input name="equipment_id" /></label><label>Ticket ID<input name="service_ticket_id" /></label><label>Contract ID<input name="customer_contract_id" /></label><button className="ceter-admin-secondary-button">Generate draft</button></Form></article>;
}

function QuickLinks() {
  const links = [["New service ticket", "/admin/service/tickets/new"], ["Register equipment", "/admin/customer-equipment/new"], ["Schedule installation", "/admin/service/installations/new"], ["Create maintenance visit", "/admin/service/maintenance/new"], ["Record meter reading", "/admin/service/meter-readings/new"], ["Issue loan unit", "/admin/service/loan-units"], ["Create contract", "/admin/contracts/new"]];
  return <nav className="ceter-admin-quick-links">{links.map(([labelText, href]) => <Link key={href} href={href}>{labelText}</Link>)}</nav>;
}

function Records({ eyebrow, title, rows, columns, action, extra }: { eyebrow: string; title: string; rows: React.ReactNode[][]; columns: string[]; action?: React.ReactNode; extra?: React.ReactNode }) {
  return <PageShell eyebrow={eyebrow} title={title} subtitle="Dedicated service workflow." action={action}><Kpis items={[["Records", rows.length], ["Open", rows.filter((row) => String(row.at(-2)).toLowerCase().includes("open")).length]]} /><FilterBar placeholder="Search records..." /><Table title={title} columns={columns} rows={rows} empty="No records found." />{extra}</PageShell>;
}

function PageShell({ eyebrow, title, action, children }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="ceter-admin-page"><div className="ceter-admin-greeting"><div><p>{eyebrow}</p><h1>{title}</h1></div>{action}</div>{children}</div>;
}

function Kpis({ items }: { items: Array<[string, React.ReactNode]> }) {
  return <section className="ceter-admin-kpis">{items.map(([labelText, value]) => <article key={labelText} className="ceter-admin-kpi"><span>{labelText}</span><strong>{value}</strong></article>)}</section>;
}

function FilterBar({ placeholder }: { placeholder: string }) {
  return <form className="ceter-admin-filter-bar"><input name="q" placeholder={placeholder} /><select name="status"><option value="">All statuses</option><option value="active">Active</option><option value="open">Open</option><option value="closed">Closed</option></select><input type="date" name="from" /><input type="date" name="to" /><button className="ceter-admin-secondary-button">Search</button></form>;
}

function Table({ title = "Records", columns, rows, empty }: { title?: string; columns: string[]; rows: React.ReactNode[][]; empty: string }) {
  return <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Records</span><h2>{title}</h2></div><a className="ceter-admin-secondary-button" href="/api/admin/exports?kind=reports">Export CSV</a></div><div className="ceter-admin-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}><div className="ceter-admin-empty">{empty}<br /><button className="ceter-admin-secondary-button">Retry</button></div></td></tr>}</tbody></table></div></article>;
}

function Form({ action, children }: { action: (formData: FormData) => void | Promise<void>; children: React.ReactNode }) {
  return <form className="ceter-admin-form" action={action}>{children}</form>;
}

function Select({ name, labelText, items, optional = false }: { name: string; labelText: string; items: Array<{ id: string; name: string }>; optional?: boolean }) {
  return <label>{labelText}<select name={name} required={!optional}>{optional ? <option value="">Not selected</option> : null}{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function Actions({ href, labelText }: { href: string; labelText: string }) {
  return <div className="ceter-admin-form-actions"><Link className="ceter-admin-secondary-button" href={href}>Cancel</Link><button className="ceter-admin-primary-button">{labelText}</button></div>;
}

function MiniForm({ action, fields, labelText }: { action: (formData: FormData) => void | Promise<void>; fields: Record<string, string>; labelText: string }) {
  return <form action={action} className="ceter-admin-inline-form">{Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<button className="ceter-admin-secondary-button">{labelText}</button></form>;
}

function Cell({ title, note }: { title: string; note: string }) {
  return <><strong>{title}</strong><small>{note}</small></>;
}

function Badge({ value }: { value: string }) {
  const tone = /active|complete|resolved|accepted|valid|available/.test(value) ? "green" : /cancel|expired|breach|rejected|damaged|overdue/.test(value) ? "red" : "amber";
  return <span className={`ceter-admin-status ${tone}`}>{label(value)}</span>;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function date(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
