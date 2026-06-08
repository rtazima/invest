import type { AnalysisRule, FundamentalsSnapshot, SemaphoreState, AnalysisResult, Archetype } from './types';

function getFieldValue(snap: FundamentalsSnapshot, fieldName: string): number | null {
  if (fieldName.startsWith('manual_')) {
    const key = fieldName.replace('manual_', '');
    const v = snap.manual_overrides[key];
    return v ?? null;
  }
  return (snap as unknown as Record<string, number | null>)[fieldName] ?? null;
}

function evalThreshold(expr: string, value: number): boolean {
  const trimmed = expr.trim();
  const rangeMatch = trimmed.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]!);
    const hi = parseFloat(rangeMatch[2]!);
    return value >= lo && value <= hi;
  }
  const opMatch = trimmed.match(/^([><=!]+)\s*([\d.]+)$/);
  if (!opMatch) return false;
  const op = opMatch[1]!;
  const threshold = parseFloat(opMatch[2]!);
  switch (op) {
    case '>=': return value >= threshold;
    case '>':  return value > threshold;
    case '<=': return value <= threshold;
    case '<':  return value < threshold;
    default:   return false;
  }
}

function evalSemaphore(rule: AnalysisRule, value: number): SemaphoreState {
  if (rule.threshold_ok === 'informational') return 'informational';

  const isOk = evalThreshold(rule.threshold_ok, value);
  if (isOk) return 'ok';
  const isWarning = evalThreshold(rule.threshold_warning, value);
  if (isWarning) return 'warning';
  return 'critical';
}

export function computeAnalysis(
  snap: FundamentalsSnapshot,
  archetype: Archetype,
  rules: AnalysisRule[],
): AnalysisResult {
  const applicableRules = rules.filter(r => r.archetype === archetype || r.archetype === null);
  const semaphores: Record<string, SemaphoreState> = {};
  const justifications: Record<string, string> = {};
  const missingMetrics: string[] = [];

  for (const rule of applicableRules) {
    const value = getFieldValue(snap, rule.field_name);
    if (value === null) {
      semaphores[rule.metric_id] = 'missing';
      missingMetrics.push(rule.metric_id);
    } else {
      const state = evalSemaphore(rule, value);
      semaphores[rule.metric_id] = state;
      if (state === 'warning' || state === 'critical') {
        justifications[rule.metric_id] = rule.context_notes ?? '';
      }
    }
  }

  if (missingMetrics.length > 0) {
    return {
      ticker: snap.ticker,
      analyzed_at: snap.fetched_at,
      archetype,
      status: 'blocked',
      missing_metrics: missingMetrics,
      semaphores,
      solvency_override: false,
      quality_score: null,
      valuation: null,
      recommendation: null,
      trend_downgrade: false,
      justifications,
    };
  }

  const structuralRules = applicableRules.filter(r => r.structural);
  const solvencyOverride = structuralRules.some(r => semaphores[r.metric_id] === 'critical');

  if (solvencyOverride) {
    return {
      ticker: snap.ticker,
      analyzed_at: new Date().toISOString(),
      archetype,
      status: 'ok',
      missing_metrics: [],
      semaphores,
      solvency_override: true,
      quality_score: 'low',
      valuation: null,
      recommendation: 'avoid',
      trend_downgrade: false,
      justifications,
    };
  }

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

  let valuation: 'attractive' | 'fair' | 'stretched' | 'informational';
  const pl = snap.pl;
  const evEbitda = snap.ev_ebitda;
  if (pl === null && evEbitda === null) {
    valuation = 'informational';
  } else {
    const plAttractive = pl !== null && pl > 0 && pl < 12;
    const plStretched = pl !== null && pl > 22;
    const evAttractive = evEbitda !== null && evEbitda > 0 && evEbitda < 7;
    const evStretched = evEbitda !== null && evEbitda > 14;

    if (plAttractive || evAttractive) valuation = 'attractive';
    else if (plStretched || evStretched) valuation = 'stretched';
    else valuation = 'fair';
  }

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

  return {
    ticker: snap.ticker,
    analyzed_at: new Date().toISOString(),
    archetype,
    status: 'ok',
    missing_metrics: [],
    semaphores,
    solvency_override: false,
    quality_score: qualityScore,
    valuation,
    recommendation,
    trend_downgrade: false,
    justifications,
  };
}
