import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LegalPage } from "@/lib/legal-markdown";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Terms and Conditions",
  description: "Read the Ceter Technologies Terms and Conditions for website use, product orders, payments, delivery, returns and service quotations in Kenya.",
  path: "/terms-conditions"
});

export default async function TermsConditionsPage() {
  const markdown = await readFile(join(process.cwd(), "Ceter_Technologies_Terms_and_Conditions.md"), "utf8");

  return <LegalPage markdown={markdown} label="Website and sales terms" />;
}
