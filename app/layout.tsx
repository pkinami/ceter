import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationSystem } from "@/components/NotificationSystem";
import { Providers } from "@/components/Providers";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Ceter Technologies Limited | Office Printing Equipment Nairobi",
    template: "%s | Ceter Technologies Limited"
  },
  description: "Nairobi supplier of photocopiers, printers, toners, spare parts and office print services.",
  icons: {
    icon: [
      { url: "/ceter-logo-pack/favicon/favicon.ico" },
      { url: "/ceter-logo-pack/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/ceter-logo-pack/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/ceter-logo-pack/favicon/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/ceter-logo-pack/favicon/favicon-96.png", sizes: "96x96", type: "image/png" }
    ],
    apple: [{ url: "/ceter-logo-pack/app-icon/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: "Ceter Technologies Limited",
    description: "Office printing equipment, consumables and IT services in Nairobi.",
    images: [{ url: "/ceter-logo-pack/lockup/ceter-logo-horizontal-1200.png", width: 1200, height: 480, alt: "Ceter Technologies Limited" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Ceter Technologies Limited",
    description: "Office printing equipment, consumables and IT services in Nairobi.",
    images: ["/ceter-logo-pack/lockup/ceter-logo-horizontal-1200.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#0B1E39"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteChrome header={<Header />} footer={<Footer />}>
            {children}
          </SiteChrome>
          <NotificationSystem />
        </Providers>
      </body>
    </html>
  );
}
