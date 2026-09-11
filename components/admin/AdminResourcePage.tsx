import type { ReactNode } from "react";

export function AdminResourcePage({
  eyebrow,
  title,
  subtitle,
  action,
  stats,
  children
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  stats?: Array<{ label: string; value: string; note?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </div>
        {action ?? <div className="ceter-admin-safe-mode">Live Ceter data</div>}
      </div>
      {stats?.length ? (
        <section className="ceter-admin-kpi-grid" aria-label={`${title} summary`}>
          {stats.map((stat) => (
            <article className="ceter-admin-kpi" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              {stat.note ? <p>{stat.note}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
      {children}
    </div>
  );
}

export function AdminTable({ columns, rows, empty }: { columns: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="ceter-admin-table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : <tr><td colSpan={columns.length}><div className="ceter-admin-empty">{empty}</div></td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const tone = /cancel|reject|negative|mismatch|required|failed/i.test(value) ? "red" : /posted|received|paid|active|reconciled|available/i.test(value) ? "green" : "amber";
  return <span className={`ceter-stock-status ${tone}`}>{label(value)}</span>;
}

export function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "Restricted";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

export function qty(value: number | { toString(): string } | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

export function label(value: string | null | undefined) {
  return String(value ?? "-").replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
