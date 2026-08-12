"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

export function FormSubmitButton({
  children,
  pendingText = "Saving...",
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      disabled={pending || disabled}
      className={cn("inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70", className)}
      aria-live="polite"
    >
      {pending ? (
        <>
          <LoadingSpinner />
          {pendingText}
        </>
      ) : children}
    </button>
  );
}
