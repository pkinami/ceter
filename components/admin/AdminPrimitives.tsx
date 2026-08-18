import Link from "next/link";
import { formatKes, formatNumber } from "@/lib/utils";

export function PageHeader({ title, copy, actions }: { title: string; copy?: string; actions?: React.ReactNode }) {
  return (
    <div className="admin-page-head">
      <div className="admin-page-title">
        <h1>{title}</h1>
        {copy ? <p>{copy}</p> : null}
      </div>
      {actions ? <div className="admin-actions">{actions}</div> : null}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="admin-kpi-grid">{children}</div>;
}

export function Kpi({ label, value, note }: { label: string; value: string | number; note?: string }) {
  const displayValue = typeof value === "number" ? formatNumber(value) : compactValue(value);
  return (
    <div className="admin-card admin-kpi">
      <div className="admin-kpi-label">{label}</div>
      <div className="admin-kpi-value" aria-label={String(value)}>{displayValue}</div>
      {note ? <div className="admin-kpi-sub">{note}</div> : null}
    </div>
  );
}

export function Card({ title, tag, children }: { title?: string; tag?: string; children: React.ReactNode }) {
  return (
    <section className="admin-card admin-section-card">
      {title ? <div className="admin-card-head">{title}{tag ? <span className="admin-pill teal">{tag}</span> : null}</div> : null}
      {children}
    </section>
  );
}

export function EmptyState({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return <div className="admin-card admin-empty"><strong>{title}</strong><p>{copy}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "green" | "red" | "amber" | "teal" | "gray" }) {
  return <span className={`admin-pill ${tone}`}>{children}</span>;
}

export function Money({ value }: { value: number }) {
  return <span className="font-mono">{formatKes(value)}</span>;
}

export function NumberText({ value }: { value: number }) {
  return <span className="font-mono">{formatNumber(value)}</span>;
}

export function Table({ headers, children, minWidth = 900 }: { headers: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="admin-card">
      <div className="admin-table-hint">Swipe to view columns</div>
      <div className="admin-table-wrap">
        <table style={{ minWidth }}>
          <thead>
            <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function compactValue(value: string) {
  const match = value.match(/^KSh\s*([\d,]+)(?:\.(\d+))?$/);
  if (!match) return value;
  const amount = Number(match[1].replace(/,/g, "") + (match[2] ? `.${match[2]}` : ""));
  if (!Number.isFinite(amount) || amount < 1000000) return value;
  return `KSh ${(amount / 1000000).toFixed(amount >= 10000000 ? 1 : 2).replace(/\.0$/, "")}M`;
}

export function FilterLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return <Link href={href} className={active ? "btn-dark" : "btn-lite"}>{children}</Link>;
}
