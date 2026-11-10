"use client";

import { useState } from "react";

export function ImportWorkbookForm() {
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/admin/excel-import", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Import could not be started.");
      setResult(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import could not be started."); }
    finally { setPending(false); }
  }
  return <><form className="ceter-admin-form" onSubmit={submit}><label>Import type<select name="kind" required><option value="categories">Categories</option><option value="products">Products</option></select></label><label>Mode<select name="mode" required><option value="preview">Dry preview</option><option value="commit">Confirm and execute</option></select></label><label className="wide">Workbook<input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label><div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" disabled={pending}>{pending ? "Processing…" : "Run Import Step"}</button><a className="ceter-admin-secondary-button" href="/api/admin/excel-import?kind=categories">Category template</a></div></form>{error ? <p className="ceter-admin-form-error" role="alert">{error}</p> : null}{result ? <div className="ceter-admin-import-result" role="status"><strong>Import response</strong><pre>{JSON.stringify(result, null, 2)}</pre></div> : null}</>;
}
