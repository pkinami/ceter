import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { verifyPublicDocument } from "@/lib/document-verification";

type VerifyPageProps = {
  params: Promise<{ token: string }>;
};

const resultLabels: Record<string, string> = {
  valid: "Valid",
  valid_superseded: "Valid but superseded",
  cancelled: "Cancelled",
  revoked: "Revoked",
  invalid_token: "Invalid token",
  signature_invalid: "Signature invalid",
  document_altered: "Document altered",
  not_issued: "Not yet issued"
};

export default async function VerifyPage({ params }: VerifyPageProps) {
  const token = (await params).token;
  const headerList = await headers();
  const verification = await verifyPublicDocument({
    token,
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent")
  });
  const doc = verification.document;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies" width={170} height={36} priority />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Document Verification</span>
        </div>

        <div className="py-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Verification result</p>
          <h1 className="mt-2 text-3xl font-bold">{resultLabels[verification.result]}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This public check shows only safe document metadata. Contact Ceter Technologies directly for full document details or commercial queries.
          </p>
        </div>

        {doc ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Info label="Document type" value={doc.type} />
            <Info label="Document number" value={doc.number} />
            <Info label="Issue date" value={doc.issueDate.toLocaleDateString("en-KE")} />
            <Info label="Current version" value={String(doc.version)} />
            <Info label="Document status" value={doc.status.replace(/_/g, " ")} />
            <Info label="Digital signature" value={doc.signatureStatus.replace(/_/g, " ")} />
            <Info label="Document hash" value={doc.hashStatus} />
            <Info label="KRA indicator" value={String(doc.kraStatus).replace(/_/g, " ")} />
          </dl>
        ) : (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            No issued Ceter document matched this verification token.
          </div>
        )}

        {doc?.kraVerificationUrl ? (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Official KRA verification is available for this fiscalized document.{" "}
            <Link className="font-semibold underline" href={doc.kraVerificationUrl}>Open KRA verification</Link>
          </div>
        ) : null}

        <footer className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
          <strong className="block text-slate-900">Ceter Technologies Limited</strong>
          <span>+254 707 143 322 · info@cetertechnologies.com · www.cetertechnologies.com</span>
        </footer>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold capitalize text-slate-950">{value}</dd>
    </div>
  );
}
