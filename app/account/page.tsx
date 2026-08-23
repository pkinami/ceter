import { redirect } from "next/navigation";
import Link from "next/link";
import { CustomerStatusBadge } from "@/components/CustomerStatusBadge";
import { ProductImageFrame } from "@/components/ProductImageFrame";
import { signedBusinessDocumentUrl } from "@/lib/business/documents";
import { productImageRenderUrls } from "@/lib/product-image-urls";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";
import { generatePortalStatementAction } from "./actions";

export const metadata = {
  title: "Business Portal",
  robots: { index: false, follow: false }
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const profile = await prisma.profile.upsert({
    where: { id: userData.user.id },
    update: {},
    create: { id: userData.user.id, email: userData.user.email ?? null, role: "customer" }
  });
  const customer = await prisma.customer.findFirst({
    where: { profile_id: userData.user.id },
    include: {
      orders: { orderBy: { created_at: "desc" }, include: { order_items: { include: { product: true } } } },
      quotes: { orderBy: { created_at: "desc" }, include: { documents: true } },
      invoices: { orderBy: { created_at: "desc" }, include: { documents: true } },
      receipts: { orderBy: { issued_at: "desc" }, include: { documents: true, payment: true } },
      payments: { orderBy: { paid_at: "desc" } },
      documents: { where: { document_type: "customer_statement" }, orderBy: { created_at: "desc" }, take: 5 }
    }
  });
  const orders = await prisma.order.findMany({
    where: { user_id: userData.user.id },
    orderBy: { created_at: "desc" },
    include: { order_items: { include: { product: true } } }
  });
  const orderList = customer?.orders.length ? customer.orders : orders;
  const invoices = customer?.invoices ?? [];
  const payments = customer?.payments ?? [];
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0);
  const [quotesWithLinks, invoicesWithLinks, receiptsWithLinks, statementsWithLinks] = await Promise.all([
    Promise.all((customer?.quotes ?? []).map(async (quote) => ({ ...quote, documents: await signPortalDocuments(quote.documents) }))),
    Promise.all(invoices.map(async (invoice) => ({ ...invoice, documents: await signPortalDocuments(invoice.documents) }))),
    Promise.all((customer?.receipts ?? []).map(async (receipt) => ({ ...receipt, documents: await signPortalDocuments(receipt.documents) }))),
    signPortalDocuments(customer?.documents ?? [])
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-signal">Business Portal</p>
          <h1 className="mt-1 text-3xl font-black text-ink">Welcome, {customer?.name ?? profile.full_name ?? userData.user.email ?? "Customer"}</h1>
          <p className="mt-2 text-sm text-slate-500">{customer?.company_name ?? userData.user.email ?? "Account details unavailable"}</p>
        </div>
        <Link href="/account/edit" className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-bold text-ink hover:bg-slate-50">
          Edit Profile
        </Link>
      </section>
      {params.error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
      {params.success ? <p className="mb-4 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-800">{params.success}</p> : null}

      <section className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Outstanding balance" value={formatKes(outstanding)} />
        <SummaryCard label="Total orders" value={orderList.length} />
        <SummaryCard label="Total invoices" value={invoices.length} />
        <SummaryCard label="Recent payments" value={payments.slice(0, 5).length} />
        <SummaryCard label="Recent quotations" value={customer?.quotes.slice(0, 5).length ?? 0} />
      </section>

      <PortalSection title="My Orders">
        {orderList.length ? orderList.map((order) => (
          <article key={order.id} className="border-b border-line p-5 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-black text-ink">Order {order.id.slice(0, 8)}</p><p className="text-xs font-semibold uppercase text-slate-500">{order.created_at.toLocaleDateString("en-KE")}</p></div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="font-black text-signal">{formatKes(order.total_kes)}</p>
                <CustomerStatusBadge status={order.status} context="order" />
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              {order.order_items.map((item) => (
                <div key={item.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded bg-mist px-3 py-2">
                  <ProductImageFrame src={productImageRenderUrls(Array.isArray(item.product?.images) ? item.product.images.filter((image): image is string => typeof image === "string") : [])[0]} alt="" sizes="48px" className="h-12 w-12" imageClassName="p-1" />
                  <span className="min-w-0 break-words">{item.product?.name ?? "Product"} x {item.quantity}</span>
                  <strong className="text-right">{formatKes(item.price_at_purchase_kes * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </article>
        )) : <EmptyPortal title="No orders yet" action={<Link href="/category" className="btn-dark">Browse Products</Link>} />}
      </PortalSection>

      <PortalSection title="My Quotations">
        <PortalTable headers={["Quote", "Date", "Amount", "Status", "Actions"]}>
          {quotesWithLinks.map((quote) => <tr key={quote.id}><td>{quote.quote_number}</td><td>{quote.created_at.toLocaleDateString("en-KE")}</td><td>{formatKes(quote.total_kes)}</td><td><CustomerStatusBadge status={quote.status} context="quote" /></td><td><DocumentLink documents={quote.documents} /></td></tr>)}
        </PortalTable>
      </PortalSection>

      <PortalSection title="My Invoices">
        <PortalTable headers={["Invoice", "Date", "Amount", "Outstanding", "Status", "Actions"]}>
          {invoicesWithLinks.map((invoice) => <tr key={invoice.id}><td>{invoice.invoice_number}</td><td>{invoice.created_at.toLocaleDateString("en-KE")}</td><td>{formatKes(invoice.total_kes)}</td><td>{formatKes(invoice.balance_kes)}</td><td><CustomerStatusBadge status={invoice.status} context="invoice" /></td><td><DocumentLink documents={invoice.documents} /></td></tr>)}
        </PortalTable>
      </PortalSection>

      <PortalSection title="My Receipts">
        <PortalTable headers={["Receipt", "Payment date", "Amount", "Actions"]}>
          {receiptsWithLinks.map((receipt) => <tr key={receipt.id}><td>{receipt.receipt_number}</td><td>{receipt.issued_at.toLocaleDateString("en-KE")}</td><td>{formatKes(receipt.amount_kes)}</td><td><DocumentLink documents={receipt.documents} /></td></tr>)}
        </PortalTable>
      </PortalSection>

      <PortalSection title="My Statement">
        <form action={generatePortalStatementAction} className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input className="h-11 rounded-md border border-slate-300 px-3 text-sm" name="period_start" type="date" aria-label="Statement start date" />
          <input className="h-11 rounded-md border border-slate-300 px-3 text-sm" name="period_end" type="date" aria-label="Statement end date" />
          <button className="btn-dark">Generate Statement</button>
        </form>
        <PortalTable headers={["Statement", "Created", "Download"]}>
          {statementsWithLinks.map((document) => <tr key={document.id}><td>{document.title}</td><td>{document.created_at.toLocaleDateString("en-KE")}</td><td><DocumentLink documents={[document]} /></td></tr>)}
        </PortalTable>
      </PortalSection>

      <PortalSection title="My Payments">
        <PortalTable headers={["Payment", "Method", "Transaction reference", "Date", "Amount"]}>
          {payments.map((payment) => <tr key={payment.id}><td>{payment.payment_number}</td><td>{payment.method}</td><td>{payment.reference ?? "Not provided"}</td><td>{payment.paid_at.toLocaleDateString("en-KE")}</td><td>{formatKes(payment.amount_kes)}</td></tr>)}
        </PortalTable>
      </PortalSection>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border border-slate-300 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-ink">{value}</p></div>;
}

function PortalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6 rounded-lg border border-slate-300 bg-white"><div className="border-b border-line p-5"><h2 className="text-xl font-black text-ink">{title}</h2></div><div className="overflow-x-auto">{children}</div></section>;
}

function PortalTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-mist text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-line">{children}</tbody></table>;
}

async function signPortalDocuments<T extends { bucket: string; storage_path: string; public_url: string | null }>(documents: T[]) {
  return Promise.all(documents.map(async (document) => ({
    ...document,
    signed_url: await signedBusinessDocumentUrl(document.storage_path, document.bucket).catch(() => null)
  })));
}

function DocumentLink({ documents }: { documents: Array<{ signed_url?: string | null }> }) {
  const document = documents.find((item) => item.signed_url);
  return document?.signed_url ? <a className="font-bold text-signal hover:text-teal-700" href={document.signed_url} target="_blank" rel="noreferrer">Download PDF</a> : <span className="text-slate-500">No PDF</span>;
}

function EmptyPortal({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div className="p-8 text-center"><p className="text-lg font-black text-ink">{title}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}
