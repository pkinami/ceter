"use client";

import { ReactNode, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

type AsyncButtonProps = {
  children: ReactNode;
  successMessage: string;
  errorMessage?: string;
  className?: string;
  variant?: "primary" | "secondary";
  onAction?: () => Promise<void> | void;
};

export function AsyncButton({ children, successMessage, errorMessage, className, variant = "primary", onAction }: AsyncButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  async function runAction() {
    setState("loading");
    try {
      if (onAction) await onAction();
      else await new Promise((resolve) => setTimeout(resolve, 650));
    } catch {
      setState("idle");
      toast.error(errorMessage ?? "Action failed", { action: { label: "Retry", onClick: runAction } });
      return;
    }
    setState("success");
    if (!onAction) toast.success(successMessage);
    window.setTimeout(() => setState("idle"), 950);
  }

  return (
    <button
      type="button"
      disabled={state === "loading"}
      onClick={runAction}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-70",
        variant === "primary" ? "bg-signal text-white hover:bg-teal-700" : "border border-slate-300 bg-white text-ink hover:bg-slate-50",
        state === "success" && "scale-[1.03]",
        className
      )}
    >
      {state === "loading" ? <LoadingSpinner /> : state === "success" ? <Check className="h-4 w-4" /> : children}
    </button>
  );
}
