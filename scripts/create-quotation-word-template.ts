import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";

const root = process.cwd();
const master = resolve(root, "Ceter_Combined_Quotation.docx");
const output = resolve(root, "public/templates/ceter-quotation-template.docx");

function setText(row: string, from: string, to: string) {
  return row.replace(`<w:t>${from}</w:t>`, `<w:t>${to}</w:t>`);
}

async function main() {
  const zip = await JSZip.loadAsync(await readFile(master));
  const part = zip.file("word/document.xml");
  if (!part) throw new Error("The Word master has no word/document.xml part.");
  let xml = await part.async("string");
  // These are text-only substitutions: all run, paragraph, section and table
  // properties from the supplied Word master are intentionally retained.
  xml = xml.replace("<w:t>Quotation</w:t>", "<w:t>{{document.title}}</w:t>");
  xml = xml.replace("2001321 9/10/2026", "{{quote.number}} {{quote.issue_date}}");
  xml = xml.replace("<w:t>08/25/2026</w:t>", "<w:t>{{quote.valid_until}}</w:t>");
  xml = xml.replace("<w:t>04:04:56 EAT</w:t>", "<w:t>{{quote.time}}</w:t>");
  xml = xml.replace("[Client </w:t></w:r><w:r w:rsidR=\"001C2CD3\"><w:rPr><w:rFonts w:ascii=\"Arial\" w:eastAsia=\"Arial\" w:hAnsi=\"Arial\" w:cs=\"Arial\"/><w:sz w:val=\"18\"/></w:rPr><w:t>Name]", "{{customer.name}}");
  xml = xml.replace("<w:t>[Client Address line 1]</w:t>", "<w:t>{{customer.address}}</w:t>");
  xml = xml.replace("<w:t>[City], [Postal code]</w:t>", "<w:t>{{customer.city_postal}}</w:t>");

  const itemTableStart = xml.indexOf("<w:tbl");
  const itemTable = xml.slice(itemTableStart, xml.indexOf("</w:tbl>", itemTableStart) + 8);
  const rows = [...itemTable.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((match) => match[0]);
  const kept = rows.map((row) => {
    if (row.includes("<w:t>Product 1</w:t>")) return setText(setText(setText(setText(row, "Product 1", "{{item.description}}"), "10", "{{item.quantity}}"), "Ksh 100.00", "{{item.unit_price}}"), "Ksh 1,000.00", "{{item.total}}");
    return row;
  }).filter((row) => !row.includes("<w:t>Service 1</w:t>") && !row.includes("<w:t>Product name</w:t>"));
  xml = `${xml.slice(0, itemTableStart)}${itemTable.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, () => kept.shift() || "")}${xml.slice(itemTableStart + itemTable.length)}`;

  const totalFields: Array<[string, string]> = [["Ksh 2,000.00", "{{total.subtotal}}"], ["Ksh 20.00", "{{total.discount}}"], ["Ksh 316.80", "{{total.vat}}"], ["Ksh 2,296.80", "{{total.total_due}}"], ["Ksh 0.00", "{{total.paid_amount}}"], ["Ksh 2,296.80", "{{total.balance_due}}"]];
  for (const [sample, marker] of totalFields) xml = xml.replace(`<w:t>${sample}</w:t>`, `<w:t>${marker}</w:t>`);
  xml = xml.replace("This quotation is valid until the expiry date mentioned above. Prices are subject to change without notice. Quotation is valid until the expiry date. Prices are subject to stock availability. LIVE-AUDIT-20260910 controlled test record. Do not fulfil.", "This quotation is valid until the expiry date mentioned above. Prices are subject to change without notice.");
  zip.file("word/document.xml", xml);
  await writeFile(output, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(`Created ${output} from the unchanged Word master.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
