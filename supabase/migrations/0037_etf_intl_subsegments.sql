-- Subsegmentos/temas para ETFs internacionais.
-- Taxonomy: mercado_amplo | dividendos | renda_fixa | ouro | bitcoin | cobre | uranio | nasdaq

UPDATE public.asset_archetypes SET subsegment = 'mercado_amplo' WHERE ticker IN ('VOO', 'VEA');
UPDATE public.asset_archetypes SET subsegment = 'dividendos'    WHERE ticker IN ('JEPI', 'SCHD');
UPDATE public.asset_archetypes SET subsegment = 'nasdaq'        WHERE ticker = 'JEPQ';
UPDATE public.asset_archetypes SET subsegment = 'ouro'          WHERE ticker = 'IAU';
UPDATE public.asset_archetypes SET subsegment = 'bitcoin'       WHERE ticker = 'IBIT';
UPDATE public.asset_archetypes SET subsegment = 'cobre'         WHERE ticker = 'COPX';
UPDATE public.asset_archetypes SET subsegment = 'uranio'        WHERE ticker = 'URNM';
UPDATE public.asset_archetypes SET subsegment = 'renda_fixa'    WHERE ticker IN ('BND', 'TFLO', 'RYSGOV');
