import { ARCHETYPE_LABELS, ARCHETYPE_COLORS } from '@/lib/analysis/types';
import { FII_TYPE_LABELS, FII_TYPE_COLORS } from '@/lib/analysis/fii-types';

const ALL_LABELS: Record<string, string> = { ...ARCHETYPE_LABELS, ...FII_TYPE_LABELS };
const ALL_COLORS: Record<string, string> = { ...ARCHETYPE_COLORS, ...FII_TYPE_COLORS };

interface Props {
  archetype: string;
}

export function ArchetypeChip({ archetype }: Props) {
  const label = ALL_LABELS[archetype] ?? archetype;
  const color = ALL_COLORS[archetype] ?? 'var(--color-text-3)';
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: '999px',
        backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
        whiteSpace: 'nowrap',
        lineHeight: '1.4',
      }}
    >
      {label}
    </span>
  );
}
