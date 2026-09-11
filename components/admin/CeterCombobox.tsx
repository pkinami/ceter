"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === selectedValue);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? options.filter((option) => `${option.label} ${option.detail ?? ""}`.toLowerCase().includes(needle))
      : options;
    return filtered.slice(0, 24);
  }, [options, query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function commit(next: string) {
    if (!controlled) setInternalValue(next);
    onChange?.(next);
    setQuery("");
    setOpen(false);
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
      <div className="ceter-combobox-control" aria-expanded={open} aria-haspopup="listbox">
        <Search size={15} aria-hidden="true" />
        <input
          ref={inputRef}
          value={query || selected?.label || ""}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label ?? placeholder}
        />
        {loading ? <Loader2 className="ceter-combobox-spinner" size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
      </div>
      {open ? (
        <div className="ceter-combobox-menu" role="listbox">
          {loading ? <p className="ceter-combobox-empty">Loading...</p> : null}
          {!loading && shown.length ? shown.map((option, index) => {
            const selectedOption = option.value === selectedValue;
            return (
              <button
                type="button"
                key={option.value}
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
        </div>
      ) : null}
    </label>
  );
}
