-- Troca birth_year + is_minor por birth_date
alter table public.holders
  add column if not exists birth_date date;

-- Migra dados existentes (ano de nascimento → 1º de julho como aproximação)
update public.holders
set birth_date = make_date(birth_year, 7, 1)
where birth_year is not null and birth_date is null;

alter table public.holders
  drop column if exists birth_year,
  drop column if exists is_minor;

-- RLS: owner pode excluir holders não-owner da família
create policy "holders: delete" on public.holders
  for delete using (
    role != 'owner'
    and is_family_owner(family_id)
  );
