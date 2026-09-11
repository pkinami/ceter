"use client";

import { useMemo, useState } from "react";
import { Edit3, FolderTree, Plus, Search, Trash2 } from "lucide-react";
import { deleteCategoryAction, upsertCategoryAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { CeterCombobox } from "@/components/admin/CeterCombobox";

export type ItemSubcategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  parentName: string;
  productCount: number;
  childCount: number;
  sortOrder: number;
};

export function ItemSubcategoriesClient({ rows }: { rows: ItemSubcategoryRow[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ItemSubcategoryRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const parents = rows.filter((row) => !row.parentId);
  const subcategories = rows.filter((row) => row.parentId);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.name, row.slug, row.description, row.parentName].some((value) => value.toLowerCase().includes(needle)));
  }, [query, rows]);

  function openForm(row?: ItemSubcategoryRow) {
    setEditing(row ?? null);
    setFormOpen(true);
  }

  return (
    <div className="ceter-admin-page ceter-subcategory-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Inventory / Products & Services</p>
          <h1>Item Subcategories</h1>
          <span>Organise Ceter products into parent categories and item subcategories used by the storefront and stock workflows.</span>
        </div>
        <button className="ceter-admin-primary-button" type="button" onClick={() => openForm()}><Plus size={15} /> Add Subcategory</button>
      </div>

      <section className="ceter-admin-kpis" aria-label="Category summary">
        <Kpi label="All Categories" value={rows.length} note="Parent and child records" />
        <Kpi label="Parent Categories" value={parents.length} note="Top-level storefront groups" />
        <Kpi label="Subcategories" value={subcategories.length} note="Nested item groups" />
        <Kpi label="Assigned Products" value={rows.reduce((sum, row) => sum + row.productCount, 0)} note="Products linked to categories" />
      </section>

      {formOpen ? (
        <article className="ceter-admin-panel ceter-subcategory-editor">
          <div className="ceter-admin-panel-header">
            <div><span>Form</span><h2>{editing ? "Edit Subcategory" : "Add Subcategory"}</h2></div>
          </div>
          <form className="ceter-admin-form" action={upsertCategoryAction}>
            <input type="hidden" name="return_to" value="/admin/categories" />
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <label>Name<input name="name" required defaultValue={editing?.name ?? ""} autoFocus /></label>
            <label>Slug<input name="slug" defaultValue={editing?.slug ?? ""} /></label>
            <CeterCombobox label="Parent" name="parent_id" defaultValue={editing?.parentId ?? ""} options={[{ value: "", label: "Main category" }, ...rows.filter((row) => row.id !== editing?.id).map((row) => ({ value: row.id, label: row.name, detail: row.parentName }))]} />
            <label>Sort order<input name="sort_order" type="number" defaultValue={editing?.sortOrder ?? 0} /></label>
            <label className="wide">Description<textarea name="description" defaultValue={editing?.description ?? ""} /></label>
            <div className="ceter-admin-form-actions">
              <button className="ceter-admin-secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
              <FormSubmitButton className="ceter-admin-primary-button" pendingText="Saving category...">Save Category</FormSubmitButton>
            </div>
          </form>
        </article>
      ) : null}

      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header ceter-subcategory-header">
          <div>
            <span>Detailed breakdown</span>
            <h2>Subcategory List</h2>
          </div>
          <label className="ceter-admin-table-search">
            <Search size={15} />
            <span className="sr-only">Search subcategories</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search categories..." />
          </label>
        </div>
        <div className="ceter-admin-table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Parent</th><th>Products</th><th>Children</th><th>Sort</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong><small>{row.description || row.slug}</small></td>
                  <td>{row.parentName}</td>
                  <td>{row.productCount.toLocaleString("en-KE")}</td>
                  <td>{row.childCount.toLocaleString("en-KE")}</td>
                  <td>{row.sortOrder}</td>
                  <td>
                    <div className="ceter-subcategory-actions">
                      <button type="button" onClick={() => openForm(row)}><Edit3 size={14} /> Edit</button>
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <FormSubmitButton confirmMessage={`Delete ${row.name}? Categories with products or child categories cannot be removed.`} pendingText="">
                          <Trash2 size={14} /> Delete
                        </FormSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6}><div className="ceter-admin-empty">No categories match the current search.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="ceter-admin-kpi green">
      <div className="ceter-stock-card-icon"><FolderTree size={18} /></div>
      <span>{label}</span>
      <strong>{value.toLocaleString("en-KE")}</strong>
      <p>{note}</p>
    </article>
  );
}
