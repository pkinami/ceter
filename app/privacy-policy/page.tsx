import type { Metadata } from "next";
import { LegalPage, privacyPolicyDocument } from "@/lib/legal-pages";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Privacy Policy",
  description: "Read the Ceter Technologies Privacy Policy for how customer, order, quotation and service data is handled under Kenya data protection law.",
  path: "/privacy-policy"
});

export default function PrivacyPolicyPage() {
  return <LegalPage document={privacyPolicyDocument} />;
}
