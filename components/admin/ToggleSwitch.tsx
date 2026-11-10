"use client";

import { useId } from "react";

type ToggleSwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: React.ReactNode;
  tone?: "default" | "light" | "dark";
};

/** A labelled checkbox that uses the shared Ceter on/off control. */
export function ToggleSwitch({ id, label, tone = "default", className, ...inputProps }: ToggleSwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <span className={`toggle-switch${tone === "default" ? "" : ` ${tone}`}${className ? ` ${className}` : ""}`}>
      <input {...inputProps} id={inputId} type="checkbox" className="toggle-input" />
      <label className="toggle-label" htmlFor={inputId}><span className="sr-only">{label}</span></label>
      <span className="toggle-switch-text">{label}</span>
    </span>
  );
}
