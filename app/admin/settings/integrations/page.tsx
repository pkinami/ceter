import { SettingsPage } from "@/components/admin/AdministrationPages";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const integrationTabs = [
  { key: "etims", label: "eTIMS KRA", view: "etims" },
  { key: "mpesa", label: "M-Pesa", view: "mpesa" },
  { key: "payment-methods", label: "Payment Methods", view: "payment-methods" },
  { key: "tax", label: "Tax Types", view: "tax" },
  { key: "sms", label: "SMS", view: "sms" },
  { key: "signing", label: "Document Signing", view: "signing" },
  { key: "security", label: "Security", view: "security" },
  { key: "notifications", label: "Notifications", view: "notifications" }
] as const;

export default async function IntegrationsSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const active = integrationTabs.find((tab) => tab.key === single(params?.tab)) ?? integrationTabs[0];
  return (
    <>
      <nav className="ceter-admin-tabs" aria-label="Integration settings">
        {integrationTabs.map((tab) => (
          <a key={tab.key} className={active.key === tab.key ? "active" : ""} href={`/admin/settings/integrations?tab=${tab.key}`}>
            {tab.label}
          </a>
        ))}
      </nav>
      <SettingsPage view={active.view} />
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
