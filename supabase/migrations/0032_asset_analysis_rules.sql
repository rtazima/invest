create table if not exists public.asset_analysis_rules (
  id uuid primary key default gen_random_uuid(),
  metric_id text not null,
  archetype text,  -- null = transversal
  label text not null,
  field_name text not null,
  direction text not null check (direction in ('lower_is_better','higher_is_better')),
  unit text,
  structural boolean default false,
  auto_fetch boolean default true,
  threshold_ok text not null,
  threshold_warning text not null,
  threshold_critical text not null,
  trend_window_quarters int default 8,
  context_notes text,
  unique (metric_id, archetype)
);
alter table public.asset_analysis_rules enable row level security;
create policy "owner_all" on public.asset_analysis_rules for all using (true);

-- Financeiras
insert into public.asset_analysis_rules
  (metric_id, archetype, label, field_name, direction, unit, structural, auto_fetch, threshold_ok, threshold_warning, threshold_critical, trend_window_quarters, context_notes)
values
  ('roe_financeiras','financeiras','ROE','roe','higher_is_better','%',false,true,'>= 15','10 - 15','< 10',8,'Retorno sobre patrimônio. Abaixo do custo de capital destrói valor.'),
  ('roa','financeiras','ROA','roa','higher_is_better','%',false,true,'>= 1.5','1.0 - 1.5','< 1.0',8,'Eficiência do ativo sem disfarce da alavancagem.'),
  ('basileia','financeiras','Índice de Basileia','manual_basileia','higher_is_better','%',true,false,'>= 14','11.5 - 14','< 11.5',8,'Colchão de capital regulatório. Mínimo ~10,5% com adicionais.'),
  ('cet1','financeiras','CET1','manual_cet1','higher_is_better','%',true,false,'>= 12','9 - 12','< 9',8,'Capital de maior qualidade que absorve perda real.'),
  ('indice_eficiencia','financeiras','Índice de Eficiência','manual_indice_eficiencia','lower_is_better','%',false,false,'<= 45','45 - 55','> 55',8,'Custo sobre receita. Quanto menor melhor.'),
  ('npl','financeiras','Inadimplência 90d (NPL)','manual_npl','lower_is_better','%',true,false,'< 3','3 - 5','> 5',8,'Qualidade da carteira de crédito.'),
  ('cobertura_provisoes','financeiras','Cobertura de Provisões','manual_cobertura_provisoes','higher_is_better','%',true,false,'>= 150','100 - 150','< 100',8,'PDD/NPL. Abaixo de 100% o banco está sub-provisionado.'),
  ('pvp_financeiras','financeiras','P/VP','pvp','higher_is_better','x',false,true,'informational','informational','informational',0,'P/VP deve ser comparado ao P/VP justo = ROE/Ke. Exibir valor informativo.');

-- Asset-light
insert into public.asset_analysis_rules
  (metric_id, archetype, label, field_name, direction, unit, structural, auto_fetch, threshold_ok, threshold_warning, threshold_critical, trend_window_quarters, context_notes)
values
  ('cresc_receita','asset_light','Cresc. Receita (5a)','cresc_rec_5a','higher_is_better','%',false,true,'> 15','5 - 15','< 5',8,'Crescimento estagnado quebra a tese de asset-light.'),
  ('marg_bruta','asset_light','Margem Bruta','marg_bruta','higher_is_better','%',false,true,'>= 60','40 - 60','< 40',8,'Poder de precificação e escalabilidade.'),
  ('roic_al','asset_light','ROIC','roic','higher_is_better','%',false,true,'> 15','8 - 15','< 8',8,'Retorno sobre capital. Abaixo do custo de capital destrói valor mesmo crescendo.'),
  ('sbc_receita','asset_light','SBC / Receita','manual_sbc_receita','lower_is_better','%',false,false,'< 5','5 - 10','> 10',8,'Remuneração em ações dilui o acionista.'),
  ('runway','asset_light','Runway (meses)','manual_runway','higher_is_better','meses',true,false,'> 24','12 - 24','< 12',0,'Fôlego de caixa. Pouco runway força captação diluidora.');

-- Capital-intensivo
insert into public.asset_analysis_rules
  (metric_id, archetype, label, field_name, direction, unit, structural, auto_fetch, threshold_ok, threshold_warning, threshold_critical, trend_window_quarters, context_notes)
values
  ('roic_ci','capital_intensivo','ROIC','roic','higher_is_better','%',false,true,'> 12','8 - 12','< 8',8,'ROIC vs WACC. Só cria valor quem rende acima do custo do capital.'),
  ('div_liq_ebitda_ci','capital_intensivo','Dív. Líq. / EBITDA','div_liq_ebitda','lower_is_better','x',true,true,'< 2.0','2.0 - 3.5','> 3.5',8,'Alavancagem. Empresa lucrativa quebra por liquidez.'),
  ('cobertura_juros','capital_intensivo','Cobertura de Juros','manual_cobertura_juros','higher_is_better','x',true,false,'> 4','2 - 4','< 2',8,'EBIT / despesa financeira. Capacidade de pagar juros.'),
  ('marg_ebit_ci','capital_intensivo','Margem EBIT','marg_ebit','higher_is_better','%',false,true,'> 10','5 - 10','< 5',8,'Margem operacional. Avaliar tendência.'),
  ('fcf_conversion','capital_intensivo','Conversão FCF','manual_fcf_conversion','higher_is_better','%',false,false,'> 80','50 - 80','< 50',8,'FCF / lucro líquido. Lucro que não vira caixa esconde capex pesado.');

-- Commodity
insert into public.asset_analysis_rules
  (metric_id, archetype, label, field_name, direction, unit, structural, auto_fetch, threshold_ok, threshold_warning, threshold_critical, trend_window_quarters, context_notes)
values
  ('posicao_custo','commodity','Posição na Curva de Custo (quartil)','manual_posicao_custo','lower_is_better','quartil',true,false,'<= 2','3','4',0,'1=baixo custo, 4=alto custo. Única vantagem durável é ser produtor de baixo custo.'),
  ('div_liq_ebitda_co','commodity','Dív. Líq. / EBITDA','div_liq_ebitda','lower_is_better','x',true,true,'< 1.5','1.5 - 2.5','> 2.5',8,'Corte mais apertado: EBITDA colapsa no vale e a dívida fica.'),
  ('ev_ebitda_co','commodity','EV / EBITDA','ev_ebitda','lower_is_better','x',false,true,'informational','informational','informational',0,'Usar EBITDA normalizado pelo ciclo, não o corrente.');

-- Utility
insert into public.asset_analysis_rules
  (metric_id, archetype, label, field_name, direction, unit, structural, auto_fetch, threshold_ok, threshold_warning, threshold_critical, trend_window_quarters, context_notes)
values
  ('div_liq_ebitda_ut','utility','Dív. Líq. / EBITDA','div_liq_ebitda','lower_is_better','x',true,true,'< 3.5','3.5 - 4.5','> 4.5',8,'Corte afrouxado: fluxo contratado sustenta mais dívida.'),
  ('receita_contratada','utility','Receita Contratada / Total','manual_receita_contratada','higher_is_better','%',false,false,'> 80','60 - 80','< 60',8,'Previsibilidade do caixa. Quanto mais contratado menor o risco.'),
  ('dy_ut','utility','Dividend Yield','dy','higher_is_better','%',false,true,'> 8','5 - 8','< 5',8,'Utility é ativo de dividendo. DY não coberto por FCF é insustentável.'),
  ('custo_divida','utility','Custo Médio da Dívida','manual_custo_divida','lower_is_better','%',false,false,'< 10','10 - 14','> 14',8,'Sensível a juros. Custo alto pressiona o caixa.');
