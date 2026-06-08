import type { SemaphoreState, AnalysisRule } from '@/lib/analysis/types';
import { Semaphore } from './Semaphore';

interface Props {
  semaphores: Record<string, SemaphoreState>;
  rules: AnalysisRule[];
}

export function SemaphoreRow({ semaphores, rules }: Props) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
      {rules.map(rule => {
        const state = semaphores[rule.metric_id] ?? 'missing';
        return (
          <span key={rule.metric_id} title={`${rule.label}: ${state}`}>
            <Semaphore state={state} size={8} />
          </span>
        );
      })}
    </div>
  );
}
