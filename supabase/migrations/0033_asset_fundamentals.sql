create table if not exists public.asset_fundamentals (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  fetched_at timestamptz not null default now(),
  source text default 'fundamentus',
  -- from fundamentus
  pl numeric,
  pvp numeric,
  dy numeric,
  ev_ebitda numeric,
  marg_bruta numeric,
  marg_ebit numeric,
  marg_liquida numeric,
  roe numeric,
  roa numeric,
  roic numeric,
  div_liq_ebitda numeric,
  div_liq_patrim numeric,
  cresc_rec_5a numeric,
  liquidez_corr numeric,
  ebitda numeric,
  receita_liquida numeric,
  lucro_liquido numeric,
  -- from brapi
  preco_atual numeric,
  volume_medio numeric,
  market_cap numeric,
  sector_b3 text,
  -- manual overrides (JSON: field_name -> value)
  -- keys: basileia, cet1, npl, cobertura_provisoes, indice_eficiencia, nim,
  --       cobertura_juros, fcf_conversion, runway, sbc_receita,
  --       receita_contratada, custo_divida, posicao_custo
  manual_overrides jsonb default '{}',
  raw_fundamentus jsonb,
  raw_brapi jsonb
);
create index on public.asset_fundamentals (ticker, fetched_at desc);
alter table public.asset_fundamentals enable row level security;
create policy "owner_all" on public.asset_fundamentals for all using (true);
