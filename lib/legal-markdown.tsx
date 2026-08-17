import type { ReactNode } from "react";

type LegalHeading = {
  id: string;
  level: 2 | 3;
  text: string;
};

type LegalDocument = {
  title: string;
  company: string;
  effectiveDate: string | null;
  lastReviewed: string | null;
  body: string;
  headings: LegalHeading[];
};

export function LegalPage({ markdown, label }: { markdown: string; label: string }) {
  const document = parseLegalDocument(markdown);

  return (
    <main className="bg-mist">
      <section className="border-b border-line bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
          <p className="text-xs font-black uppercase text-signal">{label}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl">{document.title}</h1>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-2 font-bold">{document.company}</span>
            {document.effectiveDate ? <span className="rounded-md border border-white/15 bg-white/10 px-3 py-2">Effective date: {document.effectiveDate}</span> : null}
            {document.lastReviewed ? <span className="rounded-md border border-white/15 bg-white/10 px-3 py-2">Last reviewed: {document.lastReviewed}</span> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr] lg:items-start">
        <aside className="rounded-lg border border-line bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-sm font-black uppercase text-ink">Contents</h2>
          <nav className="mt-3 grid gap-1 text-sm" aria-label={`${document.title} contents`}>
            {document.headings.filter((heading) => heading.level === 2).map((heading) => (
              <a key={heading.id} href={`#${heading.id}`} className="rounded-md px-3 py-2 font-semibold text-slate-600 hover:bg-teal-50 hover:text-signal">
                {heading.text}
              </a>
            ))}
          </nav>
        </aside>

        <article className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-8">
          <LegalMarkdown markdown={document.body} />
        </article>
      </section>
    </main>
  );
}

export function LegalMarkdown({ markdown }: { markdown: string }) {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="max-w-none">
      {blocks.map((block, index) => renderBlock(block.trim(), index))}
    </div>
  );
}

function renderBlock(block: string, index: number) {
  if (!block) return null;
  if (block.startsWith("# ")) return <h1 key={index} className="text-3xl font-black leading-tight text-ink">{renderInline(block.slice(2))}</h1>;
  if (block.startsWith("## ")) {
    const text = block.slice(3);
    return <h2 key={index} id={slugify(stripInlineMarkdown(text))} className="scroll-mt-28 border-t border-line pt-8 text-2xl font-black leading-tight text-ink first:border-t-0 first:pt-0">{renderInline(text)}</h2>;
  }
  if (block.startsWith("### ")) {
    const text = block.slice(4);
    return <h3 key={index} id={slugify(stripInlineMarkdown(text))} className="scroll-mt-28 text-lg font-black leading-tight text-panel">{renderInline(text)}</h3>;
  }
  if (isTable(block)) return renderTable(block, index);
  if (block.split("\n").every((line) => line.startsWith("- "))) {
    return (
      <ul key={index} className="my-5 grid gap-2 pl-5 text-[15px] leading-7 text-slate-700 marker:text-signal">
        {block.split("\n").map((line, itemIndex) => <li key={itemIndex} className="list-disc pl-1">{renderInline(line.slice(2))}</li>)}
      </ul>
    );
  }
  return <p key={index} className="my-5 text-[15px] leading-7 text-slate-700">{renderInline(block.replace(/\n/g, " "))}</p>;
}

function isTable(block: string) {
  const lines = block.split("\n");
  return lines.length >= 2 && lines.every((line) => line.trim().startsWith("|")) && lines[1]?.includes("---");
}

function renderTable(block: string, index: number) {
  const rawLines = block.split("\n");
  const rows = rawLines
    .filter((line) => !/^\|\s*-+/.test(line.trim()))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
  const hasHeader = rows[0]?.some(Boolean) && rawLines[1]?.includes("---");
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  return (
    <div key={index} className="my-6 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse overflow-hidden rounded-lg border border-line text-sm">
        {hasHeader ? (
          <thead>
            <tr className="bg-slate-50 text-left">
              {rows[0].map((cell, cellIndex) => (
                <th key={cellIndex} className="border-b border-line px-4 py-3 align-top font-black text-ink">{renderInline(cell)}</th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-line first:border-t-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top leading-6 text-slate-700 first:font-bold first:text-ink">{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={nodes.length}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      nodes.push(link ? <a key={nodes.length} className="font-bold text-signal hover:text-teal-700" href={link[2]}>{link[1]}</a> : token);
    } else {
      nodes.push(<a key={nodes.length} className="font-bold text-signal hover:text-teal-700" href={token}>{token}</a>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function parseLegalDocument(markdown: string): LegalDocument {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim() ?? "Legal Document";
  const company = stripInlineMarkdown(lines.find((line) => /^\*\*.+\*\*$/.test(line.trim()))?.trim() ?? "**Ceter Technologies Limited**");
  const effectiveDate = findMetaValue(lines, "Effective date:");
  const lastReviewed = findMetaValue(lines, "Last reviewed:");
  const firstSectionIndex = lines.findIndex((line) => line.startsWith("## "));
  const body = lines.slice(firstSectionIndex >= 0 ? firstSectionIndex : 0).join("\n").trim();
  const headings = lines
    .filter((line) => line.startsWith("## ") || line.startsWith("### "))
    .map((line) => {
      const level = line.startsWith("### ") ? 3 : 2;
      const text = stripInlineMarkdown(line.slice(level === 2 ? 3 : 4).trim());
      return { id: slugify(text), level, text };
    });

  return { title, company, effectiveDate, lastReviewed, body, headings };
}

function findMetaValue(lines: string[], label: string) {
  return lines.find((line) => line.startsWith(label))?.slice(label.length).trim() ?? null;
}

function stripInlineMarkdown(text: string) {
  return text.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
