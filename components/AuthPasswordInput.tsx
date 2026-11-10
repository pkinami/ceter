"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function AuthPasswordInput({ id, name = "password", autoComplete = "current-password", placeholder = "Password" }: { id: string; name?: string; autoComplete?: string; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return <span className="ceter-auth-password"><input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} required minLength={6} /><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></span>;
}
