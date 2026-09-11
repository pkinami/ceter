# PDF template preparation

`Ceter_Combined_Quotation.docx` is a preserved design master, never a runtime
input. Customer quotations, invoices and other business documents are composed
by `lib/business/documents.ts` with pdf-lib: all customer values, tables,
totals, payment details, terms and footers are dynamic.

`scripts/make-document-template.ts` creates the two permanent-artwork PDF
assets consumed by that renderer. It creates new PDFs from approved reusable
artwork; it does not copy a filled reference PDF or redact it with rectangles,
so no source customer data, sample totals, timestamps, notice text or old table
rules can remain underneath generated content. Run it only as an explicit,
offline template-preparation action when the Word design changes. Word/Office
conversion, if desired for design review, is similarly offline-only and is not
configured or invoked by customer requests.
