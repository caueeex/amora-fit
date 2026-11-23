-- =============================================================================
-- Amora Fit — 0002: perfis, papéis, privilégios e RLS
-- Estratégia: revogar TUDO de anon/authenticated e conceder o mínimo necessário.
-- RLS habilitado em todas as tabelas; as escritas sensíveis (pedidos, estoque,
-- status) acontecem só por funções SQL (migration 0003).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin(): consultada pelas políticas. SECURITY DEFINER evita recursão de RLS
-- em profiles. Fica no schema "private" (não exposto pela API REST).
-- -----------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

grant usage on schema private to anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Criação automática do perfil no cadastro. O papel é SEMPRE 'customer'.
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g');
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120),
    case when v_phone ~ '^[0-9]{10,13}$' then v_phone end,
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_user_email();

-- -----------------------------------------------------------------------------
-- Ninguém muda o próprio papel pela API. Só o dono do banco (SQL Editor /
-- service_role) pode promover alguém a admin.
-- -----------------------------------------------------------------------------
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'AMORA:FORBIDDEN_ROLE_CHANGE' using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'AMORA:IMMUTABLE_ID' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function private.guard_profile_role();

-- -----------------------------------------------------------------------------
-- Privilégios de tabela (camada 1). Depois vem o RLS (camada 2).
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Catálogo: leitura pública (linhas filtradas por RLS); escrita só admin (RLS).
grant select on public.categories, public.products, public.product_images,
               public.product_variants, public.store_settings
  to anon, authenticated;
grant insert, update, delete on public.categories, public.products,
                                public.product_images, public.product_variants
  to authenticated;
grant update on public.store_settings to authenticated;

-- Estoque: visitante vê só a disponibilidade; autenticado lê a linha (RLS limita).
-- Escrita somente por funções (admin_adjust_inventory / pedidos).
grant select (variant_id, available) on public.inventory to anon;
grant select on public.inventory to authenticated;
grant update (low_stock_threshold) on public.inventory to authenticated;
grant select on public.inventory_movements to authenticated;

-- Perfil: o próprio usuário edita apenas dados cadastrais (nunca role/email/id).
grant select on public.profiles to authenticated;
grant update (full_name, phone, cpf) on public.profiles to authenticated;

grant select, insert, update, delete on public.addresses to authenticated;

-- Pedidos: somente leitura via API; criação e mudança de status só por funções.
grant select on public.orders, public.order_items, public.order_status_history,
               public.payments, public.shipments
  to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_variants      enable row level security;
alter table public.inventory             enable row level security;
alter table public.inventory_movements   enable row level security;
alter table public.addresses             enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.payments              enable row level security;
alter table public.shipments             enable row level security;
alter table public.store_settings        enable row level security;

-- profiles
create policy "profiles: próprio ou admin lê" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy "profiles: próprio atualiza" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- categories
create policy "categories: públicas ativas" on public.categories
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy "categories: admin insere" on public.categories
  for insert to authenticated with check ((select private.is_admin()));
create policy "categories: admin atualiza" on public.categories
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "categories: admin exclui" on public.categories
  for delete to authenticated using ((select private.is_admin()));

-- products
create policy "products: ativos são públicos" on public.products
  for select to anon, authenticated
  using (status = 'active' or (select private.is_admin()));
create policy "products: admin insere" on public.products
  for insert to authenticated with check ((select private.is_admin()));
create policy "products: admin atualiza" on public.products
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "products: admin exclui" on public.products
  for delete to authenticated using ((select private.is_admin()));

-- product_images
create policy "product_images: de produtos ativos" on public.product_images
  for select to anon, authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );
create policy "product_images: admin insere" on public.product_images
  for insert to authenticated with check ((select private.is_admin()));
create policy "product_images: admin atualiza" on public.product_images
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "product_images: admin exclui" on public.product_images
  for delete to authenticated using ((select private.is_admin()));

-- product_variants
create policy "product_variants: ativas de produtos ativos" on public.product_variants
  for select to anon, authenticated
  using (
    (select private.is_admin())
    or (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'))
  );
create policy "product_variants: admin insere" on public.product_variants
  for insert to authenticated with check ((select private.is_admin()));
create policy "product_variants: admin atualiza" on public.product_variants
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "product_variants: admin exclui" on public.product_variants
  for delete to authenticated using ((select private.is_admin()));

-- inventory
create policy "inventory: disponibilidade de variações visíveis" on public.inventory
  for select to anon, authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = variant_id and v.is_active and p.status = 'active'
    )
  );
create policy "inventory: admin ajusta limite" on public.inventory
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- inventory_movements
create policy "inventory_movements: admin lê" on public.inventory_movements
  for select to authenticated using ((select private.is_admin()));

-- addresses
create policy "addresses: dono ou admin lê" on public.addresses
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "addresses: dono insere" on public.addresses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "addresses: dono atualiza" on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "addresses: dono exclui" on public.addresses
  for delete to authenticated using (user_id = (select auth.uid()));

-- orders e relacionados: cliente lê os próprios; admin lê todos.
create policy "orders: dono ou admin lê" on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_admin()));

create policy "order_items: do pedido visível" on public.order_items
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );

create policy "order_status_history: do pedido visível" on public.order_status_history
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );

create policy "payments: do pedido visível" on public.payments
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );

create policy "shipments: do pedido visível" on public.shipments
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );

-- store_settings: leitura pública (não contém dados sensíveis); escrita só admin.
create policy "store_settings: leitura pública" on public.store_settings
  for select to anon, authenticated using (true);
create policy "store_settings: admin atualiza" on public.store_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
