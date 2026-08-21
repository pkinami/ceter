import type { Metadata } from "next";
import { LegalPage, termsDocument } from "@/lib/legal-pages";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Terms and Conditions",
  description: "Read the Ceter Technologies Limited Terms and Conditions for website use, product orders, payments, delivery, returns and service quotations in Kenya.",
  path: "/terms-conditions"
});

export default function TermsConditionsPage() {
  return <LegalPage document={termsDocument} />;
}
