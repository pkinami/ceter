import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ActionFeedback({ success, error, href, linkLabel }: { success?: string; error?: string; href?: string; linkLabel?: string }) {
  if (!success && !error) return null;
  const failed = Boolean(error);
  return <section className={`ceter-action-feedback ${failed ? "error" : "success"}`} role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"}>
    {failed ? <AlertCircle aria-hidden="true" size={20} /> : <CheckCircle2 aria-hidden="true" size={20} />}
    <div><strong>{failed ? "Action needs attention" : "Completed successfully"}</strong><p>{error ?? success}</p>{!failed && href ? href.startsWith("/api/") ? <a href={href} target="_blank" rel="noreferrer">{linkLabel ?? "Open document"}</a> : <Link href={href}>{linkLabel ?? "View record"}</Link> : null}</div>
  </section>;
}
