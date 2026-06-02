"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", margin: "16px 0 6px" }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-text)", margin: "14px 0 5px" }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", margin: "12px 0 4px" }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ margin: "0 0 10px", fontSize: "13.5px", lineHeight: 1.65, color: "var(--color-text)" }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "0 0 10px", paddingLeft: "18px", fontSize: "13.5px", lineHeight: 1.65 }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "0 0 10px", paddingLeft: "18px", fontSize: "13.5px", lineHeight: 1.65 }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ marginBottom: "3px", color: "var(--color-text)" }}>{children}</li>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: "italic", color: "var(--color-text-2)" }}>{children}</em>
  ),
  code: ({ children }) => (
    <code style={{
      fontFamily: "var(--font-mono, monospace)",
      fontSize: "12px",
      padding: "1px 5px",
      borderRadius: "3px",
      backgroundColor: "var(--color-bg)",
      border: "1px solid var(--color-line)",
      color: "var(--color-text)",
    }}>
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      margin: "0 0 10px",
      paddingLeft: "12px",
      borderLeft: "3px solid var(--color-line-2)",
      color: "var(--color-text-2)",
      fontStyle: "italic",
    }}>
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: "14px 0" }} />
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", marginBottom: "10px" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ borderBottom: "2px solid var(--color-line-2)" }}>{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr style={{ borderBottom: "1px solid var(--color-line)" }}>{children}</tr>
  ),
  th: ({ children }) => (
    <th style={{ padding: "6px 12px", textAlign: "left", fontWeight: 600, color: "var(--color-text-3)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ padding: "6px 12px", color: "var(--color-text)", verticalAlign: "top" }}>
      {children}
    </td>
  ),
};

interface Props {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: Props) {
  return (
    <div className={className} style={{ minWidth: 0 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  );
}
