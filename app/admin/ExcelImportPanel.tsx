"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { AdminProgress, ProgressButton, type AdminProgressState } from "@/components/admin/AdminProgress";

type ImportKind = "products" | "categories";

type PreviewRow = {
  rowNumber: number;
  operation: "create" | "update";
  data: Record<string, string | number | boolean | string[] | Record<string, string> | null>;
  errors: string[];
};

type ImportResponse = {
  kind: ImportKind;
  rows: PreviewRow[];
  errorCount: number;
  rowLimit: number;
  importedCount?: number;
  skippedCount?: number;
  importErrors?: Array<{ rowNumber: number; errors: string[] }>;
  error?: string;
};

type ImportJobResponse = {
  id?: string;
  jobId?: string;
  status: "queued" | "running" | "success" | "error";
  progress?: {
    stage: "Validating" | "Preparing" | "Importing" | "Complete";
    processed: number;
    total: number;
  };
  result?: ImportResponse;
  error?: string;
};

const CONFIG = {
  products: {
    title: "Product XLSX Upload",
    template: "/api/admin/excel-import?kind=products",
    columns: ["name", "slug", "description", "category", "brand", "mpn", "sku", "price_kes", "cost_price_kes", "supplier_name", "supplier_lead_time_days", "reorder_level", "reorder_quantity", "condition", "stock_status", "stock_quantity", "images", "specs", "is_featured", "is_published"]
  },
  categories: {
    title: "Category XLSX Upload",
    template: "/api/admin/excel-import?kind=categories",
    columns: ["name", "slug", "parent_slug", "description", "icon", "image", "sort_order"]
  }
} satisfies Record<ImportKind, { title: string; template: string; columns: string[] }>;

export function ExcelImportPanel() {
  return (
    <section className="grid gap-3 xl:grid-cols-2">
      <ImportCard kind="products" />
      <ImportCard kind="categories" />
    </section>
  );
}

function ImportCard({ kind }: { kind: ImportKind }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<AdminProgressState | null>(null);
  const config = CONFIG[kind];
  const isPending = progress?.status === "running";
  const canImport = Boolean(file && result && result.errorCount === 0 && result.rows.length > 0);

  const totals = useMemo(() => {
    const rows = result?.rows ?? [];
    return {
      create: rows.filter((row) => row.operation === "create").length,
      update: rows.filter((row) => row.operation === "update").length
    };
  }, [result]);

  async function submit(mode: "preview" | "commit") {
    if (!file) {
      setMessage("Choose an .xlsx file first.");
      return;
    }
    if (isPending) return;

    setMessage("");
    setProgress({ label: mode === "preview" ? "Previewing..." : "Importing...", stage: "Validating file", percent: 5, status: "running" });
    try {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("mode", mode);
      formData.set("file", file);

      const data = await uploadImport(formData, (percent) => {
        setProgress({
          label: mode === "preview" ? "Previewing" : "Importing",
          stage: percent < 100 ? "Uploading" : mode === "preview" ? "Reading workbook" : "Processing rows",
          percent: Math.min(70, 10 + percent * 0.6),
          status: "running"
        });
      });
      if (mode === "commit" && "jobId" in data) {
        if (!data.jobId) throw new Error(data.error ?? "Import job was not created.");
        await pollImportJob(data.jobId);
        return;
      }

      setProgress({ label: "Previewing", stage: "Building preview", percent: 90, status: "running" });
      setResult(data as ImportResponse);
      if (data.error) {
        setProgress({ label: "Preview failed", stage: data.error, status: "error" });
        setMessage(data.error);
      } else {
        const done = "Preview ready.";
        setProgress({ label: done, stage: "Complete", percent: 100, status: "success" });
        setMessage(done);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Import failed.";
      setProgress({ label: mode === "preview" ? "Preview failed" : "Import failed", stage: text, status: "error" });
      setMessage(text);
    }
  }

  async function pollImportJob(jobId: string) {
    setProgress({ label: "Importing", stage: "Validating", percent: 5, status: "running" });
    for (;;) {
      const response = await fetch(`/api/admin/excel-import?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const job = await response.json() as ImportJobResponse;
      if (!response.ok) throw new Error(job.error ?? "Import status could not be read.");

      const processed = job.progress?.processed ?? 0;
      const total = job.progress?.total ?? 0;
      const percent = total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : job.progress?.stage === "Preparing" ? 15 : 8;
      const stage = job.progress?.stage === "Importing" && total > 0 ? `Importing ${processed}/${total}` : job.progress?.stage ?? "Importing";

      setProgress({ label: "Importing", stage, percent: job.status === "success" ? 100 : percent, status: job.status === "error" ? "error" : job.status === "success" ? "success" : "running" });

      if (job.status === "success") {
        const finalResult = job.result;
        if (!finalResult) throw new Error("Import finished without a result.");
        setResult(finalResult);
        setMessage(`Import finished. Imported: ${finalResult.importedCount ?? 0}. Skipped: ${finalResult.skippedCount ?? 0}.`);
        return;
      }
      if (job.status === "error") throw new Error(job.error ?? "Import failed.");

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return (
    <div className="rounded-md border border-line bg-[#FBFCFD] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[#0B1E39]">{config.title}</h2>
          <p className="mt-1 text-xs text-[#5B6B80]">.xlsx workbook, up to 5 MB and 500 data rows.</p>
        </div>
        <a href={config.template} download className="btn-lite">
          <Download size={16} />
          Download Template
        </a>
      </div>

      <div className="mt-3 grid gap-2">
        <label className="block text-xs font-semibold text-[#33445A]">
          XLSX file
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="admin-input mt-2 w-full"
            disabled={isPending}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
              setMessage("");
              setProgress(null);
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <ProgressButton type="button" disabled={!file} progress={isPending ? progress : null} onClick={() => submit("preview")} className="btn-dark">
            <FileSpreadsheet size={16} />
            Preview
          </ProgressButton>
          <ProgressButton type="button" disabled={!canImport} progress={isPending ? progress : null} onClick={() => submit("commit")} className="btn-lite">
            <UploadCloud size={16} />
            Confirm Import
          </ProgressButton>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-line bg-white p-3 text-xs text-[#5B6B80]">
        <AdminProgress progress={progress} />
        <p className={progress ? "mt-2" : ""}>{message || "Select a template-formatted workbook to preview rows before importing."}</p>
        {result && !result.error ? (
          <p className="mt-1">
            Rows: {result.rows.length} | Creates: {totals.create} | Updates: {totals.update} | Errors: {result.errorCount}
            {typeof result.importedCount === "number" ? ` | Imported: ${result.importedCount} | Skipped: ${result.skippedCount ?? 0}` : ""}
          </p>
        ) : null}
      </div>

      {result?.importErrors?.length ? <ErrorReport title="Import errors" rows={result.importErrors} /> : null}
      {result && !result.error ? <PreviewTable columns={config.columns} rows={result.rows} /> : null}
    </div>
  );
}

function uploadImport(formData: FormData, onUploadProgress: (percent: number) => void) {
  return new Promise<ImportResponse | ImportJobResponse>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/excel-import");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onUploadProgress((event.loaded / event.total) * 100);
      else onUploadProgress(25);
    };
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText || "{}") as ImportResponse;
        if (request.status < 200 || request.status >= 300) reject(new Error(data.error ?? "Import failed."));
        else resolve(data);
      } catch {
        reject(new Error("Import response could not be read."));
      }
    };
    request.onerror = () => reject(new Error("Network error while uploading workbook."));
    request.send(formData);
  });
}

function ErrorReport({ title, rows }: { title: string; rows: Array<{ rowNumber: number; errors: string[] }> }) {
  return (
    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
      <h3 className="font-black">{title}</h3>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => <li key={row.rowNumber}>Row {row.rowNumber}: {row.errors.join(" ")}</li>)}
      </ul>
    </div>
  );
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: PreviewRow[] }) {
  return (
    <div className="mt-3 max-h-72 overflow-auto rounded-md border border-line">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="sticky top-0 bg-[#FAFBFC] text-slate-700">
          <tr>
            <th className="px-3 py-2">Row</th>
            <th className="px-3 py-2">Action</th>
            {columns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}
            <th className="px-3 py-2">Errors</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowNumber} className="border-t border-slate-200">
              <td className="px-3 py-2 font-semibold">{row.rowNumber}</td>
              <td className="px-3 py-2">{row.operation}</td>
              {columns.map((column) => <td key={column} className="max-w-56 truncate px-3 py-2">{displayValue(row.data[column])}</td>)}
              <td className={row.errors.length ? "px-3 py-2 text-red-700" : "px-3 py-2 text-slate-500"}>{row.errors.join(" ") || "None"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function displayValue(value: unknown) {
  if (Array.isArray(value)) return value.join("; ");
  if (value && typeof value === "object") return Object.entries(value).map(([key, entry]) => `${key}: ${String(entry)}`).join("; ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return value == null ? "" : String(value);
}
