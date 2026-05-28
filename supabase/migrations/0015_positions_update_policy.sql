-- Permite que o owner da família atualize posições dos seus titulares
create policy "positions: update" on public.positions
  for update using (
    exists (
      select 1 from public.holders h
      where h.id = positions.holder_id
        and is_family_owner(h.family_id)
    )
  );
