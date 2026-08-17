import { ExcelImportPanel } from "@/app/admin/ExcelImportPanel";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function ImportPage() {
  await requireAdminSession();
  return (
    <>
      <PageHeader title="Import Centre" copy="XLSX parse, validate, preview, batched import and Supabase Storage image saving." />
      <ExcelImportPanel />
    </>
  );
}
