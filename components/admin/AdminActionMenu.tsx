import type { ReactNode } from "react";

export function AdminActionMenu({ label = "Row actions", children }: { label?: string; children: ReactNode }) {
  return (
    <details className="ceter-admin-action-menu">
      <summary aria-label={label}><span aria-hidden="true">&#8942;</span></summary>
      <div>{children}</div>
    </details>
  );
}
