import { redirect } from "next/navigation";

export default function LegacySerialNumbersPage() {
  redirect("/admin/inventory/serials");
}
