import { AccountingPage } from "@/components/admin/AccountingPages";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountingPage view="accounts" id={id} />;
}
