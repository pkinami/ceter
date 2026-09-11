import { ExpensesPage } from "@/components/admin/AccountingPages";

export default async function ExpenseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpensesPage id={id} />;
}
