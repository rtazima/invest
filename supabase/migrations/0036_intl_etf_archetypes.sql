-- Arquétipos para ações internacionais (stocks_intl) e ETFs (etf_br, etf_intl).
-- Usa a mesma tabela asset_archetypes com asset_class diferente.
-- Para tech, use o campo subsegment para o sub-tema:
--   ia | cloud | semicondutores | ciberseguranca | computacao_quantica | saas | outros_tech
--
-- Preencha com seus tickers reais antes de aplicar.

INSERT INTO public.asset_archetypes (ticker, archetype, asset_class, subsegment, classified_by)
VALUES
  -- === AÇÕES INTERNACIONAIS (stocks_intl) ===
  -- Exemplos — substitua pelos seus tickers reais:
  -- ('AAPL',  'tech',        'stocks_intl', 'saas',            'manual'),
  -- ('MSFT',  'tech',        'stocks_intl', 'cloud',           'manual'),
  -- ('NVDA',  'tech',        'stocks_intl', 'semicondutores',  'manual'),
  -- ('GOOGL', 'tech',        'stocks_intl', 'ia',              'manual'),
  -- ('AMZN',  'tech',        'stocks_intl', 'cloud',           'manual'),
  -- ('META',  'tech',        'stocks_intl', 'saas',            'manual'),
  -- ('JPM',   'financeiras', 'stocks_intl', NULL,              'manual'),
  -- ('XOM',   'commodity',   'stocks_intl', NULL,              'manual'),

  -- === ETFs INTERNACIONAIS (etf_intl) ===
  -- ('VOO',   'asset_light', 'etf_intl', NULL, 'manual'),  -- S&P 500 amplo
  -- ('QQQ',   'tech',        'etf_intl', NULL, 'manual'),  -- Nasdaq tech
  -- ('SOXX',  'tech',        'etf_intl', 'semicondutores', 'manual'),
  -- ('ARKK',  'tech',        'etf_intl', 'ia',             'manual'),
  -- ('CIBR',  'tech',        'etf_intl', 'ciberseguranca', 'manual'),

  -- === ETFs BRASILEIROS (etf_br) ===
  -- ('BOVA11', 'asset_light', 'etf_br', NULL, 'manual'),   -- Ibovespa
  -- ('IVVB11', 'asset_light', 'etf_br', NULL, 'manual'),   -- S&P 500 via BR
  -- ('HASH11', 'tech',        'etf_br', NULL, 'manual'),   -- Cripto/tech

  -- Linha placeholder para sintaxe válida (remova quando adicionar os reais):
  ('__PLACEHOLDER__', 'asset_light', 'etf_br', NULL, 'manual')
ON CONFLICT (ticker) DO UPDATE
  SET archetype   = EXCLUDED.archetype,
      asset_class = EXCLUDED.asset_class,
      subsegment  = EXCLUDED.subsegment;

-- Remove o placeholder após inserir os tickers reais:
DELETE FROM public.asset_archetypes WHERE ticker = '__PLACEHOLDER__';
