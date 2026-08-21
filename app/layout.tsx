import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationSystem } from "@/components/NotificationSystem";
import { Providers } from "@/components/Providers";
import { SiteChrome } from "@/components/SiteChrome";
import { SITE_DESCRIPTION, SITE_LOGO_PATH, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/ceter-logo-pack/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/ceter-logo-pack/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/ceter-logo-pack/favicon/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/ceter-logo-pack/favicon/favicon-96.png", sizes: "96x96", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: SITE_LOGO_PATH, width: 1200, height: 461, alt: SITE_NAME }]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
