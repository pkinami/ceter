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
            <input name="full_name" defaultValue={profile?.full_name ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Phone
            <input name="phone" defaultValue={profile?.phone ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Email
            <input name="email" type="email" defaultValue={profile?.email ?? userData.user.email ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Delivery region
            <select name="delivery_region" defaultValue={profile?.delivery_region ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-signal focus:outline-none">
              <option value="">No saved delivery region</option>
              {DELIVERY_REGIONS.map((region) => <option key={region.value} value={region.value}>{region.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Delivery location / address details
            <input name="delivery_location" defaultValue={profile?.delivery_location ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Delivery instructions
            <textarea name="delivery_instructions" defaultValue={profile?.delivery_instructions ?? ""} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-signal focus:outline-none" />
          </label>
          <FormSubmitButton pendingText="Saving..." className="h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Save Account</FormSubmitButton>
        </form>
      </section>
    </div>
  );
}
