"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Announces client-side navigation after a short delay to avoid flashes on fast transitions. */
export function RouteStatusIndicator() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      setPending(false);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPending(true), 180);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", clear);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", clear);
      clear();
    };
  }, []);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPending(false);
  }, [pathname]);

  return pending ? (
    <div className="ceter-route-progress" role="status" aria-live="polite" aria-label="Loading page">
      <span />
      <span className="sr-only">Loading page</span>
    </div>
  ) : null;
}
