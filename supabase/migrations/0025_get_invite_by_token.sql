-- Função SECURITY DEFINER para leitura pública de convites por token.
-- Necessária porque a tabela family_advisors tem RLS que bloqueia leituras anônimas,
-- mas a página /invite/accept precisa exibir detalhes do convite sem autenticação.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token uuid)
RETURNS TABLE (
  id           uuid,
  family_id    uuid,
  invited_email text,
  role         text,
  status       text,
  invite_token uuid,
  invited_at   timestamptz,
  accepted_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, family_id, invited_email, role, status, invite_token, invited_at, accepted_at
  FROM public.family_advisors
  WHERE invite_token = p_token
  LIMIT 1;
$$;
