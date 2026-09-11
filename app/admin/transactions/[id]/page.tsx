import { TransactionsPage } from "@/components/admin/AccountingPages";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TransactionsPage id={id} />;
}
