import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

const secretPattern = /secret|token|password|private|certificate|key|credential|pin/i;

export default async function ActivityPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("audit.view");
  const params = await searchParams;
  const query = text(params?.q);
  const activityModule = text(params?.module);
  const action = text(params?.action);
  const outcome = text(params?.outcome);
  const userId = text(params?.user);
  const where = {
    AND: [
      query ? { OR: [{ action: { contains: query, mode: "insensitive" as const } }, { entity: { contains: query, mode: "insensitive" as const } }, { entity_id: { contains: query, mode: "insensitive" as const } }] } : {},
      activityModule && activityModule !== "all" ? { entity: { contains: activityModule, mode: "insensitive" as const } } : {},
      action && action !== "all" ? { action: { contains: action, mode: "insensitive" as const } } : {},
      userId && userId !== "all" ? { user_id: userId } : {}
    ]
  };
  const [rows, users] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { created_at: "desc" }, take: 100, include: { user: { select: { full_name: true, email: true } } } }),
    prisma.profile.findMany({ where: { role: { not: "customer" } }, orderBy: { full_name: "asc" }, select: { id: true, full_name: true, email: true } })
  ]);
  const filtered = outcome && outcome !== "all" ? rows.filter((row) => classifyOutcome(row.action, row.after) === outcome) : rows;

  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div><p>Administration &gt; Activity Logs</p><h1>Activity Logs</h1></div>
      </div>
      <form className="ceter-admin-toolbar" action="/admin/activity">
        <label className="ceter-admin-table-search"><span className="sr-only">Search activity</span><input name="q" defaultValue={query} placeholder="Search action, target or correlation id" /></label>
        <select name="user" defaultValue={userId || "all"}><option value="all">All users</option>{users.map((user) => <option key={user.id} value={user.id}>{user.full_name ?? user.email ?? user.id}</option>)}</select>
        <select name="module" defaultValue={activityModule || "all"}>{["all", "Product", "Category", "Brand", "Banner", "Homepage", "Import", "Profile", "Role"].map((item) => <option key={item} value={item}>{item === "all" ? "All modules" : item}</option>)}</select>
        <select name="action" defaultValue={action || "all"}>{["all", "create", "update", "delete", "archive", "import", "blocked"].map((item) => <option key={item} value={item}>{item === "all" ? "All actions" : item}</option>)}</select>
        <select name="outcome" defaultValue={outcome || "all"}>{["all", "success", "blocked"].map((item) => <option key={item} value={item}>{item === "all" ? "All outcomes" : item}</option>)}</select>
        <input name="start" type="date" defaultValue={text(params?.start)} />
        <input name="end" type="date" defaultValue={text(params?.end)} />
        <button className="ceter-admin-secondary-button">Filter</button>
      </form>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Audit</span><h2>Recent Activity</h2></div></div>
        <div className="ceter-admin-table-wrap"><table>
          <thead><tr><th>User</th><th>Action</th><th>Target</th><th>Date/time</th><th>Outcome</th><th>Branch</th><th>Detail drawer</th><th>Correlation ID</th></tr></thead>
          <tbody>{filtered.length ? filtered.map((row) => (
            <tr key={row.id}>
              <td>{row.user?.full_name ?? row.user?.email ?? "System"}</td>
              <td>{row.action}</td>
              <td>{row.entity} {row.entity_id}</td>
              <td>{row.created_at.toLocaleString("en-KE")}</td>
              <td><span className={`ceter-admin-status ${classifyOutcome(row.action, row.after) === "blocked" ? "red" : "green"}`}>{classifyOutcome(row.action, row.after)}</span></td>
              <td>All branches</td>
              <td><details><summary>Before/after summary</summary><pre>{JSON.stringify({ before: redact(row.before), after: redact(row.after) }, null, 2)}</pre></details></td>
              <td><code>{row.id}</code></td>
            </tr>
          )) : <tr><td colSpan={8}><div className="ceter-admin-empty">No activity records match the current filters.</div></td></tr>}</tbody>
        </table></div>
      </article>
    </div>
  );
}

function text(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function classifyOutcome(action: string, after: unknown) {
  return action.includes("blocked") || JSON.stringify(after ?? "").includes("blocked") ? "blocked" : "success";
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, secretPattern.test(key) ? "[REDACTED]" : redact(entry)]));
}
