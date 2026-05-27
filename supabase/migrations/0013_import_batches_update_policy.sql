-- Permite que o usuário atualize status do batch após inserir posições
create policy "import_batches: update" on public.import_batches
  for update using (
    exists (
      select 1 from public.holders h
      where h.id = import_batches.holder_id
        and (h.user_id = auth.uid() or is_family_owner(h.family_id))
    )
  );
