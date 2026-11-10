"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function AdminActionMenu({ label = "Row actions", children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeForAnotherMenu = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("ceter:action-menu-open", closeForAnotherMenu);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("ceter:action-menu-open", closeForAnotherMenu);
    };
  }, []);

  const toggle = () => {
    if (!open) window.dispatchEvent(new Event("ceter:action-menu-open"));
    setOpen((value) => !value);
  };

  return (
    <div ref={root} className="ceter-admin-action-menu" data-open={open || undefined}>
      <button type="button" className="ceter-admin-action-menu-trigger" aria-label={label} aria-expanded={open} aria-haspopup="menu" onClick={toggle}>
        <span aria-hidden="true">&#8942;</span>
      </button>
      {open ? <div role="menu" onClick={() => setOpen(false)}>{children}</div> : null}
    </div>
  );
}
