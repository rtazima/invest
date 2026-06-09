-- Unifica asset_archetypes para cobrir ações e FIIs na mesma tabela.
-- Ações: asset_class = 'stocks_br', FIIs: asset_class = 'fiis'.

-- 1. Remove o CHECK restritivo ao conjunto de arquétipos de ações
ALTER TABLE public.asset_archetypes
  DROP CONSTRAINT IF EXISTS asset_archetypes_archetype_check;

-- 2. Adiciona colunas asset_class e subsegment
ALTER TABLE public.asset_archetypes
  ADD COLUMN IF NOT EXISTS asset_class text NOT NULL DEFAULT 'stocks_br',
  ADD COLUMN IF NOT EXISTS subsegment  text;

-- 3. Insere os FIIs (idempotente)
INSERT INTO public.asset_archetypes (ticker, archetype, asset_class, subsegment, classified_by)
VALUES
  ('AZPR11', 'papel',           'fiis', NULL,         'manual'),
  ('AZQI11', 'papel',           'fiis', NULL,         'manual'),
  ('CACR11', 'papel',           'fiis', NULL,         'manual'),
  ('CPAC11', 'papel',           'fiis', NULL,         'manual'),
  ('CPHF11', 'fof',             'fiis', NULL,         'manual'),
  ('IMOV11', 'hibrido',         'fiis', NULL,         'manual'),
  ('JURO11', 'papel',           'fiis', NULL,         'manual'),
  ('KJNT11', 'papel',           'fiis', NULL,         'manual'),
  ('MCCE11', 'papel',           'fiis', NULL,         'manual'),
  ('PIER11', 'tijolo',          'fiis', 'logistica',  'manual'),
  ('TGAR11', 'hibrido',         'fiis', NULL,         'manual'),
  ('VGIA11', 'papel',           'fiis', NULL,         'manual'),
  ('VISC11', 'tijolo',          'fiis', 'shoppings',  'manual'),
  ('XPAG11', 'papel',           'fiis', NULL,         'manual'),
  ('XPCI11', 'papel',           'fiis', NULL,         'manual'),
  ('ZAVI11', 'desenvolvimento',  'fiis', NULL,         'manual')
ON CONFLICT (ticker) DO UPDATE
  SET archetype   = EXCLUDED.archetype,
      asset_class = EXCLUDED.asset_class,
      subsegment  = EXCLUDED.subsegment;

-- 4. Remove tabela redundante
DROP TABLE IF EXISTS public.fii_archetypes;
