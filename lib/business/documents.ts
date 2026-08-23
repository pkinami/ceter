import type { DocumentType, Prisma } from "@prisma/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const BUSINESS_DOCUMENT_BUCKET = process.env.SUPABASE_BUSINESS_DOCUMENTS_BUCKET || "business-documents";

export type BusinessDocumentInput = {
  type: DocumentType;
  number: string;
  title: string;
  issueDate?: string;
  dueDate?: string | null;
  customerName?: string | null;
  customerCompany?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  lines?: Array<string | {
    description: string;
    sku?: string | null;
    quantity?: number;
    unitPrice?: string;
    discount?: string;
    vat?: string;
    total?: string;
  }>;
  totals?: Array<[string, string]>;
  footer?: string[];
};

export function brandedPdfBytes(input: BusinessDocumentInput) {
  const company = companyProfile();
  const rows = normalizeDocumentRows(input.lines ?? []);
  const pages = paginateRows(rows, 12);
  const pageCount = Math.max(1, pages.length);
  const pageObjects: string[] = [];
  const contentObjects: string[] = [];
  const pageIds: number[] = [];
  const objects: string[] = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "",
    "3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj"
  ];

  for (let index = 0; index < pageCount; index += 1) {
    const pageObjectId = 5 + index * 2;
    const contentObjectId = pageObjectId + 1;
    pageIds.push(pageObjectId);
    const stream = Buffer.from(renderDocumentPage({
      input,
      company,
      rows: pages[index] ?? [],
      pageNumber: index + 1,
      pageCount
    }), "ascii");
    pageObjects.push(`${pageObjectId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >> endobj`);
    contentObjects.push(`${contentObjectId} 0 obj << /Length ${stream.length} >> stream\n${stream.toString("ascii")}\nendstream endobj`);
  }

  objects[1] = `2 0 obj << /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >> endobj`;
  objects.push(...pageObjects.flatMap((page, index) => [page, contentObjects[index]]));
  return buildPdf(objects);
}

export async function uploadBusinessDocument(path: string, bytes: Buffer) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage.from(BUSINESS_DOCUMENT_BUCKET).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
    cacheControl: "3600"
  });
  if (error) throw new Error(`Document upload failed: ${error.message}`);
  return null;
}

export async function signedBusinessDocumentUrl(path: string, bucket = BUSINESS_DOCUMENT_BUCKET) {
  const expiresIn = Math.max(60, Number.parseInt(process.env.BUSINESS_DOCUMENT_SIGNED_URL_SECONDS ?? "300", 10));
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn, { download: true });
  if (error) throw new Error(`Document download link could not be created: ${error.message}`);
  return data.signedUrl;
}

export function documentCreateData(input: {
  document_type: DocumentType;
  title: string;
  storage_path: string;
  public_url?: string | null;
  customer_id?: string | null;
  quote_id?: string | null;
  proforma_invoice_id?: string | null;
  invoice_id?: string | null;
  payment_id?: string | null;
  receipt_id?: string | null;
  expense_id?: string | null;
  supplier_id?: string | null;
  purchase_order_id?: string | null;
  supplier_invoice_id?: string | null;
  tender_id?: string | null;
  company_document_id?: string | null;
  category?: Prisma.DocumentCreateManyInput["category"];
  expiry_date?: Date | null;
  reminder_date?: Date | null;
  notes?: string | null;
  created_by_id?: string | null;
}): Prisma.DocumentCreateManyInput {
  return {
    ...input,
    bucket: BUSINESS_DOCUMENT_BUCKET,
    public_url: input.public_url ?? null
  };
}

function pdfEscape(value: string) {
  return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "");
}

type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxPin: string;
  paymentInstructions: string;
};

type DocumentRow = {
  description: string;
  sku?: string | null;
  quantity: string;
  unitPrice: string;
  discount: string;
  vat: string;
  total: string;
};

function companyProfile(): CompanyProfile {
  return {
    name: process.env.CETER_COMPANY_NAME || "Ceter Technologies Limited",
    address: process.env.CETER_COMPANY_ADDRESS || "Nairobi, Kenya",
    phone: process.env.CETER_COMPANY_PHONE || "+254 700 000 000",
    email: process.env.CETER_COMPANY_EMAIL || "info@cetertechnologies.com",
    website: process.env.CETER_COMPANY_WEBSITE || "www.cetertechnologies.com",
    taxPin: process.env.CETER_COMPANY_TAX_PIN || "Configure tax PIN",
    paymentInstructions: process.env.CETER_DOCUMENT_PAYMENT_INSTRUCTIONS || "Confirm bank or M-Pesa instructions with Ceter Technologies Limited before payment."
  };
}

function normalizeDocumentRows(lines: NonNullable<BusinessDocumentInput["lines"]>): DocumentRow[] {
  return lines.map((line) => {
    if (typeof line === "string") {
      const match = line.match(/^(\d+)\s+x\s+(.+?)\s+@\s+(.+?)\s+=\s+(.+)$/);
      return {
        description: match?.[2] ?? line,
        quantity: match?.[1] ?? "",
        unitPrice: match?.[3] ?? "",
        discount: "KSh 0",
        vat: "KSh 0",
        total: match?.[4] ?? ""
      };
    }
    return {
      description: line.description,
      sku: line.sku,
      quantity: line.quantity ? String(line.quantity) : "",
      unitPrice: line.unitPrice ?? "",
      discount: line.discount ?? "KSh 0",
      vat: line.vat ?? "KSh 0",
      total: line.total ?? ""
    };
  });
}

function paginateRows(rows: DocumentRow[], rowsPerPage: number) {
  if (!rows.length) return [[]];
  const pages: DocumentRow[][] = [];
  for (let index = 0; index < rows.length; index += rowsPerPage) {
    pages.push(rows.slice(index, index + rowsPerPage));
  }
  return pages;
}

function renderDocumentPage({ input, company, rows, pageNumber, pageCount }: {
  input: BusinessDocumentInput;
  company: CompanyProfile;
  rows: DocumentRow[];
  pageNumber: number;
  pageCount: number;
}) {
  const commands: string[] = [];
  const isFirstPage = pageNumber === 1;

  rect(commands, 0, 792, 595, 50, "0.03 0.15 0.22");
  rect(commands, 0, 782, 595, 10, "0.87 0.57 0.18");
  text(commands, "CETER", 42, 802, 24, "F2", "1 1 1");
  text(commands, "TECHNOLOGIES", 42, 790, 8, "F2", "0.87 0.93 0.96");
  text(commands, company.name, 332, 814, 12, "F2", "1 1 1", "right");
  text(commands, `${company.address} | ${company.phone}`, 332, 798, 8, "F1", "0.87 0.93 0.96", "right");
  text(commands, `${company.email} | ${company.website}`, 332, 786, 8, "F1", "0.87 0.93 0.96", "right");

  text(commands, input.title.toUpperCase(), 42, 736, 22, "F2", "0.03 0.15 0.22");
  text(commands, input.number, 42, 715, 11, "F2", "0.30 0.34 0.39");
  pill(commands, documentTypeLabel(input.type), 410, 724, 142, 22);
  infoBlock(commands, "Issue Date", input.issueDate ?? new Date().toLocaleDateString("en-KE"), 410, 690);
  if (input.dueDate) infoBlock(commands, "Due Date", input.dueDate, 410, 655);

  if (isFirstPage) {
    sectionTitle(commands, "Bill To", 42, 665);
    const customerLines = [
      input.customerName,
      input.customerCompany,
      input.customerAddress,
      input.customerEmail,
      input.customerPhone
    ].filter(Boolean) as string[];
    customerLines.slice(0, 6).forEach((line, index) => text(commands, line, 42, 646 - index * 14, index === 0 ? 11 : 9, index === 0 ? "F2" : "F1", "0.13 0.16 0.20"));
  }

  const tableTop = isFirstPage ? 552 : 706;
  rect(commands, 42, tableTop, 511, 26, "0.03 0.15 0.22");
  text(commands, "Description", 54, tableTop + 9, 8, "F2", "1 1 1");
  text(commands, "Qty", 314, tableTop + 9, 8, "F2", "1 1 1");
  text(commands, "Unit", 354, tableTop + 9, 8, "F2", "1 1 1");
  text(commands, "VAT", 424, tableTop + 9, 8, "F2", "1 1 1");
  text(commands, "Total", 503, tableTop + 9, 8, "F2", "1 1 1", "right");

  rows.forEach((row, index) => {
    const y = tableTop - 30 - index * 34;
    if (index % 2 === 0) rect(commands, 42, y - 8, 511, 30, "0.96 0.97 0.98");
    const description = row.sku ? `${row.description} | SKU: ${row.sku}` : row.description;
    wrapText(description, 48).slice(0, 2).forEach((line, lineIndex) => text(commands, line, 54, y + 8 - lineIndex * 10, 8, "F1", "0.13 0.16 0.20"));
    text(commands, row.quantity, 322, y + 5, 8, "F1", "0.13 0.16 0.20", "right");
    text(commands, row.unitPrice, 399, y + 5, 8, "F1", "0.13 0.16 0.20", "right");
    text(commands, row.vat, 466, y + 5, 8, "F1", "0.13 0.16 0.20", "right");
    text(commands, row.total, 540, y + 5, 8, "F2", "0.13 0.16 0.20", "right");
  });

  if (pageNumber === pageCount) {
    const totalsTop = Math.max(180, tableTop - 55 - rows.length * 34);
    rect(commands, 345, totalsTop - (input.totals?.length ?? 0) * 24 - 12, 208, (input.totals?.length ?? 0) * 24 + 24, "0.98 0.99 0.99");
    (input.totals ?? []).forEach(([label, value], index) => {
      const y = totalsTop - index * 24;
      text(commands, label, 360, y, 9, index === (input.totals?.length ?? 1) - 1 ? "F2" : "F1", "0.13 0.16 0.20");
      text(commands, value, 535, y, 9, "F2", "0.03 0.15 0.22", "right");
    });
    sectionTitle(commands, "Terms And Payment", 42, 142);
    [
      company.paymentInstructions,
      "Goods remain property of Ceter Technologies Limited until paid in full.",
      "Warranty and after-sales support apply only where stated on this document.",
      ...(input.footer ?? [])
    ].flatMap((line) => wrapText(line, 82)).slice(0, 5).forEach((line, index) => text(commands, line, 42, 124 - index * 12, 8, "F1", "0.30 0.34 0.39"));
  }

  line(commands, 42, 54, 553, 54, "0.82 0.85 0.88");
  text(commands, `Tax PIN: ${company.taxPin}`, 42, 36, 8, "F1", "0.30 0.34 0.39");
  text(commands, `Page ${pageNumber} of ${pageCount}`, 553, 36, 8, "F1", "0.30 0.34 0.39", "right");

  return commands.join("\n");
}

function documentTypeLabel(type: DocumentType) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function infoBlock(commands: string[], label: string, value: string, x: number, y: number) {
  text(commands, label.toUpperCase(), x, y, 7, "F2", "0.48 0.54 0.60");
  text(commands, value, x, y - 14, 10, "F2", "0.03 0.15 0.22");
}

function sectionTitle(commands: string[], value: string, x: number, y: number) {
  text(commands, value.toUpperCase(), x, y, 8, "F2", "0.87 0.57 0.18");
  line(commands, x, y - 6, x + 70, y - 6, "0.87 0.57 0.18");
}

function pill(commands: string[], value: string, x: number, y: number, width: number, height: number) {
  rect(commands, x, y, width, height, "0.91 0.95 0.97");
  text(commands, value, x + width / 2, y + 7, 8, "F2", "0.03 0.15 0.22", "center");
}

function rect(commands: string[], x: number, y: number, width: number, height: number, color: string) {
  commands.push(`q ${color} rg ${x} ${y} ${width} ${height} re f Q`);
}

function line(commands: string[], x1: number, y1: number, x2: number, y2: number, color: string) {
  commands.push(`q ${color} RG 0.8 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
}

function text(commands: string[], value: string, x: number, y: number, size: number, font: "F1" | "F2", color: string, align: "left" | "right" | "center" = "left") {
  const clean = pdfEscape(value);
  const width = clean.length * size * 0.48;
  const tx = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
  commands.push(`BT ${color} rg /${font} ${size} Tf ${tx.toFixed(2)} ${y.toFixed(2)} Td (${clean}) Tj ET`);
}

function wrapText(value: string, maxChars: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function buildPdf(objects: string[]) {
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(chunks.join(""), "ascii"));
    chunks.push(`${object}\n`);
  }
  const xrefOffset = Buffer.byteLength(chunks.join(""), "ascii");
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objects.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(chunks.join(""), "ascii");
}
