"use client";

import { useMemo, useState } from "react";
import { FileDown, Printer, Search, SlidersHorizontal, X } from "lucide-react";
import type { WorkspaceTable } from "@/lib/admin/workspace";

export function AdminDataTable({ table }: { table: WorkspaceTable }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return table.rows;
    return table.rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(needle)));
  }, [query, table.rows]);

  function exportCsv() {
    const csv = [table.columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${table.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="ceter-admin-table-tools" aria-label={`${table.title} table controls`}>
        {searchOpen ? (
          <label className="ceter-admin-table-search">
            <Search size={15} />
            <span className="sr-only">Search {table.title}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search table" autoFocus />
          </label>
        ) : null}
        <button type="button" aria-label={`Search ${table.title}`} aria-pressed={searchOpen} onClick={() => setSearchOpen((value) => !value)}>
          {searchOpen ? <X size={15} /> : <Search size={15} />}
        </button>
        <button type="button" aria-label={`Toggle compact rows for ${table.title}`} aria-pressed={compact} onClick={() => setCompact((value) => !value)}>
          <SlidersHorizontal size={15} />
        </button>
        <button type="button" aria-label={`Print ${table.title}`} onClick={() => window.print()}>
          <Printer size={15} />
        </button>
        <button type="button" aria-label={`Export ${table.title}`} onClick={exportCsv}>
          <FileDown size={15} />
        </button>
      </div>
      <TableContent table={table} rows={rows} compact={compact} query={query} />
    </>
  );
}

function TableContent({ table, rows, compact, query }: { table: WorkspaceTable; rows: string[][]; compact: boolean; query: string }) {
  if (!table.rows.length) return <div className="ceter-admin-empty">{table.empty}</div>;
  if (!rows.length) return <div className="ceter-admin-empty">No records match {query}.</div>;
  return (
    <div className="ceter-admin-table-wrap">
      <table className={compact ? "compact" : undefined}>
        <thead>
          <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${table.title}-${index}`}>
              {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
