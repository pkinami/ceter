import type { QuoteStatus } from "@prisma/client";
import { updateQuoteStatusAction } from "@/app/admin/actions";
import { Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { getQuotes, searchParam } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

const statuses: QuoteStatus[] = ["new", "contacted", "quoted", "won", "closed"];

export default async function QuotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  await requireAdminSession();
  const status = searchParam(params.status) as QuoteStatus | "all" | undefined;
  const quotes = await getQuotes(status ?? "all");
  return (
    <>
      <PageHeader title="Quotes & Tenders" copy="Real quote pipeline using new/contacted/quoted/won/closed statuses." />
      <form className="admin-toolbar" action="/admin/quotes">
        <label className="sr-only" htmlFor="quotes-status-filter">Quote status filter</label>
        <select id="quotes-status-filter" className="admin-input" name="status" autoComplete="off" defaultValue={status ?? "all"}>
          <option value="all">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="btn-dark">Filter</button>
      </form>
      <Table headers={["Quote", "Customer", "Need", "Value", "Lines", "Status", "Created", "Action"]} minWidth={1040}>
        {quotes.map((quote) => (
          <tr key={quote.id}>
            <td><strong>{quote.id.slice(0, 8)}</strong></td>
            <td>{quote.name}<br /><span className="text-slate-500">{quote.email} / {quote.phone}</span></td>
            <td>{quote.service_needed}<br /><span className="text-slate-500">{quote.message}</span></td>
            <td>{quote.quoted_value_kes ? <Money value={quote.quoted_value_kes} /> : "Not quoted"}</td>
            <td>{quote.lines.map((line) => `${line.quantity} x ${line.description}`).join("; ") || "No lines"}</td>
            <td><Pill tone={quote.status === "won" ? "green" : quote.status === "closed" ? "red" : "teal"}>{quote.status}</Pill></td>
            <td>{quote.created_at.toLocaleString("en-KE")}</td>
            <td>
              <form action={updateQuoteStatusAction} className="flex gap-2">
                <input type="hidden" name="id" value={quote.id} />
                <label className="sr-only" htmlFor={`quote-status-${quote.id}`}>Quote status</label>
                <select id={`quote-status-${quote.id}`} className="admin-input" name="status" autoComplete="off" defaultValue={quote.status}>
                  {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <button className="btn-lite">Save</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
