import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationSystem } from "@/components/NotificationSystem";
import { Providers } from "@/components/Providers";
import { SiteChrome } from "@/components/SiteChrome";
import { SITE_LOGO_PATH, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ceter Technologies Limited | Printers and Photocopiers in Nairobi",
    template: "%s | Ceter Technologies Limited"
  },
  description: "Shop printers, photocopiers, toners, spare parts and printer repair services from Ceter Technologies in Nairobi.",
  alternates: { canonical: SITE_URL },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined
  },
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
    url: SITE_URL,
    siteName: "Ceter Technologies Limited",
    images: [{ url: SITE_LOGO_PATH, width: 1200, height: 480, alt: "Ceter Technologies Limited" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Ceter Technologies Limited",
    description: "Office printing equipment, consumables and IT services in Nairobi.",
    images: [SITE_LOGO_PATH]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
