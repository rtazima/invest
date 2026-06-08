import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { saveFiiArchetype } from '@/lib/data/fii-analysis';
import type { FiiType, FiiSubsegment } from '@/lib/analysis/fii-types';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticker, fii_type, subsegment } = await req.json() as {
    ticker: string; fii_type: FiiType; subsegment: FiiSubsegment | null;
  };

  if (!ticker || !fii_type) return NextResponse.json({ error: 'ticker e fii_type obrigatórios' }, { status: 400 });

  await saveFiiArchetype(ticker, fii_type, subsegment);
  return NextResponse.json({ ok: true });
}
