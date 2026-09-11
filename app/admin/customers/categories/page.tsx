import { redirect } from "next/navigation";

export default function CustomerCategoriesAlias() {
  redirect("/admin/business?tab=customer-categories");
}
