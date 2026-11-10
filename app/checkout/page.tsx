import { CheckoutForm } from "@/components/CheckoutForm";
import { getDeliveryFees } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false }
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const [profile, deliveryFees] = await Promise.all([
    data.user ? prisma.profile.upsert({
      where: { id: data.user.id },
      update: { email: data.user.email ?? undefined },
      create: {
        id: data.user.id,
        email: data.user.email ?? null,
        full_name: String(data.user.user_metadata?.full_name ?? ""),
        phone: String(data.user.user_metadata?.phone ?? ""),
        role: "customer"
      },
      select: { full_name: true, phone: true, email: true, delivery_region: true, delivery_location: true, delivery_instructions: true }
    }) : Promise.resolve(null),
    getDeliveryFees()
  ]);
  return <CheckoutForm defaultProfile={{ full_name: profile?.full_name ?? null, phone: profile?.phone ?? null, email: profile?.email ?? data.user?.email ?? null, delivery_region: profile?.delivery_region ?? null, delivery_location: profile?.delivery_location ?? null, delivery_instructions: profile?.delivery_instructions ?? null }} deliveryFees={deliveryFees} />;
}
