import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { signedBusinessDocumentUrl } from "@/lib/business/documents";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requirePermission("documents.view");
  const { id } = await context.params;
  const document = await prisma.document.findUnique({
    where: { id },
    select: { bucket: true, storage_path: true }
  });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const url = await signedBusinessDocumentUrl(document.storage_path, document.bucket);
  return NextResponse.redirect(url);
}
