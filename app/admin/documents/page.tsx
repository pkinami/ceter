import { DocumentsPage } from "@/components/admin/SalesBillingPages";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsRoutePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const verification = single(params?.tab) === "verification";
  return (
    <>
      <nav className="ceter-admin-tabs" aria-label="Documents">
        <a className={!verification ? "active" : ""} href="/admin/documents">Issued Documents</a>
        <a className={verification ? "active" : ""} href="/admin/documents?tab=verification">Document Verification</a>
      </nav>
      <DocumentsPage verification={verification} />
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
