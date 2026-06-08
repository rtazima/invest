import type { Metadata } from 'next';
import { getFiiAnalyses } from '@/lib/data/fii-analysis';
import { FiiAnalysisView } from '@/components/analysis/FiiAnalysisView';

export const metadata: Metadata = { title: 'Análise — FIIs · Invest' };

export default async function FiisPage() {
  const { items, holders } = await getFiiAnalyses();
  return <FiiAnalysisView items={items} holders={holders} />;
}
