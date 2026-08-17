import type { ReactNode } from "react";
import { LegalDocumentLayout, type LegalDocument } from "@/components/LegalDocumentLayout";

const contactRows = [
  ["Email", "info@cetertechnologies.com"],
  ["Telephone / WhatsApp", "+254 707 143 322"],
  ["Website", "www.cetertechnologies.com"]
];

export const privacyPolicyDocument: LegalDocument = {
  title: "Privacy Policy",
  label: "Privacy and data protection",
  description: "How Ceter Technologies collects, uses and protects customer information.",
  company: "Ceter Technologies Limited",
  effectiveDate: "August 17, 2026",
  lastReviewed: "August 2026",
  sections: [
    {
      id: "introduction",
      title: "1. Introduction",
      content: (
        <>
          <p>
            Ceter Technologies Limited (<strong>&quot;Ceter&quot;</strong>, <strong>&quot;we&quot;</strong>, <strong>&quot;us&quot;</strong>, <strong>&quot;our&quot;</strong>) supplies office printing equipment, consumables, spare parts, and related IT services and solutions to individuals, businesses, institutions, and government entities in Kenya, through our website at cetertechnologies.com (the <strong>&quot;Site&quot;</strong>), WhatsApp, and our physical premises.
          </p>
          <p>
            This Privacy Policy explains what personal data we collect, why we collect it, how we use and protect it, and the rights you have over it. It is written to comply with the Data Protection Act, No. 24 of 2019, the Data Protection (General) Regulations, 2021, and related subsidiary legislation of Kenya.
          </p>
          <p>
            By using the Site, creating an account, placing an order, requesting a quotation, or otherwise providing us with personal data, you acknowledge that you have read and understood this Policy.
          </p>
        </>
      )
    },
    {
      id: "who-we-are",
      title: "2. Who We Are",
      content: (
        <>
          <p>Ceter Technologies Limited is a company incorporated in Kenya.</p>
          <InfoTable rows={[["Data protection contact", "info@cetertechnologies.com"], ["Telephone / WhatsApp", "+254 707 143 322"], ["Website", "www.cetertechnologies.com"]]} />
          <p>
            For the purposes of the Data Protection Act, 2019, Ceter Technologies Limited is the <strong>data controller</strong> for the personal data described in this Policy, and in some cases may act as a <strong>data processor</strong> where we process data strictly on the instructions of an institutional client under a service contract.
          </p>
        </>
      )
    },
    {
      id: "scope",
      title: "3. Scope",
      content: (
        <>
          <p>This Policy applies to personal data we collect through:</p>
          <LegalList items={["the Site, including account registration, checkout, and order tracking", "WhatsApp orders and enquiries sent to our published business number", "quotation and tender requests, whether submitted online, by email, or in person", "our service and maintenance operations, including installation visits, service calls, and warranty claims", "our social media pages, where you interact with us directly", "correspondence by phone, email, or in person at our premises"]} />
          <p>It does not apply to websites or services operated by third parties that we link to or that link to us, or to the internal HR data of our own employees, which is governed separately.</p>
        </>
      )
    },
    {
      id: "information-we-collect",
      title: "4. Information We Collect",
      content: (
        <>
          <h3>4.1 Information you give us directly</h3>
          <LegalList
            items={[
              <><strong>Account information:</strong> name, email address, phone number, delivery and billing address, and a password stored in encrypted or hashed form.</>,
              <><strong>Order and quotation information:</strong> products or services ordered or enquired about, quantities, delivery instructions, purchase order or LPO references, and, for institutional and government clients, organisation name, procurement contact details, and KRA PIN where required for invoicing.</>,
              <><strong>Payment information:</strong> for M-Pesa payments, the transaction reference and phone number used; for card payments, our third-party payment processor handles and stores your card details directly. We do not store full card numbers on our own systems.</>,
              <><strong>Communications:</strong> messages you send us through the Site, WhatsApp, email, phone, or in person, including for customer support, warranty claims, or service requests.</>,
              <><strong>Service and warranty records:</strong> equipment serial numbers, installation and service history, and warranty status, where you purchase equipment or a maintenance contract from us.</>
            ]}
          />
          <h3>4.2 Information collected automatically</h3>
          <p>When you visit the Site, we and service providers acting on our behalf may automatically collect:</p>
          <LegalList items={["IP address, browser type and version, device type, and operating system", "pages viewed, time spent on the Site, and referring website", "cookies and similar technologies, as described in Section 6"]} />
          <h3>4.3 Information from third parties</h3>
          <LegalList items={["Payment confirmation from our payment service providers.", "Delivery status from courier or logistics partners engaged to deliver your order.", "Publicly available business information where we are responding to a formal tender."]} />
        </>
      )
    },
    {
      id: "how-we-use-your-information",
      title: "5. How We Use Your Information",
      content: (
        <>
          <p>We process personal data only where we have a lawful basis to do so under the Data Protection Act, 2019. The table below summarises our main purposes and the corresponding lawful basis.</p>
          <InfoTable
            rows={[
              ["Creating and managing your account", "Performance of a contract"],
              ["Processing and fulfilling orders, quotations, and tenders", "Performance of a contract"],
              ["Processing payments and preventing fraud", "Performance of a contract; legitimate interest"],
              ["Delivering products and coordinating installation or service visits", "Performance of a contract"],
              ["Providing warranty support and honouring service contracts", "Performance of a contract"],
              ["Responding to enquiries and customer support requests", "Performance of a contract; legitimate interest"],
              ["Maintaining accounting, tax, and statutory records", "Legal obligation"],
              ["Sending order confirmations, receipts, and service notices", "Performance of a contract"],
              ["Sending marketing communications or newsletters", "Consent"],
              ["Website analytics and improving the Site", "Legitimate interest; consent for non-essential cookies"],
              ["Preventing fraud, misuse, and securing our systems", "Legitimate interest"]
            ]}
            headings={["Purpose", "Lawful basis"]}
          />
          <p>We do not use your personal data for any purpose incompatible with the purposes above without informing you and, where required, obtaining your consent.</p>
        </>
      )
    },
    {
      id: "cookies-and-similar-technologies",
      title: "6. Cookies and Similar Technologies",
      content: (
        <>
          <p>The Site uses cookies and similar technologies to operate correctly and to understand how it is used.</p>
          <LegalList
            items={[
              <><strong>Strictly necessary cookies</strong> are required for core functions such as keeping you signed in, remembering items in your cart, and maintaining session security.</>,
              <><strong>Analytics cookies</strong> help us understand how visitors use the Site so we can improve it, where enabled.</>,
              <><strong>Advertising cookies</strong> may be used to measure advertising effectiveness where we run advertising through platforms such as Google Ads.</>
            ]}
          />
          <p>You can control or disable cookies through your browser settings. Disabling strictly necessary cookies may prevent parts of the Site, such as the cart and checkout, from working correctly.</p>
        </>
      )
    },
    {
      id: "how-we-share-your-information",
      title: "7. How We Share Your Information",
      content: (
        <>
          <p>We do not sell your personal data. We share personal data only where necessary, with:</p>
          <LegalList items={["payment service providers, to process M-Pesa, card, and bank payments", "delivery and logistics partners, to fulfil and deliver your order", "hosting and infrastructure providers, who store and process data on our behalf under contractual data protection obligations", "manufacturers and authorised distributors, where necessary to process a warranty claim or enrich a product listing", "professional advisers, such as auditors, accountants, or lawyers, where necessary and under confidentiality obligations", "government and regulatory authorities where required by law", "a buyer or successor, in the event of a merger, acquisition, or sale of all or part of our business"]} />
        </>
      )
    },
    {
      id: "international-data-transfers",
      title: "8. International Data Transfers",
      content: <p>Our Site is hosted using third-party infrastructure providers, which may store or process data outside Kenya, including in the United States. Where personal data is transferred outside Kenya, we take steps required under the Data Protection Act, 2019 to ensure it remains protected.</p>
    },
    {
      id: "data-retention",
      title: "9. Data Retention",
      content: (
        <>
          <p>We retain personal data only for as long as necessary for the purposes described in this Policy:</p>
          <LegalList items={[<><strong>Account data</strong> is retained for as long as your account remains active, and for a reasonable period after closure.</>, <><strong>Order, invoice, and payment records</strong> are retained for at least five years from the end of the relevant financial year, in line with Kenyan tax law.</>, <><strong>Warranty and service records</strong> are retained for the duration of the applicable warranty or service contract, and for a reasonable period afterward.</>, <><strong>Marketing data</strong> is retained until you withdraw consent or unsubscribe.</>]} />
          <p>Where data is no longer needed, we delete or anonymise it, except where we are required by law to retain it for longer.</p>
        </>
      )
    },
    {
      id: "data-security",
      title: "10. Data Security",
      content: <p>We apply technical and organisational measures appropriate to the sensitivity of the data we hold, including encrypted transmission, encrypted or hashed password storage, restricted staff access, and role-based access controls. No system is completely secure, but we review our safeguards on an ongoing basis.</p>
    },
    {
      id: "your-rights",
      title: "11. Your Rights",
      content: (
        <>
          <p>Under the Data Protection Act, 2019, you have the right to:</p>
          <LegalList items={["be informed of how your personal data is being used", "access the personal data we hold about you", "request correction of inaccurate or outdated personal data", "request deletion of your personal data, subject to legal retention obligations", "object to, or request that we restrict, processing in certain circumstances", "request a copy of your personal data in a portable format", "withdraw consent at any time where processing is based on consent", "lodge a complaint with the Office of the Data Protection Commissioner"]} />
          <p>To exercise any of these rights, contact us using the details in Section 16. We may need to verify your identity before actioning a request.</p>
        </>
      )
    },
    { id: "childrens-privacy", title: "12. Children's Privacy", content: <p>The Site and our services are directed at businesses, institutions, and adult consumers, and are not intended for use by children. We do not knowingly collect personal data from anyone under 18 years of age.</p> },
    { id: "marketing-communications", title: "13. Marketing Communications", content: <p>Where you have opted in, we may send you order updates, product news, and promotional offers by email, SMS, or WhatsApp. You can withdraw your consent and unsubscribe at any time.</p> },
    { id: "third-party-links", title: "14. Third-Party Links", content: <p>The Site may contain links to third-party websites, including manufacturer websites and social media platforms. We are not responsible for the privacy practices of those third parties.</p> },
    { id: "changes-to-this-policy", title: "15. Changes to This Policy", content: <p>We may update this Policy from time to time to reflect changes in our practices or in the law. The Last reviewed date at the top of this Policy indicates when it was last updated.</p> },
    {
      id: "how-to-contact-us",
      title: "16. How to Contact Us",
      content: (
        <>
          <p>For questions about this Policy or to exercise your data protection rights, contact us at:</p>
          <ContactBlock />
        </>
      )
    },
    {
      id: "complaints-to-the-regulator",
      title: "17. Complaints to the Regulator",
      content: (
        <>
          <p>If you are not satisfied with how we have handled your personal data, you have the right to lodge a complaint with:</p>
          <p><strong>Office of the Data Protection Commissioner (ODPC)</strong><br />Britam Towers, Upper Hill, Nairobi, Kenya<br />Website: www.odpc.go.ke</p>
          <p>We would appreciate the opportunity to address your concern directly first. Please contact us using the details in Section 16.</p>
        </>
      )
    }
  ]
};

export const termsDocument: LegalDocument = {
  title: "Terms and Conditions",
  label: "Website and sales terms",
  description: "The terms governing use of Ceter Technologies products and services.",
  company: "Ceter Technologies Limited",
  effectiveDate: "August 17, 2026",
  lastReviewed: "August 2026",
  sections: [
    { id: "introduction-and-acceptance", title: "1. Introduction and Acceptance", content: <><p>These Terms and Conditions (<strong>&quot;Terms&quot;</strong>) govern your use of cetertechnologies.com and any purchase of products or services from Ceter Technologies Limited, whether placed through the Site, via WhatsApp, by email, or in person.</p><p>By browsing the Site, creating an account, placing an order, or accepting a quotation, you agree to be bound by these Terms. If you do not agree, please do not use the Site or place an order. These Terms are governed by the laws of the Republic of Kenya.</p><p>Nothing in these Terms limits any right you have under the Consumer Protection Act, No. 46 of 2012, or any other law that cannot lawfully be excluded or limited by agreement.</p></> },
    { id: "about-us", title: "2. About Us", content: <><p>Ceter Technologies Limited is a supplier of office printing equipment, consumables, spare parts, and related IT services and business solutions, based in Nairobi, Kenya.</p><InfoTable rows={contactRows} /></> },
    { id: "definitions", title: "3. Definitions", content: <LegalList items={[<><strong>&quot;Products&quot;</strong> means any physical goods offered for sale on the Site, including printers, photocopiers, toners, ink, spare parts, and accessories.</>, <><strong>&quot;Services&quot;</strong> means any installation, maintenance, managed print, IT, or consulting service offered by Ceter.</>, <><strong>&quot;Order&quot;</strong> means a request to purchase Products or Services submitted through the Site, via WhatsApp, or in writing.</>, <><strong>&quot;Customer&quot;</strong>, <strong>&quot;you&quot;</strong>, and <strong>&quot;your&quot;</strong> mean the person or organisation placing an Order or using the Site.</>]} /> },
    { id: "eligibility-and-account-registration", title: "4. Eligibility and Account Registration", content: <><p>You must be at least 18 years old, or placing an Order on behalf of a business or institution with the authority to do so, to use the Site or place an Order.</p><p>If you create an account, you agree to:</p><LegalList items={["provide accurate, current, and complete information", "keep your login credentials confidential and not share your account with others", "notify us immediately of any unauthorised use of your account", "accept responsibility for all activity that occurs under your account, except where caused by our own security failure"]} /><p>We may suspend or terminate an account that we reasonably believe has been used fraudulently, in breach of these Terms, or in a manner that puts our systems, staff, or other customers at risk.</p></> },
    { id: "products-and-pricing", title: "5. Products and Pricing", content: <LegalList items={["All prices on the Site are displayed in Kenya Shillings (KES) and, unless stated otherwise, are inclusive of VAT at the applicable statutory rate.", "We take reasonable care to ensure product descriptions, specifications, and images are accurate, but manufacturer specifications, packaging, and images may change without notice.", "We supply genuine, original equipment and consumables sourced through manufacturer or authorised-distributor channels, unless a Product is explicitly listed as refurbished.", "Prices and product availability may change at any time without notice.", "We reserve the right to correct a pricing or listing error, and to cancel or amend an Order affected by such an error."]} /> },
    { id: "orders", title: "6. Orders", content: <LegalList items={["Placing an Order through the Site, WhatsApp, or in writing is an offer by you to purchase the relevant Products or Services. No contract exists until we confirm your Order in writing.", "We may decline or cancel an Order at our discretion, including where a Product is out of stock, where we suspect fraud, where a pricing error has occurred, or where payment cannot be verified.", "Orders placed via WhatsApp are subject to these Terms in the same way as Orders placed through the Site.", "For institutional, corporate, and government clients, an Order may take the form of a signed quotation, LPO, or separate written contract, which will govern to the extent its terms conflict with these Terms."]} /> },
    { id: "payment", title: "7. Payment", content: <LegalList items={["We accept payment by M-Pesa, debit or credit card through our payment service provider, and bank transfer.", "Unless you hold an approved institutional credit account with Ceter, payment in full is required before an Order is dispatched or a Service is scheduled.", "Approved institutional and government clients may be extended invoice or credit terms under a separate agreement or as stated on an accepted quotation.", "We do not store your full card details; card payments are processed by our licensed third-party payment service provider.", "Quotations are valid for the period stated on the quotation, or for 30 days from the date of issue if no period is stated."]} /> },
    { id: "delivery", title: "8. Delivery", content: <LegalList items={["We aim to deliver stocked Products within Nairobi within 24-48 hours of a confirmed Order, and to other counties within 3-5 working days, unless a different timeframe is agreed in writing. These are estimates, not guaranteed delivery windows.", "Delivery timeframes for Products requiring importation, special order, or manufacturer lead time will be confirmed with you in writing at the time of Order.", "You are responsible for providing an accurate delivery address and ensuring someone authorised is available to receive the delivery."]} /> },
    { id: "risk-and-title", title: "9. Risk and Title", content: <p>Risk in a Product passes to you upon delivery and signature by you or your authorised representative. Title in a Product passes to you only once we have received payment in full for that Product.</p> },
    { id: "returns-refunds-and-warranty", title: "10. Returns, Refunds and Warranty", content: <LegalList items={["Equipment we supply carries the manufacturer's standard warranty, typically twelve months against manufacturing defects unless otherwise stated at the time of purchase.", "If a Product arrives damaged, defective, or not as described, please contact us within a reasonable time of delivery.", "For change-of-mind returns on unopened, unused Products in original packaging, contact us within 7 days of delivery; we may charge a reasonable restocking or return delivery fee.", "Consumables that have been opened or installed cannot be returned for change of mind, but remain covered by warranty if defective.", "Refunds are issued using the original payment method where possible, within a reasonable time of the return being approved.", "Nothing in this section limits any right or remedy available to you under applicable law."]} /> },
    { id: "service-agreements-and-managed-print-services", title: "11. Service Agreements and Managed Print Services", content: <p>Installation, maintenance, Managed Print Services, and similar ongoing services are provided under the specific service levels, pricing, and terms set out in the relevant signed service agreement or accepted quotation. Where such an agreement exists, it governs the relevant service to the extent it conflicts with these general Terms.</p> },
    { id: "quotations-and-tenders", title: "12. Quotations and Tenders", content: <p>Quotations issued by Ceter, including those prepared for public procurement or tender purposes, are valid for the period stated on the quotation. A quotation does not constitute a binding contract until formally accepted in writing.</p> },
    { id: "cancellations", title: "13. Cancellations", content: <p>You may request cancellation of an Order at any time before it has been dispatched or before a Service has commenced, by contacting us. Once a Product has been dispatched or a Service has commenced, cancellation is subject to the returns, refund, warranty, or service agreement terms that apply.</p> },
    { id: "intellectual-property", title: "14. Intellectual Property", content: <p>All content on the Site, including text, graphics, logos, product descriptions we have written, and the Ceter Technologies name and mark, is owned by or licensed to Ceter and is protected by applicable intellectual property law.</p> },
    { id: "acceptable-use", title: "15. Acceptable Use", content: <p>You agree not to use the Site to submit fraudulent Orders or payment information, attempt to gain unauthorised access to our systems or another user&apos;s account, scrape or misuse Site content or pricing data, or otherwise use the Site in a way that breaches Kenyan law.</p> },
    { id: "third-party-brands-and-trademarks", title: "16. Third-Party Brands and Trademarks", content: <p>Product names, brand names, and logos of manufacturers referenced on the Site are the trademarks of their respective owners and are used solely to identify genuine products we supply.</p> },
    { id: "limitation-of-liability", title: "17. Limitation of Liability", content: <><p>To the maximum extent permitted by Kenyan law:</p><LegalList items={["our total liability to you arising from any Order shall not exceed the total amount you paid for the Products or Services giving rise to the claim", "we are not liable for indirect, incidental, or consequential loss, except where such loss arises directly from our negligence or breach of contract", "nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence, fraud, or any liability that cannot lawfully be excluded or limited"]} /></> },
    { id: "indemnity", title: "18. Indemnity", content: <p>You agree to indemnify and hold Ceter harmless against any claim, loss, or expense arising from your breach of these Terms, your misuse of the Site, or your provision of false or misleading information in connection with an Order.</p> },
    { id: "force-majeure", title: "19. Force Majeure", content: <p>We are not liable for any delay or failure to perform our obligations where this is caused by circumstances beyond our reasonable control, including natural disaster, government action, power or network outages, import or supply chain disruption, or industrial action.</p> },
    { id: "privacy", title: "20. Privacy", content: <p>Our collection and use of your personal data is governed by our Privacy Policy, available at <a href="/privacy-policy">/privacy-policy</a>, which forms part of these Terms.</p> },
    { id: "governing-law-and-dispute-resolution", title: "21. Governing Law and Dispute Resolution", content: <p>These Terms are governed by the laws of the Republic of Kenya. We encourage you to contact us first to resolve any dispute informally. If a dispute cannot be resolved through good-faith discussion, the courts of Kenya shall have exclusive jurisdiction.</p> },
    { id: "general-provisions", title: "22. General Provisions", content: <LegalList items={[<><strong>Severability:</strong> If any provision is found to be unenforceable, the remaining provisions continue in full force.</>, <><strong>No waiver:</strong> Our failure to enforce a provision at any time does not waive our right to enforce it later.</>, <><strong>Assignment:</strong> You may not assign your rights or obligations without our written consent.</>, <><strong>Entire agreement:</strong> These Terms, together with our Privacy Policy and any signed service agreement or accepted quotation, constitute the entire agreement between you and Ceter.</>]} /> },
    { id: "changes-to-these-terms", title: "23. Changes to These Terms", content: <p>We may update these Terms from time to time to reflect changes in our business or in the law. The Last reviewed date at the top indicates when they were last updated.</p> },
    { id: "contact-us", title: "24. Contact Us", content: <ContactBlock /> }
  ]
};

export function LegalPage({ document }: { document: LegalDocument }) {
  return <LegalDocumentLayout document={document} />;
}

function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function InfoTable({ rows, headings = ["Detail", "Information"] }: { rows: string[][]; headings?: string[] }) {
  return (
    <div className="my-6">
      <div className="hidden overflow-hidden rounded-lg border border-line sm:block">
        <table>
          <thead>
            <tr>
              {headings.map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:hidden">
        {rows.map(([label, value]) => (
          <article key={label} className="rounded-lg border border-line bg-slate-50 p-4">
            <p className="my-0 text-xs font-black uppercase text-signal">{label}</p>
            <p className="my-0 mt-1 text-sm font-bold leading-6 text-ink">{value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ContactBlock() {
  return (
    <p>
      <strong>Ceter Technologies Limited</strong>
      <br />
      Email: info@cetertechnologies.com
      <br />
      Phone / WhatsApp: +254 707 143 322
    </p>
  );
}
