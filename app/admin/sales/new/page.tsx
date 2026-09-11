import { redirect } from "next/navigation";

export default function MakeSalePage() {
  redirect("/admin/business?tab=sales");
}
