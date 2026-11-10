"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

export function FormSubmitButton({
  children,
  pendingText = "Saving...",
  confirmMessage,
  className,
  disabled,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
  confirmMessage?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const activeLabel = pendingText.trim() || "Processing...";
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={pending || disabled}
      className={cn("relative inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70", className)}
      aria-busy={pending}
    >
      <span className={pending ? "invisible inline-flex items-center gap-2" : "inline-flex items-center gap-2"}>{children}</span>
      {pending ? <span className="absolute inset-0 inline-flex items-center justify-center gap-2" role="status"><LoadingSpinner label={activeLabel} />{activeLabel}</span> : null}
    </button>
  );
}
