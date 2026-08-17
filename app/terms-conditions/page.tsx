import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LegalMarkdown } from "@/lib/legal-markdown";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Terms and Conditions",
  description: "Read the Ceter Technologies Terms and Conditions for website use, product orders, payments, delivery, returns and service quotations in Kenya.",
  path: "/terms-conditions"
});

export default async function TermsConditionsPage() {
  const markdown = await readFile(join(process.cwd(), "Ceter_Technologies_Terms_and_Conditions.md"), "utf8");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <LegalMarkdown markdown={markdown} />
    </main>
  );
}
