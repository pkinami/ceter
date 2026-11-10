"use client";

import { ReactNode, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

type AsyncButtonProps = {
  children: ReactNode;
  successMessage?: string;
  pendingText?: string;
  errorMessage?: string;
  className?: string;
  variant?: "primary" | "secondary";
  onAction?: () => Promise<void | { status: "success" | "pending"; message?: string; href?: string }> | void | { status: "success" | "pending"; message?: string; href?: string };
};

export function AsyncButton({ children, successMessage, pendingText = "Processing...", errorMessage, className, variant = "primary", onAction }: AsyncButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "pending" | "error">("idle");
  const [outcome, setOutcome] = useState("");

  async function runAction() {
    if (state === "loading") return;
    setState("loading");
    try {
      if (!onAction) throw new Error("No action is configured.");
      const result = await onAction();
      if (result?.status === "pending") {
        const message = result.message ?? "The request is still being verified. Check its status before retrying.";
        setOutcome(message);
        setState("pending");
        toast.info(message, result.href ? { duration: 10000, action: { label: "Check status", onClick: () => window.location.assign(result.href!) } } : { duration: 10000 });
        return;
      }
      const message = result?.message ?? successMessage;
      if (!message) throw new Error("The action completed without a confirmed outcome.");
      setOutcome(message);
      setState("success");
      toast.success(message, result?.href ? { action: { label: "Open", onClick: () => window.location.assign(result.href!) } } : undefined);
      window.setTimeout(() => setState("idle"), 1800);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : errorMessage ?? "Action failed. Please try again.";
      setOutcome(message);
      setState("error");
      toast.error(message);
      window.setTimeout(() => setState("idle"), 3500);
      return;
    }
  }

  return (
    <button
      type="button"
      disabled={state === "loading" || state === "pending"}
      aria-busy={state === "loading" || state === "pending"}
      onClick={runAction}
      className={cn(
        "relative inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-70",
        variant === "primary" ? "bg-signal text-white hover:bg-teal-700" : "border border-slate-300 bg-white text-ink hover:bg-slate-50",
        className
      )}
    >
      <span className={state === "idle" ? "inline-flex items-center gap-2" : "invisible inline-flex items-center gap-2"}>{children}</span>
      {state === "loading" || state === "pending" ? <span className="absolute inset-0 inline-flex items-center justify-center gap-2"><LoadingSpinner label={state === "pending" ? outcome : pendingText} />{state === "pending" ? outcome : pendingText}</span> : null}
      {state === "success" ? <Check className="absolute h-4 w-4" aria-hidden="true" /> : null}
      {state === "error" ? <CircleAlert className="absolute h-4 w-4" aria-hidden="true" /> : null}
      <span className="sr-only" role="status" aria-live="polite">{state === "loading" ? pendingText : outcome}</span>
    </button>
  );
}
