import type { ReactNode } from "react";

export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  return (
    <>
      {header}
      <main>{children}</main>
      {footer}
    </>
  );
}
