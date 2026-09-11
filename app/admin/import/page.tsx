import fs from "node:fs";
import { createHash } from "node:crypto";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

const categoryPath = "data/source/ceter-categories-full.xlsx";
const productPath = "data/source/ceter-products.xlsx";
const expectedCategoryHash = "df6b7f3ac297ab4e6dbca0b6698db25d36a5d3c9e4afee02767fa7b565fa8ad4";
const expectedProductHash = "6a276b3b3fde8723c403a04633c4b26d9667c70d0ba2210ca0d01667d0f24556";

export default async function ImportPage() {
  await requirePermission("products.import");
  const [logs, facts] = await Promise.all([
    prisma.importLog.findMany({ orderBy: { started_at: "desc" }, take: 20, include: { _count: { select: { row_errors: true } }, started_by: { select: { full_name: true, email: true } } } }),
    importFacts()
  ]);
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div><p>Catalogue &gt; Import Center</p><h1>Import Center</h1><span>Dry-run, checksum, reconcile, and commit controlled catalogue workbooks.</span></div>
        <a className="ceter-admin-secondary-button" href="/api/admin/excel-import?kind=products">Download product template</a>
      </div>
      <section className="ceter-admin-stat-grid">
        <Stat label="Category workbook" value={facts.category.present ? "Present" : "Missing"} detail={facts.category.hashStatus} />
        <Stat label="Product workbook" value={facts.product.present ? "Present" : "Missing"} detail={facts.product.hashStatus} />
        <Stat label="Last imports" value={String(logs.length)} detail="Immutable import logs" />
        <Stat label="Row errors" value={String(logs.reduce((sum, log) => sum + log._count.row_errors, 0))} detail="Downloadable from log data" />
      </section>
      <article className="ceter-admin-panel ceter-admin-form-panel">
        <div className="ceter-admin-panel-header"><div><span>Workflow</span><h2>Upload and Validate</h2></div></div>
        <form className="ceter-admin-form" action="/api/admin/excel-import" method="post" encType="multipart/form-data">
          <label>Import type<select name="kind" required><option value="categories">Categories</option><option value="products">Products</option></select></label>
          <label>Mode<select name="mode" required><option value="preview">Dry preview</option><option value="commit">Confirm and execute</option></select></label>
          <label className="wide">Workbook<input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
          <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button">Run Import Step</button><a className="ceter-admin-secondary-button" href="/api/admin/excel-import?kind=categories">Category template</a></div>
        </form>
      </article>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Preview contract</span><h2>Validation Results Shown by API</h2></div></div>
        <div className="ceter-admin-table-wrap"><table>
          <thead><tr><th>Stage</th><th>Status</th><th>Result classes</th></tr></thead>
          <tbody>
            {["File type and size", "Checksum", "Parse rows", "Dry preview", "Confirm", "Idempotent execute", "Progress", "Immutable result"].map((stage) => <tr key={stage}><td>{stage}</td><td><span className="ceter-admin-status green">Enabled</span></td><td>Create, Update, Unchanged, Warning, Conflict, Invalid</td></tr>)}
          </tbody>
        </table></div>
      </article>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>History</span><h2>Import Logs</h2></div></div>
        <div className="ceter-admin-table-wrap"><table>
          <thead><tr><th>Kind</th><th>Checksum</th><th>Status</th><th>Rows</th><th>Create</th><th>Update</th><th>Warnings</th><th>Errors</th><th>Started by</th><th>Date</th></tr></thead>
          <tbody>{logs.length ? logs.map((log) => <tr key={log.id}><td>{log.import_kind}</td><td><code>{log.source_sha256.slice(0, 12)}</code></td><td>{log.status}</td><td>{log.total_rows}</td><td>{log.create_count}</td><td>{log.update_count}</td><td>{log.warning_count}</td><td>{log._count.row_errors}</td><td>{log.started_by?.full_name ?? log.started_by?.email ?? "System"}</td><td>{log.started_at.toLocaleString("en-KE")}</td></tr>) : <tr><td colSpan={10}><div className="ceter-admin-empty">No imports have been recorded yet.</div></td></tr>}</tbody>
        </table></div>
      </article>
    </div>
  );
}

async function importFacts() {
  return {
    category: fileFact(categoryPath, expectedCategoryHash),
    product: fileFact(productPath, expectedProductHash)
  };
}

function fileFact(path: string, expectedHash: string) {
  if (!fs.existsSync(path)) return { present: false, hashStatus: "Input missing" };
  const hash = createHash("sha256").update(fs.readFileSync(path)).digest("hex");
  return { present: true, hashStatus: hash === expectedHash ? "Checksum matches" : `Checksum mismatch: ${hash.slice(0, 12)}` };
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="ceter-admin-stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
