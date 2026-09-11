import { ExpensesPage } from "@/components/admin/AccountingPages";

export default async function RecurringExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpensesPage id={id} recurring />;
}
