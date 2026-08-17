"use client";

import { ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="tooltip-label pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded bg-slate-950 px-2.5 py-1.5 text-center text-xs font-medium text-white opacity-0 shadow-lg transition duration-200 group-focus-within:block group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
}
