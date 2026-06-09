-- Arquétipos para ações internacionais (stocks_intl) e ETFs (etf_intl).
-- Taxonomia: financeiras | asset_light | capital_intensivo | commodity | utility | tech
-- Tech usa subsegment: ia | cloud | semicondutores | ciberseguranca | computacao_quantica | saas | outros_tech

INSERT INTO public.asset_archetypes (ticker, archetype, asset_class, subsegment, classified_by)
VALUES
  -- stocks_intl
  ('AVGO',   'tech',        'stocks_intl', 'semicondutores', 'manual'),
  ('GEV',    'utility',     'stocks_intl', NULL,             'manual'),
  ('GOOGL',  'tech',        'stocks_intl', 'ia',             'manual'),
  ('JNJ',    'asset_light', 'stocks_intl', NULL,             'manual'),
  ('KO',     'asset_light', 'stocks_intl', NULL,             'manual'),
  ('NEE',    'utility',     'stocks_intl', NULL,             'manual'),
  ('NVDA',   'tech',        'stocks_intl', 'semicondutores', 'manual'),
  ('PG',     'asset_light', 'stocks_intl', NULL,             'manual'),
  ('TSM',    'tech',        'stocks_intl', 'semicondutores', 'manual'),
  ('UNH',    'financeiras', 'stocks_intl', NULL,             'manual'),
  ('VST',    'utility',     'stocks_intl', NULL,             'manual'),
  -- etf_intl
  ('AV',     'financeiras', 'etf_intl', NULL, 'manual'),
  ('BND',    'utility',     'etf_intl', NULL, 'manual'),
  ('COPX',   'commodity',   'etf_intl', NULL, 'manual'),
  ('IAU',    'commodity',   'etf_intl', NULL, 'manual'),
  ('IBIT',   'commodity',   'etf_intl', NULL, 'manual'),
  ('JEPI',   'asset_light', 'etf_intl', NULL, 'manual'),
  ('JEPQ',   'tech',        'etf_intl', NULL, 'manual'),
  ('RYSGOV', 'utility',     'etf_intl', NULL, 'manual'),
  ('SCHD',   'asset_light', 'etf_intl', NULL, 'manual'),
  ('TFLO',   'utility',     'etf_intl', NULL, 'manual'),
  ('URNM',   'commodity',   'etf_intl', NULL, 'manual'),
  ('VEA',    'asset_light', 'etf_intl', NULL, 'manual'),
  ('VOO',    'asset_light', 'etf_intl', NULL, 'manual')
ON CONFLICT (ticker) DO UPDATE
  SET archetype   = EXCLUDED.archetype,
      asset_class = EXCLUDED.asset_class,
      subsegment  = EXCLUDED.subsegment;
