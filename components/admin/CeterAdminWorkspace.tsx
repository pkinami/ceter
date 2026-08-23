import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert, Database, FileDown, Printer, Search, SlidersHorizontal } from "lucide-react";
import type { AdminModule } from "@/lib/admin/modules";
import type { WorkspaceData } from "@/lib/admin/workspace";
import { requireAdminSession } from "@/lib/admin/auth";
import { getWorkspaceData } from "@/lib/admin/workspace";

type Props = {
  module: AdminModule;
};

export async function CeterAdminWorkspace({ module }: Props) {
  await requireAdminSession();
  const data = await getWorkspaceData(module);
  return <WorkspaceView data={data} />;
}

function WorkspaceView({ data }: { data: WorkspaceData }) {
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>{data.crumb}</p>
          <h1>{data.title}</h1>
          <span>{data.intro}</span>
        </div>
        <div className="ceter-admin-safe-mode">
          <CheckCircle2 size={17} />
          Live Ceter data
        </div>
      </div>

      <section className="ceter-admin-quick-actions" aria-label="Quick actions">
        <strong>Quick actions</strong>
        {data.actions.map((action) => (
          <Link key={`${action.href}-${action.label}`} href={action.href}>
            <span>{action.label}</span>
            <small>{action.detail}</small>
          </Link>
        ))}
      </section>

      <section className="ceter-admin-kpis" aria-label={`${data.title} metrics`}>
        {data.metrics.map((metric) => (
          <article key={metric.label} className={`ceter-admin-kpi ${metric.tone ?? "gray"}`}>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
            {metric.note ? <p>{metric.note}</p> : null}
          </article>
        ))}
      </section>

      <section className="ceter-admin-grid">
        <div className="ceter-admin-stack">
          {data.tables.map((table) => (
            <article key={table.title} className="ceter-admin-panel">
              <div className="ceter-admin-panel-header">
                <div>
                  <span>Detailed breakdown</span>
                  <h2>{table.title}</h2>
                </div>
                <div className="ceter-admin-table-tools">
                  <button type="button" disabled aria-label={`Search ${table.title}`}><Search size={15} /></button>
                  <button type="button" disabled aria-label={`Filter ${table.title}`}><SlidersHorizontal size={15} /></button>
                  <button type="button" disabled aria-label={`Print ${table.title}`}><Printer size={15} /></button>
                  <button type="button" disabled aria-label={`Export ${table.title}`}><FileDown size={15} /></button>
                </div>
              </div>
              <DataTable table={table} />
            </article>
          ))}
        </div>
        <aside className="ceter-admin-stack">
          {data.panels.map((panel) => (
            <article key={panel.title} className="ceter-admin-side-panel">
              <div className="ceter-admin-side-title">
                <Database size={17} />
                <h2>{panel.title}</h2>
              </div>
              <p>{panel.body}</p>
              <dl>
                {panel.items.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
          <article className="ceter-admin-warning">
            <CircleAlert size={18} />
            <div>
              <strong>Reference-only controls</strong>
              <p>Print/export/search icons are present as observed reference controls. They are disabled unless a backed Ceter workflow exists for this module.</p>
            </div>
          </article>
          <Link href="/" className="ceter-admin-storefront-card">
            <span>Open storefront</span>
            <ArrowUpRight size={17} />
          </Link>
        </aside>
      </section>
    </div>
  );
}

function DataTable({ table }: { table: WorkspaceData["tables"][number] }) {
  if (!table.rows.length) {
    return <div className="ceter-admin-empty">{table.empty}</div>;
  }
  return (
    <div className="ceter-admin-table-wrap">
      <table>
        <thead>
          <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={`${table.title}-${index}`}>
              {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
