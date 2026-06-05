"use client";

import { useState, useTransition, useMemo } from "react";
import type { PositionForReview } from "@/lib/data/positions";
import { updatePositionAssetClassAction } from "@/app/(app)/positions/actions";
import { TransferModal, type TransferablePosition } from "@/components/transfers/TransferModal";

const ASSET_CLASS_LABELS: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Ações BR",
  stocks_intl: "Ações Intl.",
  fiis: "FIIs",
  etf_br: "ETF BR",
  etf_intl: "ETF Intl.",
  funds: "Fundos",
  liquidity: "Liquidez",
};

const ASSET_CLASSES = Object.keys(ASSET_CLASS_LABELS) as string[];

function fmtBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

interface RowProps {
  position: PositionForReview;
  selected: boolean;
  saving: boolean;
  saved: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, newClass: string) => void;
}

function PositionRow({ position: p, selected, saving, saved, onSelect, onChange }: RowProps) {
  return (
    <tr
      style={{
        borderBottom: "1px solid var(--color-line-2)",
        backgroundColor: selected
          ? "var(--color-bg-3)"
          : saved
            ? "color-mix(in srgb, var(--color-gain) 6%, transparent)"
            : "transparent",
        transition: "background-color 0.4s",
        cursor: "pointer",
      }}
      onClick={() => onSelect(p.id)}
    >
      <td style={{ padding: "8px 8px 8px 12px" }} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(p.id)}
          style={{ cursor: "pointer", accentColor: "var(--color-text)" }}
        />
      </td>
      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "12px" }}>
          {p.ticker ?? "—"}
        </span>
      </td>
      <td style={{ padding: "8px 12px", color: "var(--color-text-2)", fontSize: "12.5px" }}>
        {p.name ?? "—"}
      </td>
      <td style={{ padding: "8px 12px", fontSize: "12px", color: "var(--color-text-3)" }}>
        {p.holder_name}
      </td>
      <td style={{ padding: "8px 12px", fontSize: "12px", color: "var(--color-text-3)", whiteSpace: "nowrap" }}>
        {p.institution.toUpperCase()}
      </td>
      <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
        <span className="num" style={{ fontSize: "12.5px" }}>
          {fmtBRL(p.market_value_brl)}
        </span>
      </td>
      <td style={{ padding: "8px 12px" }} onClick={(e) => e.stopPropagation()}>
        <select
          value={p.asset_class}
          disabled={saving}
          onChange={(e) => onChange(p.id, e.target.value)}
          style={{
            fontSize: "12px",
            padding: "3px 6px",
            borderRadius: "6px",
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-bg-2)",
            color: "var(--color-text)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {ASSET_CLASSES.map((cls) => (
            <option key={cls} value={cls}>
              {ASSET_CLASS_LABELS[cls]}
            </option>
          ))}
        </select>
        {saved && (
          <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--color-gain)" }}>
            salvo
          </span>
        )}
      </td>
    </tr>
  );
}

interface Props {
  initialPositions: PositionForReview[];
}

export function PositionsReview({ initialPositions }: Props) {
  const [positions, setPositions] = useState(initialPositions);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferOpen, setTransferOpen] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return positions.filter((p) => {
      const matchesText =
        !q ||
        (p.ticker ?? "").toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q) ||
        p.holder_name.toLowerCase().includes(q);
      const matchesClass = !classFilter || p.asset_class === classFilter;
      return matchesText && matchesClass;
    });
  }, [positions, filter, classFilter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  const selectedPositions = filtered.filter((p) => selected.has(p.id));
  const selectedInstitutions = new Set(selectedPositions.map((p) => p.institution));
  const canTransfer = selected.size > 0 && selectedInstitutions.size === 1;

  async function handleChange(id: string, newClass: string) {
    setPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, asset_class: newClass as PositionForReview["asset_class"] } : p)),
    );
    setSaving((prev) => new Set(prev).add(id));
    setSaved((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setErrors((prev) => { const m = new Map(prev); m.delete(id); return m; });

    startTransition(async () => {
      const err = await updatePositionAssetClassAction(id, newClass as PositionForReview["asset_class"]);
      setSaving((prev) => { const s = new Set(prev); s.delete(id); return s; });
      if (err) {
        setErrors((prev) => new Map(prev).set(id, err));
      } else {
        setSaved((prev) => new Set(prev).add(id));
        setTimeout(() => setSaved((prev) => { const s = new Set(prev); s.delete(id); return s; }), 2500);
      }
    });
  }

  function handleTransferSuccess() {
    setTransferOpen(false);
    setSelected(new Set());
  }

  const globalError = errors.size > 0 ? `${errors.size} erro(s) ao salvar` : null;

  const transferablePositions: TransferablePosition[] = selectedPositions.map((p) => ({
    id: p.id,
    holder_id: p.holder_id,
    holder_name: p.holder_name,
    institution: p.institution,
    asset_name: p.name ?? p.ticker ?? "—",
    ticker: p.ticker,
    quantity: p.quantity,
    market_value_brl: p.market_value_brl,
  }));

  return (
    <div>
      {/* Barra de ferramentas */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar por ticker, nome ou titular..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: "1",
            minWidth: "200px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-bg-2)",
            color: "var(--color-text)",
            fontSize: "12.5px",
          }}
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-bg-2)",
            color: "var(--color-text)",
            fontSize: "12.5px",
          }}
        >
          <option value="">Todas as classes</option>
          {ASSET_CLASSES.map((cls) => (
            <option key={cls} value={cls}>
              {ASSET_CLASS_LABELS[cls]}
            </option>
          ))}
        </select>
        <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>
          {filtered.length} de {positions.length} posições
        </span>

        {selected.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
            <span style={{ fontSize: "12px", color: "var(--color-text-2)" }}>
              {selected.size} selecionada{selected.size !== 1 ? "s" : ""}
            </span>
            {!canTransfer && (
              <span style={{ fontSize: "11px", color: "var(--color-warn)" }}>
                (instituições diferentes)
              </span>
            )}
            {canTransfer && (
              <button
                onClick={() => setTransferOpen(true)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-bg-2)",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: 500,
                }}
              >
                Transferir custódia
              </button>
            )}
            <button
              onClick={() => setSelected(new Set())}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-line)",
                backgroundColor: "transparent",
                color: "var(--color-text-3)",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {globalError && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "12px",
            borderRadius: "6px",
            backgroundColor: "color-mix(in srgb, var(--color-crit) 10%, transparent)",
            color: "var(--color-crit)",
            fontSize: "12px",
          }}
        >
          {globalError}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--color-line)",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-text-3)",
              }}
            >
              <th style={{ padding: "6px 8px 6px 12px", width: "28px" }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length;
                  }}
                  onChange={toggleAll}
                  style={{ cursor: "pointer", accentColor: "var(--color-text)" }}
                />
              </th>
              <th style={{ padding: "6px 12px", textAlign: "left" }}>Ticker</th>
              <th style={{ padding: "6px 12px", textAlign: "left" }}>Nome</th>
              <th style={{ padding: "6px 12px", textAlign: "left" }}>Titular</th>
              <th style={{ padding: "6px 12px", textAlign: "left" }}>Corretora</th>
              <th style={{ padding: "6px 12px", textAlign: "right" }}>Valor</th>
              <th style={{ padding: "6px 12px", textAlign: "left" }}>Classe</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "var(--color-text-3)" }}>
                  Nenhuma posição encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <PositionRow
                  key={p.id}
                  position={p}
                  selected={selected.has(p.id)}
                  saving={saving.has(p.id)}
                  saved={saved.has(p.id)}
                  onSelect={toggleSelect}
                  onChange={handleChange}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {transferOpen && (
        <TransferModal
          positions={transferablePositions}
          onClose={() => setTransferOpen(false)}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
}
