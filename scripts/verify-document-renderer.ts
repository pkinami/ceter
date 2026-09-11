import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { brandedPdfBytes, type BusinessDocumentInput } from "../lib/business/documents";

type Case = {
  name: string;
  minPages: number;
  input: BusinessDocumentInput;
};

const cases: Case[] = [
  {
    name: "reference-comparison-quotation",
    minPages: 1,
    input: {
      type: "quotation", title: "Quotation", number: "2001321", issueDate: "9/10/2026", dueDate: "9/10/2026",
      customerName: "[Client Name]", customerAddress: "[Client Address line 1], [City], [Postal code]",
      lines: [
        { description: "Product 1", quantity: 10, unitPrice: "Ksh 100.00", total: "Ksh 1,000.00" },
        { description: "Service 1", quantity: 1, unitPrice: "Ksh 1,000.00", total: "Ksh 1,000.00" },
        { description: "Product name", quantity: 1, unitPrice: "Ksh 0.00", total: "Ksh 0.00" },
        { description: "Product name", quantity: 1, unitPrice: "Ksh 0.00", total: "Ksh 0.00" },
        { description: "Product name", quantity: 1, unitPrice: "Ksh 0.00", total: "Ksh 0.00" }
      ],
      totals: [["Subtotal", "Ksh 2,000.00"], ["Discount (1%)", "Ksh 20.00"], ["VAT", "Ksh 316.80"], ["Total Due", "Ksh 2,296.80"], ["Paid Amount", "Ksh 0.00"], ["Balance Due", "Ksh 2,296.80"]]
    }
  },
  {
    name: "quotation",
    minPages: 1,
    input: {
      type: "quotation",
      title: "Quotation",
      number: "QT-REGRESSION-001",
      issueDate: "10/09/2026",
      dueDate: "30/09/2026",
      customerName: "Regression Customer",
      lines: [{ description: "Quotation line with VAT", quantity: 1, unitPrice: "KES 1,000.00", discount: "KES 0.00", vat: "KES 160.00", taxInfo: "VAT applied to this line", total: "KES 1,160.00" }],
      totals: [["Subtotal", "KES 1,000.00"], ["Tax", "KES 160.00"], ["Total", "KES 1,160.00"]]
    }
  },
  {
    name: "quotation-products-services",
    minPages: 1,
    input: {
      type: "quotation", title: "Quotation", number: "QT-MIXED-001", issueDate: "10/09/2026", dueDate: "30/09/2026",
      customerName: "Mixed Customer", customerEmail: "mixed@example.com", customerPhone: "+254 700 000 000",
      lines: [
        { description: "Office printer", quantity: 1, unitPrice: "KES 45,000.00", total: "KES 45,000.00" },
        { description: "Installation service", quantity: 1, unitPrice: "KES 5,000.00", total: "KES 5,000.00" }
      ],
      totals: [["Subtotal", "KES 50,000.00"], ["Discount", "KES 0.00"], ["VAT", "KES 8,000.00"], ["Total Due", "KES 58,000.00"], ["Paid Amount", "KES 0.00"], ["Balance Due", "KES 58,000.00"]]
    }
  },
  {
    name: "quotation-service-only",
    minPages: 1,
    input: {
      type: "quotation", title: "Quotation", number: "QT-SERVICE-001", issueDate: "10/09/2026", dueDate: "30/09/2026",
      customerName: "Service Customer", lines: [{ description: "Preventive maintenance service", quantity: 1, unitPrice: "KES 8,000.00", total: "KES 8,000.00" }],
      totals: [["Subtotal", "KES 8,000.00"], ["Discount", "KES 0.00"], ["VAT", "KES 1,280.00"], ["Total Due", "KES 9,280.00"], ["Paid Amount", "KES 0.00"], ["Balance Due", "KES 9,280.00"]]
    }
  },
  {
    name: "multipage-invoice",
    minPages: 2,
    input: {
      type: "invoice",
      title: "Invoice",
      number: "INV-REGRESSION-001",
      issueDate: "10/09/2026",
      dueDate: "20/09/2026",
      customerName: "Regression Customer",
      lines: Array.from({ length: 18 }, (_, index) => ({
        description: `Invoice line ${index + 1} with a long description to exercise wrapping`,
        quantity: 1,
        unitPrice: "KES 2,500.00",
        discount: "KES 0.00",
        vat: "KES 400.00",
        taxInfo: "VAT applied to this line",
        total: "KES 2,900.00"
      })),
      totals: [["Subtotal", "KES 45,000.00"], ["Tax", "KES 7,200.00"], ["Balance", "KES 52,200.00"]]
    }
  },
  {
    name: "delivery-note",
    minPages: 1,
    input: {
      type: "delivery_note",
      title: "Delivery Note",
      number: "DN-REGRESSION-001",
      dueDate: "10/09/2026",
      meta: [["Order", "ORD-REGRESSION-001"], ["Status", "Scheduled"]],
      customerName: "Regression Customer",
      customerAddress: "Nairobi, Kenya",
      lines: [{ description: "Delivered product", quantity: 2, unitPrice: "3" }],
      footer: ["Receiver to verify condition before signing."]
    }
  }
  ,{
    name: "invoice-with-lpo", minPages: 1,
    input: { type: "invoice", title: "Invoice", number: "INV-VERY-LONG-20260910-REFERENCE-001", issueDate: "10/09/2026", dueDate: "20/09/2026", meta: [["LPO No.", "CUSTOMER-LPO-2026-0001"]], customerName: "Long Customer Company Name That Must Not Cross The Right Margin", lines: [{ description: "One invoice item", quantity: 1, unitPrice: "KES 1,000", total: "KES 1,160" }], totals: [["Subtotal", "KES 1,000"], ["VAT", "KES 160"], ["Total", "KES 1,160"], ["Amount paid", "KES 0"], ["Balance", "KES 1,160"]] }
  },{
    name: "invoice-without-lpo", minPages: 1,
    input: { type: "invoice", title: "Invoice", number: "INV-NO-LPO-001", issueDate: "10/09/2026", customerName: "Customer", lines: [{ description: "One invoice item", quantity: 1, unitPrice: "KES 100", total: "KES 100" }], totals: [["Subtotal", "KES 100"], ["Total", "KES 100"], ["Balance", "KES 100"]] }
  },{
    name: "receipt", minPages: 1,
    input: { type: "receipt", title: "Receipt", number: "RCT-VERY-LONG-20260910-REFERENCE-001", issueDate: "10/09/2026", meta: [["Method", "M-Pesa"], ["Reference", "MPESA-LONG-REFERENCE-0000000001"]], customerName: "Payer with a long company name", lines: [{ description: "Payment received | INV-2026-0001", total: "KES 1,000" }], totals: [["Invoice total", "KES 1,500"], ["Amount paid", "KES 1,000"], ["Balance", "KES 500"]] }
  },{
    name: "customer-statement", minPages: 1,
    input: { type: "customer_statement", title: "Customer Statement", number: "STM-2026", issueDate: "10/09/2026", customerName: "Customer", lines: [{ description: "10/09/2026 | INV-1 | Invoice charge", total: "KES 1,000" }, { description: "11/09/2026 | RCT-1 | Payment received", total: "(KES 400)" }], totals: [["Opening balance", "KES 0"], ["Charges", "KES 1,000"], ["Payments", "KES 400"], ["Closing balance", "KES 600"]] }
  },{
    name: "purchase-order", minPages: 1,
    input: { type: "purchase_order", title: "Purchase Order", number: "PO-2026-001", issueDate: "10/09/2026", customerName: "Supplier", lines: [{ description: "Supplier item", quantity: 2, unitPrice: "KES 500", total: "KES 1,000" }], totals: [["Subtotal", "KES 1,000"], ["Total", "KES 1,000"]] }
  }
];

async function main() {
  const outputDirectory = "C:/ceter/document-verification";
  mkdirSync(outputDirectory, { recursive: true });
  for (const item of cases) {
    const bytes = await brandedPdfBytes(item.input);
    const pdf = await PDFDocument.load(bytes);
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      if (width !== 612 || height !== 792) throw new Error(`${item.name} is not US Letter: ${width} x ${height}.`);
    }
    if (pdf.getPageCount() < item.minPages) {
      throw new Error(`${item.name} expected at least ${item.minPages} page(s), got ${pdf.getPageCount()}.`);
    }
    if (bytes.length < 10_000) {
      throw new Error(`${item.name} output is unexpectedly small: ${bytes.length} bytes.`);
    }
    writeFileSync(`${outputDirectory}/${item.name}.pdf`, bytes);
    console.log(`${item.name}: ${pdf.getPageCount()} page(s), ${bytes.length} bytes`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
