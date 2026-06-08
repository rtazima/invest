import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createUntypedServerClient } from '@/lib/supabase/untyped';
import { runStructuredAnalysis } from '@/lib/analysis/runner';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();

  const secret = req.headers.get('x-agent-secret');
  if (secret !== process.env['AGENT_SECRET']) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let tickers: string[] | undefined;
    try {
      const body = await req.json() as { tickers?: string[] };
      if (Array.isArray(body.tickers) && body.tickers.length > 0) tickers = body.tickers;
    } catch { /* no body */ }

    const db = await createUntypedServerClient();
    const result = await runStructuredAnalysis(tickers, { supabase, db });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro' }, { status: 500 });
  }
}
