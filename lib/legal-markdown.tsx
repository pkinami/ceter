import type { ReactNode } from "react";

export function LegalMarkdown({ markdown }: { markdown: string }) {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-ink prose-a:text-signal prose-strong:text-ink">
      {blocks.map((block, index) => renderBlock(block.trim(), index))}
    </article>
  );
}

function renderBlock(block: string, index: number) {
  if (!block) return null;
  if (block.startsWith("# ")) return <h1 key={index}>{renderInline(block.slice(2))}</h1>;
  if (block.startsWith("## ")) return <h2 key={index}>{renderInline(block.slice(3))}</h2>;
  if (block.startsWith("### ")) return <h3 key={index}>{renderInline(block.slice(4))}</h3>;
  if (isTable(block)) return renderTable(block, index);
  if (block.split("\n").every((line) => line.startsWith("- "))) {
    return (
      <ul key={index}>
        {block.split("\n").map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.slice(2))}</li>)}
      </ul>
    );
  }
  return <p key={index}>{renderInline(block.replace(/\n/g, " "))}</p>;
}

function isTable(block: string) {
  const lines = block.split("\n");
  return lines.length >= 2 && lines.every((line) => line.trim().startsWith("|")) && lines[1]?.includes("---");
}

function renderTable(block: string, index: number) {
  const rows = block.split("\n").filter((line) => !/^\|\s*-+/.test(line.trim())).map((line) =>
    line.split("|").slice(1, -1).map((cell) => cell.trim())
  );
  return (
    <div key={index} className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-line">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-3 pr-4 align-top">{renderInline(cell)}</td>
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
      nodes.push(link ? <a key={nodes.length} href={link[2]}>{link[1]}</a> : token);
    } else {
      nodes.push(<a key={nodes.length} href={token}>{token}</a>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
