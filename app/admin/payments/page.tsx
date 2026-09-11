import { BillingPage, PaymentsPage } from "@/components/admin/SalesBillingPages";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentsRoutePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = single(params?.tab) === "receipts" ? "receipts" : "payments";
  return (
    <>
      <nav className="ceter-admin-tabs" aria-label="Payments and receipts">
        <a className={tab === "payments" ? "active" : ""} href="/admin/payments">Payments</a>
        <a className={tab === "receipts" ? "active" : ""} href="/admin/payments?tab=receipts">Receipts</a>
      </nav>
      {tab === "receipts" ? <BillingPage kind="receipts" /> : <PaymentsPage />}
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
