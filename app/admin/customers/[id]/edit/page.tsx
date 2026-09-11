import { CustomerFormPage } from "@/components/admin/SalesBillingPages";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return <CustomerFormPage customerId={(await params).id} />;
}
