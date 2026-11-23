-- =============================================================================
-- Amora Fit — 0012: página inicial configurável (seções) + gestão de categorias.
-- Cada seção tem tipo, ordem, liga/desliga, agendamento (início/fim) e
-- configuração própria (jsonb validado no servidor antes de gravar).
-- Leitura pública só das seções ativas e dentro do período agendado.
-- =============================================================================
create table if not exists public.home_sections (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('banners', 'hero', 'categories', 'products', 'double_banner', 'text')),
  title       text not null default '' check (char_length(title) <= 120),
  position    integer not null default 0,
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  config      jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object' and pg_column_size(config) < 65536),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  constraint home_sections_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists home_sections_order_idx on public.home_sections (position);

drop trigger if exists home_sections_updated_at on public.home_sections;
create trigger home_sections_updated_at before update on public.home_sections
  for each row execute function private.set_updated_at();

-- Privilégios + RLS (padrão do projeto: nada é liberado por omissão).
revoke all on public.home_sections from anon, authenticated;
grant select on public.home_sections to anon, authenticated;
grant insert, update, delete on public.home_sections to authenticated;
alter table public.home_sections enable row level security;

drop policy if exists "home_sections: no ar é público" on public.home_sections;
create policy "home_sections: no ar é público" on public.home_sections
  for select to anon, authenticated
  using (
    (select private.is_admin())
    or (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
  );
drop policy if exists "home_sections: admin insere" on public.home_sections;
create policy "home_sections: admin insere" on public.home_sections
  for insert to authenticated with check ((select private.is_admin()));
drop policy if exists "home_sections: admin atualiza" on public.home_sections;
create policy "home_sections: admin atualiza" on public.home_sections
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "home_sections: admin exclui" on public.home_sections;
create policy "home_sections: admin exclui" on public.home_sections
  for delete to authenticated using ((select private.is_admin()));

-- Seções iniciais = a home de hoje (nada muda visualmente até editar).
insert into public.home_sections (type, title, position, config)
select * from (values
  ('hero',       '',                  1, '{}'::jsonb),
  ('categories', 'Categorias',        2, '{}'::jsonb),
  ('products',   'Destaques',         3, '{"eyebrow": "Escolhidos para você", "source": "featured", "limit": 8, "link_href": "/produtos"}'::jsonb),
  ('products',   'Novidades',         4, '{"eyebrow": "Acabou de chegar", "source": "new", "limit": 8, "link_href": "/produtos?ordem=novidades"}'::jsonb),
  ('products',   'Mais vendidos',     5, '{"eyebrow": "As queridinhas", "source": "best", "limit": 8}'::jsonb),
  ('products',   'Todos os produtos', 6, '{"eyebrow": "Coleção completa", "source": "all", "limit": 16, "link_href": "/produtos"}'::jsonb)
) as s(type, title, position, config)
where not exists (select 1 from public.home_sections);
