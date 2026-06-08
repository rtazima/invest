import type { AnalysisRule, SemaphoreState } from './types';
import type { FiiType, FiiFundamentalsSnapshot, FiiAnalysisResult, FiiSubsegment } from './fii-types';

function getFieldValue(snap: FiiFundamentalsSnapshot, fieldName: string): number | null {
  if (fieldName.startsWith('manual_')) {
    return snap.manual_overrides[fieldName.replace('manual_', '')] ?? null;
  }
  return (snap as unknown as Record<string, number | null>)[fieldName] ?? null;
}

function evalThreshold(expr: string, value: number): boolean {
  const t = expr.trim();
  const range = t.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (range) return value >= parseFloat(range[1]!) && value <= parseFloat(range[2]!);
  const op = t.match(/^([><=!]+)\s*([\d.]+)$/);
  if (!op) return false;
  const n = parseFloat(op[2]!);
  switch (op[1]) {
    case '>=': return value >= n;
    case '>':  return value > n;
    case '<=': return value <= n;
    case '<':  return value < n;
    default:   return false;
  }
}

function evalSemaphore(rule: AnalysisRule, value: number): SemaphoreState {
  if (rule.threshold_ok === 'informational') return 'informational';
  if (evalThreshold(rule.threshold_ok, value)) return 'ok';
  if (evalThreshold(rule.threshold_warning, value)) return 'warning';
  return 'critical';
}

export function computeFiiAnalysis(
  snap: FiiFundamentalsSnapshot,
  fiiType: FiiType,
  subsegment: FiiSubsegment | null,
  rules: AnalysisRule[],
): FiiAnalysisResult {
  // Rules: transversal (archetype=null) + type-specific (archetype=fiiType)
  const applicableRules = rules.filter(
    r => r.asset_class === 'fiis' && (r.archetype === fiiType || r.archetype === null),
  );

  const semaphores: Record<string, SemaphoreState> = {};
  const justifications: Record<string, string> = {};
  const missingMetrics: string[] = [];

  for (const rule of applicableRules) {
    const value = getFieldValue(snap, rule.field_name);
    if (value === null) {
      if (rule.auto_fetch) {
        semaphores[rule.metric_id] = 'missing';
        missingMetrics.push(rule.metric_id);
      } else {
        semaphores[rule.metric_id] = 'informational';
      }
    } else {
      const state = evalSemaphore(rule, value);
      semaphores[rule.metric_id] = state;
      if (state === 'warning' || state === 'critical') {
        justifications[rule.metric_id] = rule.context_notes ?? '';
      }
    }
  }

  const base = {
    ticker: snap.ticker,
    analyzed_at: new Date().toISOString(),
    fii_type: fiiType,
    subsegment,
    semaphores,
    justifications,
    trend_downgrade: false,
  };

  if (missingMetrics.length > 0) {
    return { ...base, status: 'blocked', missing_metrics: missingMetrics, sustainability_override: false, quality_score: null, valuation: null, recommendation: null };
  }

  // Etapa 1: override de sustentabilidade (qualquer regra estrutural crítica)
  const structuralRules = applicableRules.filter(r => r.structural);
  const sustainabilityOverride = structuralRules.some(r => semaphores[r.metric_id] === 'critical');

  if (sustainabilityOverride) {
    return { ...base, status: 'ok', missing_metrics: [], sustainability_override: true, quality_score: 'low', valuation: null, recommendation: 'avoid' };
  }

  // Etapa 2: quality score (regras não-estruturais e não-informacionais)
  const qualityRules = applicableRules.filter(r => !r.structural && r.threshold_ok !== 'informational');
  const qualityStates = qualityRules
    .map(r => semaphores[r.metric_id])
    .filter((s): s is SemaphoreState => s !== 'missing' && s !== 'informational');

  const okCount = qualityStates.filter(s => s === 'ok').length;
  const critCount = qualityStates.filter(s => s === 'critical').length;
  const total = qualityStates.length;

  let qualityScore: 'high' | 'medium' | 'low';
  if (total === 0) qualityScore = 'medium';
  else if (okCount / total >= 0.7) qualityScore = 'high';
  else if (critCount / total >= 0.4) qualityScore = 'low';
  else qualityScore = 'medium';

  // Valuation: spread do DY sobre NTN-B (não usa P/L como em ações)
  let valuation: 'attractive' | 'fair' | 'stretched' | 'informational';
  const spread = snap.dy_spread;
  if (spread === null) {
    valuation = 'informational';
  } else if (spread >= 3.0) {
    valuation = 'attractive';
  } else if (spread >= 1.5) {
    valuation = 'fair';
  } else {
    valuation = 'stretched';
  }

  // Matriz recomendação (mesma lógica das ações)
  let recommendation: 'buy' | 'hold' | 'sell' | 'avoid' | 'reduce';
  if (qualityScore === 'high' && valuation === 'attractive') recommendation = 'buy';
  else if (qualityScore === 'high' && valuation === 'fair') recommendation = 'hold';
  else if (qualityScore === 'high' && valuation === 'stretched') recommendation = 'hold';
  else if (qualityScore === 'medium' && valuation === 'attractive') recommendation = 'buy';
  else if (qualityScore === 'medium' && valuation === 'fair') recommendation = 'hold';
  else if (qualityScore === 'medium' && valuation === 'stretched') recommendation = 'sell';
  else if (qualityScore === 'low' && valuation === 'attractive') recommendation = 'avoid';
  else if (qualityScore === 'low' && valuation === 'fair') recommendation = 'sell';
  else recommendation = 'sell';

  return { ...base, status: 'ok', missing_metrics: [], sustainability_override: false, quality_score: qualityScore, valuation, recommendation };
}
