-- XP Global (XP Investments US LLC) é uma conta em USD, legalmente separada da XP BR (BRL).
-- Importação via PDF do Account Statement. Fica como instituição própria para ter
-- card, status de sync e agrupamento separados da XP BR no dashboard.
ALTER TYPE institution ADD VALUE IF NOT EXISTS 'xp_global';
