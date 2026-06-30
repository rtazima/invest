import type { CSSProperties } from "react";
import type { WeeklyReportView, WeeklyAttentionItem } from "@/lib/reports/data";

const SEV_COLOR: Record<string, string> = {
  critical: "var(--color-crit)",
  warning: "var(--color-warn)",
  info: "var(--color-text-2)",
};

const SOURCE_LABEL: Record<string, string> = {
  "strategy-alignment": "enquadramento",
  "policy-limit": "política",
  "research-target": "preço-alvo",
  "fundamental-analysis": "fundamentos",
  "news-monitoring": "notícia",
};

const CLASS_LABELS: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Ações BR",
  stocks_intl: "Ações Intl.",
  fiis: "FIIs",
  etf_br: "ETF BR",
  etf_intl: "ETF Intl.",
  funds: "Fundos",
  liquidity: "Liquidez",
};

function leadLabel(item: WeeklyAttentionItem): string {
  if (item.ticker) return CLASS_LABELS[item.ticker] ?? item.ticker;
  return item.title;
}

const card: CSSProperties = {
  borderRadius: "8px",
  border: "1px solid var(--color-line-2)",
  backgroundColor: "var(--color-bg-2)",
  padding: "20px",
};

function fmtWeek(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function AttentionRow({ item }: { item: WeeklyAttentionItem }) {
  return (
    <li style={{ fontSize: "12.5px", color: "var(--color-text-2)", marginBottom: "4px" }}>
      <span style={{ color: SEV_COLOR[item.severity] ?? "var(--color-text-2)", fontWeight: 500 }}>
        {leadLabel(item)}
      </span>{" "}
      <span style={{ color: "var(--color-text-3)" }}>
        ({SOURCE_LABEL[item.generated_by] ?? item.generated_by})
      </span>
      : {item.description}
    </li>
  );
}

export function WeeklyReportFull({ report }: { report: WeeklyReportView }) {
  const { body } = report;
  return (
    <section style={card}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>
          Semana de {fmtWeek(report.week_start)}
        </h2>
        <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>
          gerado em {new Date(report.generated_at).toLocaleDateString("pt-BR")}
        </span>
      </header>

      {body.summary && (
        <p style={{ margin: "12px 0 0", fontSize: "13.5px", color: "var(--color-text)" }}>{body.summary}</p>
      )}

      {body.scenario_summary && (
        <p style={{ margin: "10px 0 0", fontSize: "12.5px", color: "var(--color-text-3)" }}>
          <span style={{ color: "var(--color-text-2)" }}>Cenário: </span>
          {body.scenario_summary}
        </p>
      )}

      {body.house_views.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          {body.house_views.map((h, i) => (
            <p key={i} style={{ margin: "2px 0", fontSize: "12px", color: "var(--color-text-3)" }}>
              <span style={{ textTransform: "uppercase", color: "var(--color-text-2)" }}>{h.house}</span>: {h.summary}
            </p>
          ))}
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {body.by_holder.map((h) => (
          <div key={h.holder_id} style={{ borderTop: "1px solid var(--color-line-2)", paddingTop: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>{h.name}</h3>
            {h.narrative && (
              <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: "var(--color-text-2)" }}>{h.narrative}</p>
            )}
            {h.actions && h.actions.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "12.5px", color: "var(--color-text-2)" }}>
                {h.actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
            {h.attention.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                {h.attention.map((it, i) => (
                  <AttentionRow key={i} item={it} />
                ))}
              </ul>
            )}
            {!h.narrative && h.attention.length === 0 && (
              <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: "var(--color-text-3)" }}>
                Enquadrado, sem ação necessária.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
