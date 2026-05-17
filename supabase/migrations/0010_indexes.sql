create index positions_holder_id_idx on public.positions (holder_id);
create index positions_batch_id_idx on public.positions (batch_id);
create index positions_institution_idx on public.positions (institution);
create index positions_asset_class_idx on public.positions (asset_class);
create index import_batches_holder_institution_idx on public.import_batches (holder_id, institution, imported_at desc);
create index alerts_holder_status_idx on public.alerts (holder_id, status);
create index alerts_severity_idx on public.alerts (severity);
create index import_batches_latest_idx on public.import_batches (holder_id, institution, completed_at desc nulls last)
  where status = 'completed';
