import { AccountingPage } from "@/components/admin/AccountingPages";

export default async function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountingPage view="journals" id={id} />;
}
