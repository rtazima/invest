'use client';

import { useState } from 'react';
import type { AnalysisRule, Archetype } from '@/lib/analysis/types';
import { ARCHETYPE_LABELS } from '@/lib/analysis/types';

// ─── teses por arquétipo ────────────────────────────────────────────────────

const ARCHETYPE_THESIS: Record<Archetype, string> = {
  asset_light:
    'Negócios com baixo reinvestimento em ativos físicos e alta escalabilidade. O valor está em propriedade intelectual, efeito de rede ou marca — não em máquinas. ROIC acima do custo de capital sustentado por crescimento de receita define a tese. Margem bruta acima de 60% confirma poder de precificação real e barreira de entrada.',
  capital_intensivo:
    'Indústrias, infraestrutura e manufatura com capex pesado. A disciplina na alocação de capital define o retorno de longo prazo. EBITDA pode mascarar o lucro real quando o capex de manutenção é alto — a conversão FCF é o teste definitivo. Alavancagem moderada é tolerável se a cobertura de juros for sólida e o ROIC superar o WACC.',
  commodity:
    'O preço da commodity domina o resultado — gestão controla custos e balanço, não a receita. O único diferencial durável é ser produtor de baixo custo (quartis 1-2 na curva). No vale do ciclo, empresas alavancadas quebram; as conservadoras sobrevivem e ganham participação de mercado. EV/EBITDA deve ser avaliado com EBITDA normalizado pelo ciclo, não pelo corrente.',
  financeiras:
    'Bancos e seguradoras usam alavancagem como modelo de negócio — P/L e EV/EBITDA não se aplicam. A análise foca em qualidade da carteira (NPL, cobertura de provisões), solidez regulatória (Basileia, CET1) e eficiência operacional. ROE sustentado acima do custo de capital com provisões conservadoras é a combinação vencedora.',
  utility:
    'Concessões e distribuidoras com receita previsível via contratos de longo prazo. Fluxo de caixa estável e regulado justifica alavancagem mais alta que outros setores. O risco central é renovação de concessões e sensibilidade ao custo da dívida em ciclos de juros altos. Dividend yield deve ser coberto por FCF real — não por endividamento incremental.',
};

// ─── parâmetros do motor (hardcoded em engine.ts) ───────────────────────────

const ENGINE_PARAMS = {
  quality: [
    { label: 'Score alto', rule: '≥ 70% das métricas verdes', color: 'oklch(0.72 0.18 145)' },
    { label: 'Score médio', rule: 'Entre 40% críticas e 70% verdes', color: 'oklch(0.75 0.16 80)' },
    { label: 'Score baixo', rule: '≥ 40% das métricas críticas', color: 'oklch(0.65 0.22 25)' },
  ],
  valuation: [
    { label: 'Atrativo', rule: 'P/L < 12 ou EV/EBITDA < 7', color: 'oklch(0.72 0.18 145)' },
    { label: 'Justo', rule: 'P/L entre 12-22 e EV/EBITDA entre 7-14', color: 'var(--color-text-3)' },
    { label: 'Esticado', rule: 'P/L > 22 ou EV/EBITDA > 14', color: 'oklch(0.65 0.22 25)' },
  ],
  matrix: [
    ['', 'Atrativo', 'Justo', 'Esticado'],
    ['Score alto', 'Comprar', 'Manter', 'Manter'],
    ['Score médio', 'Comprar', 'Manter', 'Vender'],
    ['Score baixo', 'Evitar', 'Vender', 'Vender'],
  ],
};

// ─── helpers ────────────────────────────────────────────────────────────────

type Tab = Archetype | 'motor';
const TABS: Array<{ id: Tab; label: string }> = [
  ...Object.entries(ARCHETYPE_LABELS).map(([id, label]) => ({ id: id as Archetype, label })),
  { id: 'motor', label: 'Motor' },
];

const STATE_DOT: Record<string, string> = {
  ok: 'oklch(0.72 0.18 145)',
  warning: 'oklch(0.75 0.16 80)',
  critical: 'oklch(0.65 0.22 25)',
};

// ─── rule row ───────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: AnalysisRule;
  onSaved: (updated: AnalysisRule) => void;
}

function RuleRow({ rule, onSaved }: RuleRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    threshold_ok: rule.threshold_ok,
    threshold_warning: rule.threshold_warning,
    threshold_critical: rule.threshold_critical,
    context_notes: rule.context_notes ?? '',
    structural: rule.structural,
    auto_fetch: rule.auto_fetch,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft({
      threshold_ok: rule.threshold_ok,
      threshold_warning: rule.threshold_warning,
      threshold_critical: rule.threshold_critical,
      context_notes: rule.context_notes ?? '',
      structural: rule.structural,
      auto_fetch: rule.auto_fetch,
    });
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? `Erro ${res.status}`);
      } else {
        onSaved({ ...rule, ...draft, context_notes: draft.context_notes || null });
        setEditing(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  const td: React.CSSProperties = {
    padding: '8px 10px', fontSize: '12px', color: 'var(--color-text)',
    borderBottom: '1px solid var(--color-line-2)', verticalAlign: 'top',
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '4px 6px', fontSize: '12px', fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--color-bg-3)', border: '1px solid var(--color-line)',
    borderRadius: '4px', color: 'var(--color-text)', outline: 'none',
    boxSizing: 'border-box',
  };

  if (editing) {
    return (
      <>
        <tr style={{ backgroundColor: 'oklch(0.16 0 0)' }}>
          <td style={{ ...td, fontWeight: 600 }}>{rule.label}</td>
          <td style={td}>
            <input
              style={{ ...inp, color: STATE_DOT.ok }}
              value={draft.threshold_ok}
              onChange={e => setDraft(d => ({ ...d, threshold_ok: e.target.value }))}
            />
          </td>
          <td style={td}>
            <input
              style={{ ...inp, color: STATE_DOT.warning }}
              value={draft.threshold_warning}
              onChange={e => setDraft(d => ({ ...d, threshold_warning: e.target.value }))}
            />
          </td>
          <td style={td}>
            <input
              style={{ ...inp, color: STATE_DOT.critical }}
              value={draft.threshold_critical}
              onChange={e => setDraft(d => ({ ...d, threshold_critical: e.target.value }))}
            />
          </td>
          <td style={{ ...td, textAlign: 'center' }}>
            <input
              type="checkbox"
              checked={draft.structural}
              onChange={e => setDraft(d => ({ ...d, structural: e.target.checked }))}
              style={{ cursor: 'pointer', accentColor: 'var(--color-crit)' }}
            />
          </td>
          <td style={{ ...td, textAlign: 'center' }}>
            <input
              type="checkbox"
              checked={draft.auto_fetch}
              onChange={e => setDraft(d => ({ ...d, auto_fetch: e.target.checked }))}
              style={{ cursor: 'pointer', accentColor: 'var(--color-text)' }}
            />
          </td>
          <td style={td}>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: '52px', fontFamily: 'inherit', lineHeight: 1.4 }}
              value={draft.context_notes}
              onChange={e => setDraft(d => ({ ...d, context_notes: e.target.value }))}
            />
          </td>
          <td style={{ ...td, whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: '4px 10px', fontSize: '11.5px', fontWeight: 500,
                  backgroundColor: 'var(--color-text)', color: 'var(--color-bg)',
                  border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? '...' : 'Salvar'}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                style={{
                  padding: '4px 10px', fontSize: '11.5px',
                  backgroundColor: 'transparent', color: 'var(--color-text-3)',
                  border: '1px solid var(--color-line)', borderRadius: '4px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
            {error && <div style={{ fontSize: '11px', color: 'var(--color-crit)', marginTop: '4px' }}>{error}</div>}
          </td>
        </tr>
      </>
    );
  }

  return (
    <tr>
      <td style={{ ...td, fontWeight: 500, maxWidth: '140px' }}>
        {rule.label}
        {rule.structural && (
          <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', padding: '1px 4px', borderRadius: '3px', backgroundColor: 'color-mix(in srgb, var(--color-crit) 15%, transparent)', color: 'var(--color-crit)' }}>ESTRUTURAL</span>
        )}
      </td>
      <td style={{ ...td, fontFamily: 'var(--font-mono)', color: STATE_DOT.ok }}>{rule.threshold_ok}</td>
      <td style={{ ...td, fontFamily: 'var(--font-mono)', color: STATE_DOT.warning }}>{rule.threshold_warning}</td>
      <td style={{ ...td, fontFamily: 'var(--font-mono)', color: STATE_DOT.critical }}>{rule.threshold_critical}</td>
      <td style={{ ...td, textAlign: 'center', color: rule.structural ? 'var(--color-crit)' : 'var(--color-text-3)' }}>
        {rule.structural ? '✓' : '—'}
      </td>
      <td style={{ ...td, textAlign: 'center', color: rule.auto_fetch ? 'var(--color-text)' : 'var(--color-text-3)' }}>
        {rule.auto_fetch ? '✓' : '—'}
      </td>
      <td style={{ ...td, color: 'var(--color-text-3)', maxWidth: '280px', whiteSpace: 'normal', lineHeight: 1.5 }}>
        {rule.context_notes ?? '—'}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <button
          onClick={startEdit}
          style={{
            padding: '4px 10px', fontSize: '11.5px',
            backgroundColor: 'transparent', color: 'var(--color-text-3)',
            border: '1px solid var(--color-line)', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          Editar
        </button>
      </td>
    </tr>
  );
}

// ─── archetype tab ───────────────────────────────────────────────────────────

function ArchetypeTab({ archetype, rules: initialRules }: { archetype: Archetype; rules: AnalysisRule[] }) {
  const [rules, setRules] = useState(initialRules);

  function handleSaved(updated: AnalysisRule) {
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  const th: React.CSSProperties = {
    padding: '7px 10px', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-3)', textAlign: 'left',
    borderBottom: '1px solid var(--color-line-2)', whiteSpace: 'nowrap',
    backgroundColor: 'var(--color-bg)',
  };

  return (
    <div>
      {/* Tese */}
      <div style={{
        padding: '16px 20px', marginBottom: '24px',
        backgroundColor: 'var(--color-bg-2)', borderRadius: '8px',
        border: '1px solid var(--color-line-2)',
      }}>
        <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '8px' }}>
          Tese de investimento
        </div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text-2)' }}>
          {ARCHETYPE_THESIS[archetype]}
        </p>
      </div>

      {/* Regras */}
      <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '10px' }}>
        Métricas avaliadas
      </div>
      <div style={{ borderRadius: '8px', border: '1px solid var(--color-line-2)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Métrica</th>
              <th style={{ ...th, color: STATE_DOT.ok }}>● OK</th>
              <th style={{ ...th, color: STATE_DOT.warning }}>● Atenção</th>
              <th style={{ ...th, color: STATE_DOT.critical }}>● Crítico</th>
              <th style={{ ...th, textAlign: 'center' }}>Estrutural</th>
              <th style={{ ...th, textAlign: 'center' }}>Auto-fetch</th>
              <th style={th}>Nota</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <RuleRow key={rule.id} rule={rule} onSaved={handleSaved} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── motor tab ───────────────────────────────────────────────────────────────

function MotorTab() {
  const block: React.CSSProperties = {
    padding: '16px 20px', backgroundColor: 'var(--color-bg-2)',
    borderRadius: '8px', border: '1px solid var(--color-line-2)',
  };
  const label: React.CSSProperties = {
    fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '12px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ padding: '12px 16px', backgroundColor: 'color-mix(in srgb, var(--color-warn) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-warn) 25%, transparent)', borderRadius: '7px', fontSize: '12px', color: 'var(--color-warn)' }}>
        Estes parâmetros estão em <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>src/lib/analysis/engine.ts</code> e precisam de deploy para mudar.
      </div>

      {/* Score de qualidade */}
      <div style={block}>
        <div style={label}>Score de qualidade</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ENGINE_PARAMS.quality.map(p => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '90px', fontSize: '12px', fontWeight: 600, color: p.color }}>{p.label}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>{p.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Valuation */}
      <div style={block}>
        <div style={label}>Leitura de valuation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ENGINE_PARAMS.valuation.map(p => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '90px', fontSize: '12px', fontWeight: 600, color: p.color }}>{p.label}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>{p.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz */}
      <div style={block}>
        <div style={label}>Matriz de recomendação</div>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {ENGINE_PARAMS.matrix.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => {
                  const isHeader = i === 0 || j === 0;
                  return (
                    <td
                      key={j}
                      style={{
                        padding: '7px 16px',
                        fontSize: isHeader ? '11px' : '12px',
                        fontWeight: isHeader ? 600 : 400,
                        color: isHeader ? 'var(--color-text-3)' : 'var(--color-text)',
                        border: '1px solid var(--color-line-2)',
                        textAlign: 'center',
                        backgroundColor: isHeader ? 'var(--color-bg)' : 'transparent',
                        fontFamily: isHeader ? 'inherit' : 'var(--font-mono)',
                      }}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

interface Props {
  rules: AnalysisRule[];
}

export function ParametrosView({ rules }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('financeiras');

  const byArchetype = Object.fromEntries(
    (Object.keys(ARCHETYPE_LABELS) as Archetype[]).map(a => [
      a,
      rules.filter(r => r.archetype === a),
    ]),
  ) as Record<Archetype, AnalysisRule[]>;

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', fontSize: '12.5px', borderRadius: '999px',
    border: `1px solid ${active ? 'var(--color-text-3)' : 'var(--color-line)'}`,
    backgroundColor: active ? 'var(--color-bg-3)' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-3)',
    cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: active ? 500 : 400,
  });

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Parâmetros de análise</h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-3)' }}>
          Teses, regras e thresholds por arquétipo. Edições entram na próxima rodada de análise.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={chip(activeTab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'motor'
        ? <MotorTab />
        : <ArchetypeTab archetype={activeTab} rules={byArchetype[activeTab] ?? []} />
      }
    </div>
  );
}
