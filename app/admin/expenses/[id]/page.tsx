import { ExpensesPage } from "@/components/admin/AccountingPages";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpensesPage id={id} />;
}
