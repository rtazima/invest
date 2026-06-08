import { createUntypedServerClient } from '@/lib/supabase/untyped';
import { ParametrosView } from '@/components/analysis/ParametrosView';
import type { AnalysisRule } from '@/lib/analysis/types';

export default async function ParametrosPage() {
  const db = await createUntypedServerClient();
  const [stocksData, fiisData] = await Promise.all([
    db.from('asset_analysis_rules').select('*').eq('asset_class', 'stocks_br').order('archetype').order('metric_id'),
    db.from('asset_analysis_rules').select('*').eq('asset_class', 'fiis').order('archetype').order('metric_id'),
  ]);

  return (
    <ParametrosView
      rules={(stocksData.data ?? []) as AnalysisRule[]}
      fiiRules={(fiisData.data ?? []) as AnalysisRule[]}
    />
  );
}
