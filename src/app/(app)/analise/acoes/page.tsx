import type { Metadata } from 'next';
import { getEquityAnalyses } from '@/lib/data/analysis';
import { AnalysisView } from '@/components/analysis/AnalysisView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Análise — Ações · Invest' };

export default async function AcoesPage() {
  const { items, holders } = await getEquityAnalyses();
  return <AnalysisView items={items} holders={holders} />;
}
