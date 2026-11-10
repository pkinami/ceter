import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

function targetHref(type: string, id: string | null) {
  if (!id) return "/admin";
  if (type === "QuoteRequest") return `/admin/quote-requests/${id}`;
  if (type === "Quote") return `/admin/quotes/${id}`;
  if (type === "Order") return `/admin/sales/${id}`;
  return "/admin";
}

export default async function NotificationsPage() {
  const session = await requireAdminSession();
  const notifications = await prisma.internalNotification.findMany({ where: { OR: [{ recipient_id: null }, { recipient_id: session.userId }] }, orderBy: { created_at: "desc" }, take: 100 });
  return <div className="ceter-admin-page"><div className="ceter-admin-greeting"><div><p>Administration</p><h1>Notifications</h1></div></div><article className="ceter-admin-panel"><div className="ceter-admin-table-wrap"><table><thead><tr><th>Event</th><th>Detail</th><th>Received</th><th>Open</th></tr></thead><tbody>{notifications.length ? notifications.map((notice) => <tr key={notice.id}><td>{notice.title}</td><td>{notice.body ?? "-"}</td><td>{notice.created_at.toLocaleString("en-KE")}</td><td><Link href={targetHref(notice.target_type, notice.target_id)}>View record</Link></td></tr>) : <tr><td colSpan={4}>No notifications.</td></tr>}</tbody></table></div></article></div>;
}
