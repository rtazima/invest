import type { SemaphoreState } from '@/lib/analysis/types';

const STATE_LABELS: Record<SemaphoreState, string> = {
  ok: 'OK',
  warning: 'Atenção',
  critical: 'Crítico',
  informational: 'Informativo',
  missing: 'Sem dados',
};

const STATE_COLORS: Record<SemaphoreState, string> = {
  ok: 'var(--color-gain)',
  warning: 'oklch(0.75 0.16 80)',
  critical: 'var(--color-loss)',
  informational: 'var(--color-text-3)',
  missing: 'var(--color-line)',
};

interface Props {
  state: SemaphoreState;
  size?: number;
}

export function Semaphore({ state, size = 8 }: Props) {
  return (
    <span
      title={STATE_LABELS[state]}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: STATE_COLORS[state],
        flexShrink: 0,
      }}
    />
  );
}
