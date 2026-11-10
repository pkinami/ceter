import { SettingsPage } from "@/components/admin/AdministrationPages";
import { getAdminSession, hasPermission } from "@/lib/admin/auth";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const integrationTabs = [
  { key: "overview", label: "Overview", view: "integrations", permission: "settings.integrations.manage" },
  { key: "etims", label: "eTIMS KRA", view: "etims", permission: "settings.etims.manage" },
  { key: "mpesa", label: "M-Pesa", view: "mpesa", permission: "settings.mpesa.manage" },
  { key: "sms", label: "SMS", view: "sms", permission: "settings.sms.manage" },
  { key: "signing", label: "Document Signing", view: "signing", permission: "settings.signing.manage" },
  { key: "notifications", label: "Notifications", view: "notifications", permission: "settings.notifications.manage" }
] as const;

export default async function IntegrationsSettingsPage({ searchParams }: PageProps) {
  const [params, session] = await Promise.all([searchParams, getAdminSession()]);
  const allowedTabs = integrationTabs.filter((tab) => hasPermission(session, tab.permission));
  const active = allowedTabs.find((tab) => tab.key === single(params?.tab)) ?? allowedTabs[0];
  return (
    <>
      <nav className="ceter-admin-tabs" aria-label="Integration settings">
        {allowedTabs.map((tab) => (
          <a key={tab.key} className={active.key === tab.key ? "active" : ""} href={`/admin/settings/integrations?tab=${tab.key}`}>
            {tab.label}
          </a>
        ))}
      </nav>
      {active ? <SettingsPage view={active.view} /> : null}
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
