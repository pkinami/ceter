import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function verificationTokenHash(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function requestValueHash(value: string | null | undefined) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export async function verifyPublicDocument(input: {
  token: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const tokenHash = verificationTokenHash(input.token);
  const document = await prisma.document.findFirst({
    where: { verification_token_hash: tokenHash },
    include: { invoice: { include: { customer: true } }, signing_certificate: true }
  });

  if (!document) {
    await prisma.documentVerificationEvent.create({
      data: {
        token_hash: tokenHash,
        result: "invalid_token",
        ip_hash: requestValueHash(input.ip),
        user_agent_hash: requestValueHash(input.userAgent)
      }
    });
    return { result: "invalid_token" as const, document: null };
  }

  const result = publicResultFor(document.lifecycle_status, document.signature_status, document.verification_status);
  await prisma.documentVerificationEvent.create({
    data: {
      document_id: document.id,
      token_hash: tokenHash,
      result,
      ip_hash: requestValueHash(input.ip),
      user_agent_hash: requestValueHash(input.userAgent)
    }
  });

  return {
    result,
    document: {
      type: document.document_type.replace(/_/g, " "),
      number: document.document_number ?? document.title,
      issueDate: document.issued_at ?? document.created_at,
      version: document.version,
      status: document.lifecycle_status,
      signatureStatus: document.signature_status,
      hashStatus: document.content_sha256 ? "recorded" : "not recorded",
      kraStatus: document.invoice?.etims_status ?? "not applicable",
      kraVerificationUrl: document.invoice?.etims_verification_url ?? null,
      certificate: document.signing_certificate ? {
        subject: document.signing_certificate.subject,
        issuer: document.signing_certificate.issuer,
        validTo: document.signing_certificate.valid_to
      } : null
    }
  };
}

function publicResultFor(lifecycle: string, signature: string, verification: string) {
  if (verification === "altered") return "document_altered" as const;
  if (signature === "invalid") return "signature_invalid" as const;
  if (lifecycle === "superseded" || verification === "superseded") return "valid_superseded" as const;
  if (lifecycle === "cancelled" || verification === "cancelled") return "cancelled" as const;
  if (lifecycle === "revoked" || verification === "revoked") return "revoked" as const;
  if (lifecycle !== "issued" && lifecycle !== "digitally_signed") return "not_issued" as const;
  return "valid" as const;
}
