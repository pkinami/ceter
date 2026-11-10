"use client";

import { useRef, useState, type ReactNode } from "react";

export function OtpVerificationForm({ action, email, submitLabel = "Verify OTP", children }: { action: (formData: FormData) => void | Promise<void>; email: string; submitLabel?: string; children?: ReactNode }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const change = (index: number, value: string) => { const digit = value.replace(/\D/g, "").slice(-1); const next = [...digits]; next[index] = digit; setDigits(next); if (digit && index < 5) inputs.current[index + 1]?.focus(); };
  return <form action={action} className="ceter-auth-form"><input type="hidden" name="email" value={email} /><input type="hidden" name="token" value={digits.join("")} /><label className="ceter-otp-label">Please Enter OTP</label><div className="ceter-otp-inputs">{digits.map((digit, index) => <input key={index} ref={(node) => { inputs.current[index] = node; }} value={digit} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} aria-label={`OTP digit ${index + 1}`} onChange={(event) => change(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus(); }} required />)}</div>{children}<button className="ceter-auth-primary" disabled={digits.join("").length !== 6}>{submitLabel}</button></form>;
}
