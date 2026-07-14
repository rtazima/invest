"use client";

import { useState, useRef } from "react";
import type { DBHolder, DBImportBatch } from "@/types/database";
import { processCSVImport, processFotoImport, type ImportResult } from "@/app/(app)/import/actions";

const INSTITUTIONS = [
  { value: "xp", label: "XP Investimentos" },
  { value: "xp_global", label: "XP Global (USD)" },
  { value: "btg", label: "BTG Pactual" },
  { value: "nomad", label: "Nomad (USD)" },
  { value: "foto", label: "Foto — Nomad + XP Global (USD)" },
] as const;

type InstitutionOption = "xp" | "xp_global" | "btg" | "nomad" | "foto";
type Step = "titular" | "instituicao" | "arquivo" | "confirmar" | "resultado";

interface Props {
  holders: DBHolder[];
  batches: DBImportBatch[];
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

export function ImportWizard({ holders, batches }: Props) {
  const [step, setStep] = useState<Step>("titular");
  const [holderId, setHolderId] = useState(holders[0]?.id ?? "");
  const [institution, setInstitution] = useState<InstitutionOption>("xp");
  const [file, setFile] = useState<File | null>(null);
  const [replaceBatchId, setReplaceBatchId] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState("");
  const todayStr = new Date().toISOString().slice(0, 10);
  const [exchangeRateDate, setExchangeRateDate] = useState<string>(todayStr);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tesouoOnly, setTesouoOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNomad = institution === "nomad";
  const isXpGlobal = institution === "xp_global";
  const isFoto = institution === "foto";
  const isUsd = isNomad || isXpGlobal || isFoto;
  const selectedHolder = holders.find((h) => h.id === holderId);

  // Imports já existentes desta conta (titular + instituição), candidatos a
  // substituição. Suplementos (Tesouro) se auto-dedupam, ficam de fora.
  const existingBatches = batches.filter(
    (b) =>
      b.holder_id === holderId &&
      b.institution === institution &&
      b.status === "completed" &&
      b.source !== "csv_supplement",
  );

  const acceptedExtensions =
    isNomad || isXpGlobal ? [".pdf"] : isFoto ? [".csv"] : [".xlsx", ".csv"];

  function isValidFile(f: File): boolean {
    return acceptedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidFile(dropped)) setFile(dropped);
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);

    const fd = new FormData();
    fd.set("holder_id", holderId);
    fd.set("file", file);
    if (isUsd) {
      fd.set("exchange_rate", exchangeRate);
      fd.set("exchange_rate_date", exchangeRateDate);
    }
    if (!isFoto) {
      fd.set("institution", institution);
      if (tesouoOnly) fd.set("tesouro_only", "true");
      if (replaceBatchId && !tesouoOnly) fd.set("replace_batch_id", replaceBatchId);
    }

    const res = isFoto ? await processFotoImport(fd) : await processCSVImport(fd);
    setResult(res);
    setStep("resultado");
    setLoading(false);
  }

  function reset() {
    setStep("titular");
    setFile(null);
    setExchangeRate("");
    setTesouoOnly(false);
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
                  onChange={() => setInstitution(inst.value as InstitutionOption)}
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
            Upload do arquivo — {INSTITUTIONS.find((i) => i.value === institution)?.label}
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
              accept={acceptedExtensions.join(",")}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f && isValidFile(f) ? f : null);
              }}
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
                  Arraste o arquivo ou clique para selecionar
                </p>
                <p style={{ margin: 0, fontSize: "11.5px", color: "var(--color-text-3)" }}>
                  {institution === "xp"
                    ? "XP: arquivo XLSX (Posição Detalhada) ou CSV"
                    : institution === "xp_global"
                    ? "XP Global: arquivo PDF (Account Statement da XP Investments US)"
                    : institution === "btg"
                    ? "BTG: arquivo XLSX (Extrato da Conta Investimento) ou CSV"
                    : institution === "nomad"
                    ? "Nomad: arquivo PDF (Account Statement)"
                    : "Foto: CSV com colunas corretora, ticker, nome, classe, valor_posicao_usd"}
                </p>
              </div>
            )}
          </div>

          {/* Cotação USD/BRL (Nomad e Foto) */}
          {isUsd && (
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

          {/* Suplemento Tesouro Direto (só BTG, quando Pluggy já sincronizou) */}
          {institution === "btg" && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                cursor: "pointer",
                fontSize: "13px",
                color: "var(--color-text-2)",
              }}
            >
              <input
                type="checkbox"
                checked={tesouoOnly}
                onChange={(e) => setTesouoOnly(e.target.checked)}
              />
              Apenas Tesouro Direto (suplementar sync Pluggy)
            </label>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setStep("instituicao")} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
              Voltar
            </button>
            <button
              onClick={() => {
                // Um import anterior desta conta → pré-seleciona substituir (caso
                // comum de reimport). Vários (sub-contas) → "nova conta" por segurança.
                setReplaceBatchId(existingBatches.length === 1 ? (existingBatches[0]?.id ?? "") : "");
                setStep("confirmar");
              }}
              disabled={!file || (isUsd && !exchangeRate)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                backgroundColor: "var(--color-bg-3)",
                border: "1px solid var(--color-line)",
                color: !file || (isUsd && !exchangeRate) ? "var(--color-text-3)" : "var(--color-text)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: !file || (isUsd && !exchangeRate) ? "not-allowed" : "pointer",
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
              ...(isUsd ? [["Cotação USD/BRL", `R$ ${exchangeRate}`]] : []),
              ...(tesouoOnly ? [["Modo", "Apenas Tesouro Direto"]] : []),
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

          {/* Substituir dados anteriores desta conta (evita double-count no reimport) */}
          {!isFoto && !tesouoOnly && existingBatches.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Já existem imports para esta conta</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[{ id: "", filename: "Nova conta/carteira (adicionar, não substitui nada)", row_count: null as number | null } , ...existingBatches].map((b) => {
                  const active = replaceBatchId === b.id;
                  return (
                    <label
                      key={b.id || "__new__"}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${active ? "var(--color-text)" : "var(--color-line)"}`,
                        backgroundColor: active ? "var(--color-bg-3)" : "var(--color-bg-2)",
                        cursor: "pointer", fontSize: "12.5px",
                      }}
                    >
                      <input
                        type="radio"
                        name="replaceBatch"
                        checked={active}
                        onChange={() => setReplaceBatchId(b.id)}
                        style={{ display: "none" }}
                      />
                      <div style={{
                        width: "14px", height: "14px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${active ? "var(--color-text)" : "var(--color-line)"}`,
                        backgroundColor: active ? "var(--color-text)" : "transparent",
                      }} />
                      <span>
                        {b.id ? `Substituir: ${b.filename}` : b.filename}
                        {b.row_count != null && (
                          <span style={{ color: "var(--color-text-3)" }}> · {b.row_count} ativos</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p style={{ fontSize: "11px", color: "var(--color-text-3)", margin: "8px 0 0" }}>
                Escolha o import que este arquivo atualiza. Sub-contas distintas da mesma corretora ficam como &quot;nova conta&quot;.
              </p>
            </div>
          )}

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
