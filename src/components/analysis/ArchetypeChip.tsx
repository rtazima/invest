import type { Archetype } from '@/lib/analysis/types';
import { ARCHETYPE_LABELS, ARCHETYPE_COLORS } from '@/lib/analysis/types';

interface Props {
  archetype: Archetype;
}

export function ArchetypeChip({ archetype }: Props) {
  const color = ARCHETYPE_COLORS[archetype];
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
      {ARCHETYPE_LABELS[archetype]}
    </span>
  );
}
