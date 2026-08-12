import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Checkout"
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/checkout");
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", data.user.id).maybeSingle();
  return <CheckoutForm defaultPhone={profile?.phone ?? ""} />;
}
