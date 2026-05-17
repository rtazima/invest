-- holders
create policy "holders: owner select" on public.holders for select using (owner_id = auth.uid());
create policy "holders: owner insert" on public.holders for insert with check (owner_id = auth.uid());
create policy "holders: owner update" on public.holders for update using (owner_id = auth.uid());

-- strategies (via holder)
create policy "strategies: owner select" on public.strategies for select
  using (exists (select 1 from public.holders h where h.id = strategies.holder_id and h.owner_id = auth.uid()));
create policy "strategies: owner insert" on public.strategies for insert
  with check (exists (select 1 from public.holders h where h.id = holder_id and h.owner_id = auth.uid()));
create policy "strategies: owner update" on public.strategies for update
  using (exists (select 1 from public.holders h where h.id = strategies.holder_id and h.owner_id = auth.uid()));

-- strategy_allocations (via strategy → holder)
create policy "strategy_allocations: owner select" on public.strategy_allocations for select
  using (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_allocations.strategy_id and h.owner_id = auth.uid()));
create policy "strategy_allocations: owner insert" on public.strategy_allocations for insert
  with check (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_id and h.owner_id = auth.uid()));
create policy "strategy_allocations: owner update" on public.strategy_allocations for update
  using (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_allocations.strategy_id and h.owner_id = auth.uid()));
create policy "strategy_allocations: owner delete" on public.strategy_allocations for delete
  using (exists (select 1 from public.strategies s join public.holders h on h.id = s.holder_id
    where s.id = strategy_allocations.strategy_id and h.owner_id = auth.uid()));

-- import_batches
create policy "import_batches: owner select" on public.import_batches for select
  using (exists (select 1 from public.holders h where h.id = import_batches.holder_id and h.owner_id = auth.uid()));
create policy "import_batches: owner insert" on public.import_batches for insert
  with check (exists (select 1 from public.holders h where h.id = holder_id and h.owner_id = auth.uid()));

-- positions
create policy "positions: owner select" on public.positions for select
  using (exists (select 1 from public.holders h where h.id = positions.holder_id and h.owner_id = auth.uid()));
create policy "positions: owner insert" on public.positions for insert
  with check (exists (select 1 from public.holders h where h.id = holder_id and h.owner_id = auth.uid()));

-- alerts (holder_id null = global, visível para qualquer auth)
create policy "alerts: owner select" on public.alerts for select
  using (holder_id is null or exists (select 1 from public.holders h where h.id = alerts.holder_id and h.owner_id = auth.uid()));
create policy "alerts: owner update" on public.alerts for update
  using (holder_id is null or exists (select 1 from public.holders h where h.id = alerts.holder_id and h.owner_id = auth.uid()));

-- exchange_rates
create policy "exchange_rates: any auth select" on public.exchange_rates for select using (auth.uid() is not null);
create policy "exchange_rates: owner insert" on public.exchange_rates for insert with check (registered_by = auth.uid());
