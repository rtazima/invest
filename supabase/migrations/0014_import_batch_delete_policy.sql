create policy "import_batches: delete" on public.import_batches
  for delete using (
    exists (
      select 1 from public.holders h
      where h.id = import_batches.holder_id
        and is_family_owner(h.family_id)
    )
  );
