import { NextResponse } from "next/server";
import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signedBusinessDocumentUrl } from "@/lib/business/documents";

const DOCUMENT_TYPES = new Set<DocumentType>([
  "quotation", "proforma_invoice", "invoice", "receipt", "delivery_note",
  "purchase_order", "supplier_invoice", "customer_statement"
]);

export async function GET(_request: Request, context: { params: Promise<{ type: string; number: string }> }) {
  const { type, number } = await context.params;
  if (!DOCUMENT_TYPES.has(type as DocumentType)) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const document = await prisma.document.findFirst({
    where: { document_type: type as DocumentType, document_number: number },
    orderBy: { created_at: "desc" },
    select: { bucket: true, storage_path: true }
  });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const url = await signedBusinessDocumentUrl(document.storage_path, document.bucket, false);
  return NextResponse.redirect(url);
}
