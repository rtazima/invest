import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { saveFiiManualData } from '@/lib/data/fii-analysis';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticker, overrides } = await req.json() as { ticker: string; overrides: Record<string, number | null> };
  if (!ticker) return NextResponse.json({ error: 'ticker obrigatório' }, { status: 400 });

  await saveFiiManualData(ticker, overrides);
  return NextResponse.json({ ok: true });
}
