import type { Recommendation } from '@/lib/analysis/types';

const CONFIG: Record<Recommendation, { label: string; bg: string; color: string }> = {
  buy: { label: 'Comprar', bg: 'oklch(0.25 0.05 160)', color: 'var(--color-gain)' },
  hold: { label: 'Manter', bg: 'var(--color-bg-3)', color: 'var(--color-text-2)' },
  sell: { label: 'Vender', bg: 'oklch(0.25 0.05 15)', color: 'var(--color-loss)' },
  avoid: { label: 'Evitar', bg: 'oklch(0.28 0.06 40)', color: 'oklch(0.75 0.16 50)' },
  reduce: { label: 'Reduzir', bg: 'oklch(0.26 0.05 25)', color: 'oklch(0.72 0.14 30)' },
};

interface Props {
  recommendation: Recommendation | null;
}

export function RecommendationBadge({ recommendation }: Props) {
  if (!recommendation) {
    return (
      <span style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>—</span>
    );
  }

  const { label, bg, color } = CONFIG[recommendation];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '4px',
        backgroundColor: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
