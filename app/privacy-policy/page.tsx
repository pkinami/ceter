import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LegalPage } from "@/lib/legal-markdown";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Privacy Policy",
  description: "Read the Ceter Technologies Privacy Policy for how customer, order, quotation and service data is handled under Kenya data protection law.",
  path: "/privacy-policy"
});

export default async function PrivacyPolicyPage() {
  const markdown = await readFile(join(process.cwd(), "Ceter_Technologies_Privacy_Policy.md"), "utf8");

  return <LegalPage markdown={markdown} label="Privacy and data protection" />;
}
