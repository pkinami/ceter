"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";

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

const CONFIG = {
  products: {
    title: "Product Excel Upload",
    template: "/templates/ceter-products-import-template.xlsx",
    columns: ["name", "slug", "category", "brand", "price_kes", "condition", "stock_status", "stock_quantity", "images", "is_featured"]
  },
  categories: {
    title: "Category Excel Upload",
    template: "/templates/ceter-categories-import-template.xlsx",
    columns: ["name", "slug", "description", "icon", "image"]
  }
} satisfies Record<ImportKind, { title: string; template: string; columns: string[] }>;

export function ExcelImportPanel() {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <ImportCard kind="products" />
      <ImportCard kind="categories" />
    </section>
  );
}

function ImportCard({ kind }: { kind: ImportKind }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const config = CONFIG[kind];
  const canImport = Boolean(file && result && result.errorCount === 0 && result.rows.length > 0);

  const totals = useMemo(() => {
    const rows = result?.rows ?? [];
    return {
      create: rows.filter((row) => row.operation === "create").length,
      update: rows.filter((row) => row.operation === "update").length
    };
  }, [result]);

  function submit(mode: "preview" | "commit") {
    if (!file) {
      setMessage("Choose an .xlsx file first.");
      return;
    }

    setMessage(mode === "preview" ? "Reading workbook..." : "Importing rows and storing images...");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("mode", mode);
      formData.set("file", file);

      const response = await fetch("/api/admin/excel-import", { method: "POST", body: formData });
      const data = (await response.json()) as ImportResponse;
      setResult(data);
      setMessage(data.error ?? (mode === "preview" ? "Preview ready." : "Import finished."));
    });
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-ink">{config.title}</h2>
          <p className="mt-1 text-sm text-slate-600">Only .xlsx files up to 5 MB and 500 data rows are accepted.</p>
        </div>
        <a href={config.template} download className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-ink hover:bg-slate-50">
          <Download size={16} />
          Download Template
        </a>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block text-sm font-bold text-slate-700">
          Excel file
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
              setMessage("");
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!file || isPending} onClick={() => submit("preview")} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <FileSpreadsheet size={16} />
            Preview
          </button>
          <button type="button" disabled={!canImport || isPending} onClick={() => submit("commit")} className="inline-flex h-10 items-center gap-2 rounded-md bg-signal px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <UploadCloud size={16} />
            Confirm Import
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        <p>{isPending ? "Working..." : message || "Select a template-formatted workbook to preview rows before importing."}</p>
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

function ErrorReport({ title, rows }: { title: string; rows: Array<{ rowNumber: number; errors: string[] }> }) {
  return (
    <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <h3 className="font-black">{title}</h3>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => <li key={row.rowNumber}>Row {row.rowNumber}: {row.errors.join(" ")}</li>)}
      </ul>
    </div>
  );
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: PreviewRow[] }) {
  return (
    <div className="mt-4 max-h-96 overflow-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="sticky top-0 bg-slate-100 text-slate-700">
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
