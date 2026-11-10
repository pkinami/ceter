"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Plus, Search } from "lucide-react";

export type CeterComboboxOption = {
  value: string;
  label: string;
  detail?: string;
};

type Props = {
  label?: string;
  name: string;
  options: CeterComboboxOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
  loading?: boolean;
  emptyText?: string;
  createLabel?: string;
  onCreate?: () => void;
};

export function CeterCombobox({
  label,
  name,
  options,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Search options",
  required,
  compact,
  loading,
  emptyText = "No matches.",
  createLabel,
  onCreate
}: Props) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlled ? value : internalValue;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const rootRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const selected = options.find((option) => option.value === selectedValue);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? options.filter((option) => `${option.label} ${option.detail ?? ""}`.toLowerCase().includes(needle))
      : options;
    // A product picker must not silently hide the catalogue. The list remains
    // scrollable, while search narrows it immediately for large catalogues.
    return filtered.slice(0, 100);
  }, [options, query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const roomBelow = window.innerHeight - rect.bottom - 8;
      const roomAbove = rect.top - 8;
      const openAbove = roomBelow < 180 && roomAbove > roomBelow;
      const maxHeight = Math.max(120, Math.min(320, openAbove ? roomAbove : roomBelow));
      setMenuPosition({
        top: openAbove ? Math.max(8, rect.top - maxHeight - 5) : rect.bottom + 5,
        left: rect.left,
        width: rect.width,
        maxHeight
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function commit(next: string) {
    if (!controlled) setInternalValue(next);
    onChange?.(next);
    setQuery("");
    setOpen(false);
  }

  function openMenu() {
    setActiveIndex(Math.max(0, shown.findIndex((option) => option.value === selectedValue)));
    setOpen(true);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && ["ArrowDown", "Enter", " "].includes(event.key)) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(shown.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = shown[activeIndex];
      if (option) commit(option.value);
    }
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <label ref={rootRef} className={compact ? "ceter-combobox compact" : "ceter-combobox"}>
      {label ? <span className={compact ? "sr-only" : undefined}>{label}</span> : null}
      <input type="hidden" name={name} value={selectedValue ?? ""} required={required} />
      <div className="ceter-combobox-control" aria-expanded={open} aria-haspopup="listbox" data-open={open || undefined}>
        <Search size={15} aria-hidden="true" />
        <input
          ref={inputRef}
          value={query || selected?.label || ""}
          onFocus={openMenu}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            openMenu();
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && shown[activeIndex] ? `${listId}-${shown[activeIndex].value}` : undefined}
          aria-label={label ?? placeholder}
        />
        {loading ? <Loader2 className="ceter-combobox-spinner" size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
      </div>
      {open && menuPosition && typeof document !== "undefined" ? createPortal(
        <div ref={menuRef} id={listId} className="ceter-combobox-menu" role="listbox" style={menuPosition}>
          {loading ? <p className="ceter-combobox-empty">Loading...</p> : null}
          {!loading && shown.length ? shown.map((option, index) => {
            const selectedOption = option.value === selectedValue;
            return (
              <button
                type="button"
                key={option.value}
                id={`${listId}-${option.value}`}
                role="option"
                aria-selected={selectedOption}
                className={index === activeIndex ? "active" : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(option.value)}
              >
                <span><strong>{option.label}</strong>{option.detail ? <small>{option.detail}</small> : null}</span>
                {selectedOption ? <Check size={15} aria-hidden="true" /> : null}
              </button>
            );
          }) : null}
          {!loading && !shown.length ? <p className="ceter-combobox-empty">{emptyText}</p> : null}
          {createLabel && onCreate ? (
            <button type="button" className="create" onMouseDown={(event) => event.preventDefault()} onClick={onCreate}>
              <Plus size={15} aria-hidden="true" />
              <strong>{createLabel}</strong>
            </button>
          ) : null}
        </div>,
        document.body
      ) : null}
    </label>
  );
}
