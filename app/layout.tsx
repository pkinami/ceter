import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationSystem } from "@/components/NotificationSystem";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ceter Technologies Limited | Office Printing Equipment Nairobi",
    template: "%s | Ceter Technologies Limited"
  },
  description: "Nairobi supplier of photocopiers, printers, toners, spare parts and office print services."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <NotificationSystem />
        </Providers>
      </body>
    </html>
  );
}
