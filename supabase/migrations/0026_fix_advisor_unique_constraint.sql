-- Troca o unique constraint global por índice parcial que ignora revogados.
-- O constraint original bloqueava re-convite para o mesmo email após revogar.
ALTER TABLE public.family_advisors DROP CONSTRAINT IF EXISTS family_advisors_family_id_invited_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS family_advisors_active_email_unique
  ON public.family_advisors (family_id, invited_email)
  WHERE status != 'revoked';
