import { readFile } from "node:fs/promises";
import JSZip from "jszip";

export type WordQuotationInput = {
  number: string;
  issueDate: string;
  validUntil?: string | null;
  customerName: string;
  customerCompany?: string | null;
  customerAddress?: string | null;
  lines: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
  totals: Array<[string, string]>;
};

const templatePath = new URL("../../public/templates/ceter-quotation-template.docx", import.meta.url);
const xmlEscape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (value: string | null | undefined) => value?.trim() || "—";

/**
 * Populates the OOXML copied from Ceter_Combined_Quotation.docx.  We edit
 * only w:t nodes and clone the source item <w:tr>, so Word keeps all of the
 * original page, table, paragraph and run formatting intact.
 */
export async function populateQuotationDocx(input: WordQuotationInput): Promise<Buffer> {
  if (!input.lines.length) throw new Error("A quotation needs at least one line item.");
  const zip = await JSZip.loadAsync(await readFile(templatePath));
  const document = zip.file("word/document.xml");
  if (!document) throw new Error("Quotation Word template is missing word/document.xml.");
  let xml = await document.async("string");
  const values: Record<string, string> = {
    "{{document.title}}": "Quotation",
    "{{quote.number}}": input.number,
    "{{quote.issue_date}}": input.issueDate,
    "{{quote.valid_until}}": text(input.validUntil),
    "{{quote.time}}": new Date().toLocaleTimeString("en-KE", { hour12: false, timeZone: "Africa/Nairobi" }) + " EAT",
    "{{customer.name}}": text(input.customerCompany || input.customerName),
    "{{customer.address}}": text(input.customerAddress),
    "{{customer.city_postal}}": "",
  };
  for (const [needle, value] of Object.entries(values)) xml = replaceText(xml, needle, value);

  const marker = "{{item.description}}";
  const start = xml.indexOf(marker);
  if (start < 0) throw new Error("Quotation Word template has no styled item row marker.");
  const rowStart = xml.lastIndexOf("<w:tr ", start);
  const rowEnd = xml.indexOf("</w:tr>", start) + "</w:tr>".length;
  if (rowStart < 0 || rowEnd < rowStart) throw new Error("Quotation item row is malformed.");
  const sourceRow = xml.slice(rowStart, rowEnd);
  const itemRows = input.lines.map((line) => {
    let row = sourceRow;
    row = replaceText(row, "{{item.description}}", line.description);
    row = replaceText(row, "{{item.quantity}}", String(line.quantity));
    row = replaceText(row, "{{item.unit_price}}", line.unitPrice);
    row = replaceText(row, "{{item.total}}", line.total);
    return row;
  }).join("");
  xml = `${xml.slice(0, rowStart)}${itemRows}${xml.slice(rowEnd)}`;

  for (const [label, value] of input.totals) xml = replaceText(xml, `{{total.${totalKey(label)}}}`, value);
  // Unused total rows are deliberately blank, not rebuilt; their original
  // borders and spacing remain part of the Word master.
  xml = xml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (row) => row.includes("{{total.") ? "" : row);
  zip.file("word/document.xml", xml);
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

function totalKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// Markers can be split by Word across runs. Replace their concatenated w:t
// contents while retaining the first run's formatting and emptying only the
// remaining runs that formed the marker.
function replaceText(xml: string, needle: string, value: string) {
  const nodes = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
  const plain = nodes.map((node) => node[1]).join("");
  const at = plain.indexOf(needle);
  if (at < 0) return xml;
  let offset = 0;
  let first = -1;
  let last = -1;
  for (let index = 0; index < nodes.length; index++) {
    const end = offset + nodes[index][1].length;
    if (first === -1 && at < end) first = index;
    if (at + needle.length <= end) { last = index; break; }
    offset = end;
  }
  if (first < 0 || last < 0) return xml;
  const before = plain.slice(0, at);
  const after = plain.slice(at + needle.length);
  const replacements = new Map<number, string>();
  for (let index = first; index <= last; index++) replacements.set(index, index === first ? `${before.slice(nodes.slice(0, index).reduce((n, node) => n + node[1].length, 0))}${xmlEscape(value)}` : "");
  // Preserve all text outside this specific occurrence. This compact form is
  // safe because only the affected consecutive run range is rewritten.
  const startOffset = nodes.slice(0, first).reduce((n, node) => n + node[1].length, 0);
  const endOffset = nodes.slice(0, last + 1).reduce((n, node) => n + node[1].length, 0);
  let output = "";
  let cursor = 0;
  nodes.forEach((node, index) => {
    const nodeStart = node.index!;
    const nodeEnd = nodeStart + node[0].length;
    output += xml.slice(cursor, nodeStart);
    if (index === first) output += node[0].replace(node[1], `${plain.slice(startOffset, at)}${xmlEscape(value)}${last === first ? plain.slice(at + needle.length, endOffset) : ""}`);
    else if (index > first && index < last) output += node[0].replace(node[1], "");
    else if (index === last && last !== first) output += node[0].replace(node[1], plain.slice(at + needle.length, endOffset));
    else output += node[0];
    cursor = nodeEnd;
  });
  return output + xml.slice(cursor);
}
