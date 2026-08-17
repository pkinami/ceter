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
