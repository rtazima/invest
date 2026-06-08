import { createUntypedServerClient } from '@/lib/supabase/untyped';
import { ParametrosView } from '@/components/analysis/ParametrosView';
import type { AnalysisRule } from '@/lib/analysis/types';

export default async function ParametrosPage() {
  const db = await createUntypedServerClient();
  const { data } = await db
    .from('asset_analysis_rules')
    .select('*')
    .order('archetype')
    .order('metric_id');

  const rules = (data ?? []) as AnalysisRule[];

  return <ParametrosView rules={rules} />;
}
