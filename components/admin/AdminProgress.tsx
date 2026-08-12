"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminProgressState = {
  label: string;
  stage?: string;
  percent?: number;
  status?: "running" | "success" | "error";
};

function percentText(percent?: number) {
  return typeof percent === "number" ? `${Math.max(0, Math.min(100, Math.round(percent)))}%` : null;
}

export function AdminProgress({ progress, compact = false }: { progress: AdminProgressState | null; compact?: boolean }) {
  if (!progress) return null;
  const text = percentText(progress.percent);
  const status = progress.status ?? "running";
  const Icon = status === "success" ? CheckCircle2 : status === "error" ? XCircle : Loader2;

  return (
    <div className={cn("rounded-md border px-3 py-2 text-xs", status === "error" ? "border-red-200 bg-red-50 text-red-800" : status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[#CFE9E5] bg-[#F1FBF9] text-[#38625E]")} role="status" aria-live="polite">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", status === "running" && "animate-spin")} />
        <span className="min-w-0 flex-1 truncate font-semibold">{progress.stage ?? progress.label}{text ? ` ${text}` : ""}</span>
        {text ? <span className="font-mono tabular-nums">{text}</span> : null}
      </div>
      {!compact ? <ProgressBar percent={progress.percent} status={status} /> : null}
    </div>
  );
}

export function ProgressBar({ percent, status = "running" }: { percent?: number; status?: AdminProgressState["status"] }) {
  const width = typeof percent === "number" ? `${Math.max(0, Math.min(100, percent))}%` : "42%";
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-[#CFE9E5]">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          typeof percent === "number" ? "bg-[#14B8A6]" : "w-[42%] animate-[admin-progress_1.2s_ease-in-out_infinite] bg-[#14B8A6]",
          status === "success" && "bg-emerald-500",
          status === "error" && "bg-red-500"
        )}
        style={typeof percent === "number" ? { width } : undefined}
      />
    </div>
  );
}

export function ProgressButton({
  children,
  progress,
  disabled,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  progress?: AdminProgressState | null;
}) {
  const running = progress?.status !== "success" && progress?.status !== "error" && Boolean(progress);
  const text = progress ? percentText(progress.percent) : null;

  return (
    <button
      {...props}
      disabled={disabled || running}
      className={cn("inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70", className)}
      aria-busy={running}
    >
      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {progress ? progress.stage ?? progress.label : children}
      {text ? <span className="font-mono tabular-nums">{text}</span> : null}
    </button>
  );
}
