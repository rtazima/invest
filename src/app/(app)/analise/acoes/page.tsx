import type { Metadata } from 'next';
import { getEquityAnalyses } from '@/lib/data/analysis';
import { AnalysisView } from '@/components/analysis/AnalysisView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Análise — Ações · Invest' };

export default async function AcoesPage() {
  const data = await getEquityAnalyses();
  return <AnalysisView items={data} />;
}
