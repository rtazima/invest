"use client";

import { useState, useRef } from "react";
import type { DBHolder } from "@/types/database";
import { processCSVImport, type ImportResult } from "@/app/(app)/import/actions";

const INSTITUTIONS = [
  { value: "xp", label: "XP Investimentos" },
  { value: "btg", label: "BTG Pactual" },
  { value: "nomad", label: "Nomad (USD)" },
] as const;

type Step = "titular" | "instituicao" | "arquivo" | "confirmar" | "resultado";

interface Props {
  holders: DBHolder[];
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid var(--color-line)",
  backgroundColor: "var(--color-bg-2)",
  color: "var(--color-text)",
  fontSize: "13px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--color-text-2)",
  marginBottom: "6px",
};

export function ImportWizard({ holders }: Props) {
  const [step, setStep] = useState<Step>("titular");
  const [holderId, setHolderId] = useState(holders[0]?.id ?? "");
  const [institution, setInstitution] = useState<"xp" | "btg" | "nomad">("xp");
  const [file, setFile] = useState<File | null>(null);
  const [exchangeRate, setExchangeRate] = useState("");
  const todayStr = new Date().toISOString().slice(0, 10);
  const [exchangeRateDate, setExchangeRateDate] = useState<string>(todayStr);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNomad = institution === "nomad";
  const selectedHolder = holders.find((h) => h.id === holderId);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) setFile(dropped);
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);

    const fd = new FormData();
    fd.set("holder_id", holderId);
    fd.set("institution", institution);
    fd.set("file", file);
    if (isNomad) {
      fd.set("exchange_rate", exchangeRate);
      fd.set("exchange_rate_date", exchangeRateDate);
    }

    const res = await processCSVImport(fd);
    setResult(res);
    setStep("resultado");
    setLoading(false);
  }

  function reset() {
    setStep("titular");
    setFile(null);
    setExchangeRate("");
    setResult(null);
  }

  const STEPS: Step[] = ["titular", "instituicao", "arquivo", "confirmar"];
  const stepIdx = STEPS.indexOf(step);

  if (step === "resultado") {
    return (
      <div style={{ padding: "32px", textAlign: "center" }}>
        {result?.success ? (
          <>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✓</div>
            <h2 style={{ margin: "0 0 8px", color: "var(--color-gain)", fontSize: "16px", fontWeight: 600 }}>
              {result.rowCount} posições importadas
            </h2>
            <p style={{ color: "var(--color-text-3)", fontSize: "13px", margin: "0 0 24px" }}>
              {result.errors && result.errors.length > 0
                ? `${result.errors.length} linha${result.errors.length > 1 ? "s" : ""} ignorada${result.errors.length > 1 ? "s" : ""} por erro de formato.`
                : "Todas as linhas foram importadas com sucesso."}
            </p>
            <button onClick={reset} style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 500 }}>
              Nova importação
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✕</div>
            <h2 style={{ margin: "0 0 8px", color: "var(--color-crit)", fontSize: "16px", fontWeight: 600 }}>
              Falha na importação
            </h2>
            <p style={{ color: "var(--color-text-3)", fontSize: "13px", margin: "0 0 24px" }}>
              {result?.errorMessage}
            </p>
            <button onClick={reset} style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 500 }}>
              Tentar novamente
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: "0", marginBottom: "32px" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: "11px",
                fontWeight: 600,
                backgroundColor: i <= stepIdx ? "var(--color-text)" : "var(--color-bg-3)",
                color: i <= stepIdx ? "var(--color-bg)" : "var(--color-text-3)",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  backgroundColor: i < stepIdx ? "var(--color-text)" : "var(--color-line)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Titular */}
      {step === "titular" && (
        <div style={{ maxWidth: "400px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 600 }}>Selecionar titular</h2>
          <label style={labelStyle}>Titular</label>
          <select value={holderId} onChange={(e) => setHolderId(e.target.value)} style={inputStyle}>
            {holders.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setStep("instituicao")}
            style={{
              marginTop: "20px",
              padding: "8px 20px",
              borderRadius: "6px",
              backgroundColor: "var(--color-bg-3)",
              border: "1px solid var(--color-line)",
              color: "var(--color-text)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Próximo
          </button>
        </div>
      )}

      {/* Step 2 — Instituição */}
      {step === "instituicao" && (
        <div style={{ maxWidth: "400px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 600 }}>Selecionar instituição</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {INSTITUTIONS.map((inst) => (
              <label
                key={inst.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${institution === inst.value ? "var(--color-text)" : "var(--color-line)"}`,
                  backgroundColor: institution === inst.value ? "var(--color-bg-3)" : "var(--color-bg-2)",
                  cursor: "pointer",
                  transition: "border-color 0.1s, background-color 0.1s",
                }}
              >
                <input
                  type="radio"
                  name="institution"
                  value={inst.value}
                  checked={institution === inst.value}
                  onChange={() => setInstitution(inst.value as "xp" | "btg" | "nomad")}
                  style={{ display: "none" }}
                />
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: `2px solid ${institution === inst.value ? "var(--color-text)" : "var(--color-line)"}`,
                    backgroundColor: institution === inst.value ? "var(--color-text)" : "transparent",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{inst.label}</span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setStep("titular")} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
              Voltar
            </button>
            <button
              onClick={() => setStep("arquivo")}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                backgroundColor: "var(--color-bg-3)",
                border: "1px solid var(--color-line)",
                color: "var(--color-text)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Arquivo + cotação (Nomad) */}
      {step === "arquivo" && (
        <div style={{ maxWidth: "500px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 600 }}>
            Upload do CSV — {INSTITUTIONS.find((i) => i.value === institution)?.label}
          </h2>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            style={{
              border: `2px dashed ${dragOver ? "var(--color-text)" : file ? "var(--color-gain)" : "var(--color-line)"}`,
              borderRadius: "8px",
              padding: "32px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: dragOver ? "var(--color-bg-3)" : "var(--color-bg-2)",
              transition: "all 0.1s",
              marginBottom: "16px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 500, color: "var(--color-gain)" }}>
                  {file.name}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-3)" }}>
                  {(file.size / 1024).toFixed(1)} KB · clique para trocar
                </p>
              </div>
            ) : (
              <div>
                <p style={{ margin: "0 0 4px", color: "var(--color-text-2)", fontSize: "13px" }}>
                  Arraste o arquivo CSV ou clique para selecionar
                </p>
                <p style={{ margin: 0, fontSize: "11.5px", color: "var(--color-text-3)" }}>
                  Formatos suportados: XP, BTG e Nomad
                </p>
              </div>
            )}
          </div>

          {/* Cotação USD/BRL (só Nomad) */}
          {isNomad && (
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Cotação USD/BRL</label>
                <input
                  type="text"
                  placeholder="Ex: 5.75"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Data da cotação</label>
                <input
                  type="date"
                  value={exchangeRateDate}
                  onChange={(e) => setExchangeRateDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setStep("instituicao")} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
              Voltar
            </button>
            <button
              onClick={() => setStep("confirmar")}
              disabled={!file || (isNomad && !exchangeRate)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                backgroundColor: "var(--color-bg-3)",
                border: "1px solid var(--color-line)",
                color: !file || (isNomad && !exchangeRate) ? "var(--color-text-3)" : "var(--color-text)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: !file || (isNomad && !exchangeRate) ? "not-allowed" : "pointer",
              }}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Confirmar */}
      {step === "confirmar" && (
        <div style={{ maxWidth: "400px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 600 }}>Confirmar importação</h2>
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid var(--color-line-2)",
              backgroundColor: "var(--color-bg-2)",
              marginBottom: "20px",
            }}
          >
            {[
              ["Titular", selectedHolder?.name ?? "—"],
              ["Instituição", INSTITUTIONS.find((i) => i.value === institution)?.label ?? institution],
              ["Arquivo", file?.name ?? "—"],
              ...(isNomad ? [["Cotação USD/BRL", `R$ ${exchangeRate}`]] : []),
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--color-line-2)",
                }}
              >
                <span style={{ color: "var(--color-text-3)" }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setStep("arquivo")} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                backgroundColor: loading ? "var(--color-bg-3)" : "var(--color-text)",
                border: "none",
                color: loading ? "var(--color-text-3)" : "var(--color-bg)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Importando..." : "Importar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
