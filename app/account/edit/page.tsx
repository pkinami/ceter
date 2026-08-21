import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfileAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { DELIVERY_REGIONS } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Edit Account",
  robots: { index: false, follow: false }
};

export default async function EditAccountPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login?next=/account/edit");

  const profile = await prisma.profile.upsert({
    where: { id: userData.user.id },
    update: {},
    create: {
      id: userData.user.id,
      email: userData.user.email ?? null,
      full_name: String(userData.user.user_metadata?.full_name ?? ""),
      phone: String(userData.user.user_metadata?.phone ?? ""),
      role: "customer"
    },
    select: { full_name: true, phone: true, email: true, delivery_region: true, delivery_location: true, delivery_instructions: true }
  });
  const customer = await prisma.customer.findFirst({
    where: { profile_id: userData.user.id },
    select: { company_name: true, tax_pin: true, notes: true }
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/account" className="text-sm font-bold text-signal hover:text-teal-700">Back to orders</Link>
        <h1 className="mt-3 text-3xl font-black text-ink">Edit Account</h1>
        <p className="mt-2 text-sm text-slate-500">{userData.user.email ?? "Email unavailable"}</p>
      </div>
      <section className="rounded-lg border border-slate-300 bg-white p-5">
        {params.error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
        {params.success ? <p className="mb-4 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-800">{params.success}</p> : null}
        <form action={updateProfileAction} className="space-y-4">
          <input type="hidden" name="return_to" value="/account/edit" />
          <label className="block text-sm font-bold text-slate-700">
            Full name
            <input id="account-full-name" name="full_name" autoComplete="name" placeholder="Your full name" defaultValue={profile?.full_name ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Phone number
            <input id="account-phone" name="phone" type="tel" autoComplete="tel" placeholder="Your mobile number" defaultValue={profile?.phone ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Email address
            <input id="account-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={profile?.email ?? userData.user.email ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Company name
            <input id="account-company-name" name="company_name" autoComplete="organization" placeholder="Company or trading name" defaultValue={customer?.company_name ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            KRA PIN
            <input id="account-tax-pin" name="tax_pin" autoComplete="off" placeholder="Optional billing PIN" defaultValue={customer?.tax_pin ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Billing information
            <textarea id="account-billing-information" name="billing_information" autoComplete="off" placeholder="Optional billing notes, purchase order instructions, or invoice contact" defaultValue={customer?.notes ?? ""} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Delivery region
            <select id="account-delivery-region" name="delivery_region" autoComplete="address-level1" defaultValue={profile?.delivery_region ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-signal focus:outline-none">
              <option value="">No saved delivery region</option>
              {DELIVERY_REGIONS.map((region) => <option key={region.value} value={region.value}>{region.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Delivery address
            <input id="account-delivery-location" name="delivery_location" autoComplete="street-address" placeholder="Street, building, estate, town, or pickup point" defaultValue={profile?.delivery_location ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Delivery instructions
            <textarea id="account-delivery-instructions" name="delivery_instructions" autoComplete="off" placeholder="Gate code, floor, landmark, or preferred delivery time" defaultValue={profile?.delivery_instructions ?? ""} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-signal focus:outline-none" />
          </label>
          <FormSubmitButton pendingText="Saving..." className="h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Save Account</FormSubmitButton>
        </form>
      </section>
    </div>
  );
}
