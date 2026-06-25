"use client";

import { useState, useRef, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { processResearchUpload, type UploadResult } from "@/app/(app)/research/actions";

const card: CSSProperties = {
  borderRadius: "8px",
  border: "1px solid var(--color-line-2)",
  backgroundColor: "var(--color-bg-2)",
  padding: "16px",
};
const label: CSSProperties = { fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 500 };
const control: CSSProperties = {
  padding: "0.5rem 0.75rem",
  backgroundColor: "var(--color-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text)",
  fontSize: "0.875rem",
};

export function ResearchUpload() {
  const router = useRouter();
  const [house, setHouse] = useState("xp");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setResult({ success: false, error: "Selecione um PDF." });
      return;
    }
    setResult(null);
    const fd = new FormData();
    fd.set("house", house);
    fd.set("file", file);

    startTransition(async () => {
      const res = await processResearchUpload(fd);
      setResult(res);
      if (res.success) {
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    });
  }

  return (
    <section style={card}>
      <h2 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>
        Subir relatório de research
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={label}>Casa</label>
          <select value={house} onChange={(e) => setHouse(e.target.value)} style={{ ...control, minWidth: "120px" }}>
            <option value="xp">XP</option>
            <option value="btg">BTG</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "200px" }}>
          <label style={label}>PDF</label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            style={{ ...control, padding: "0.4rem 0.5rem" }}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "var(--color-brand)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Processando..." : "Importar"}
        </button>
      </form>

      {fileName && !result && (
        <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--color-text-3)" }}>{fileName}</p>
      )}

      {pending && (
        <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--color-text-3)" }}>
          Lendo o PDF e extraindo dados (pode levar até um minuto)...
        </p>
      )}

      {result && (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: "12px",
            color: result.success ? "var(--color-gain)" : "var(--color-crit)",
          }}
        >
          {result.success
            ? `Importado: ${result.observations} ativo(s) extraído(s)${result.needsReview ? " — alguns marcados para revisão." : "."}`
            : result.error}
        </p>
      )}
    </section>
  );
}
