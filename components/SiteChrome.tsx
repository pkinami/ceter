import type { ReactNode } from "react";

export function SiteChrome({ header, footer, children, chrome = true }: { header: ReactNode; footer: ReactNode; children: ReactNode; chrome?: boolean }) {
  if (!chrome) return <>{children}</>;

  return (
    <>
      {header}
      <main>{children}</main>
      {footer}
    </>
  );
}
