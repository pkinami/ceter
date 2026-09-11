import Link from "next/link";
import { FileText, ReceiptText, ShoppingCart, SquarePlus, User } from "lucide-react";
import type { PermissionKey } from "@/lib/admin/roles";

const actions = [
  { label: "Create Sale", href: "/admin/business?tab=sales", icon: SquarePlus, primary: true, permission: "sales.create" },
  { label: "Add Item", href: "/admin/products/new", icon: ShoppingCart, permission: "products.create" },
  { label: "Create Expense", href: "/admin/business?tab=expenses&modal=expense", icon: ReceiptText, permission: "accounting.post" },
  { label: "Create Quotation", href: "/admin/business?tab=quotes", icon: FileText, permission: "quotations.manage" },
  { label: "Create Customer", href: "/admin/business?tab=sales&modal=customer", icon: User, permission: "customers.manage" }
];

export function AdminQuickActions({ permissions }: { permissions: PermissionKey[] }) {
  const visibleActions = actions.filter((action) => permissions.includes(action.permission as PermissionKey));
  return (
    <section className="ceter-admin-quick-actions ceter-admin-global-quick-actions" aria-label="Quick actions">
      <strong>Quick actions</strong>
      <div className="ceter-admin-quick-stack">
        {visibleActions.length ? visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} className={action.primary ? "primary" : undefined} href={action.href}>
              <Icon size={15} strokeWidth={2} />
              <span>{action.label}</span>
            </Link>
          );
        }) : <span className="ceter-admin-empty">No quick actions available for this role.</span>}
      </div>
    </section>
  );
}
