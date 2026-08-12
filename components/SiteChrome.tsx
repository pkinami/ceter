"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const admin = pathname?.startsWith("/admin");

  return (
    <>
      {admin ? null : header}
      <main>{children}</main>
      {admin ? null : footer}
    </>
  );
}
