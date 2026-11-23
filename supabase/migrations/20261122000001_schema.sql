-- =============================================================================
-- Amora Fit — 0001: schema (tipos, tabelas, índices, gatilhos básicos)
-- Valores monetários: integer em CENTAVOS (nunca float/numeric com casas soltas).
-- =============================================================================

-- Schema interno: funções auxiliares que NÃO devem ser expostas pela API REST.
create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin');

create type public.order_status as enum (
  'PENDING',          -- aguardando atendimento
  'AWAITING_PAYMENT', -- aguardando pagamento
  'PAID',             -- pagamento confirmado
  'PROCESSING',       -- em preparação
  'INVOICED',         -- faturado (marcação administrativa; NÃO é emissão de nota fiscal)
  'SHIPPED',          -- enviado
  'COMPLETED',        -- concluído
  'CANCELLED'         -- cancelado
);

create type public.product_status as enum ('draft', 'active', 'archived');

create type public.inventory_movement_type as enum (
  'restock',    -- entrada de mercadoria
  'adjustment', -- ajuste manual (inventário, avaria...)
  'reserve',    -- reserva ao criar pedido
  'release',    -- liberação de reserva (cancelamento/expiração antes do pagamento)
  'sale',       -- baixa definitiva ao confirmar pagamento
  'return'      -- devolução ao estoque (cancelamento após pagamento)
);

create type public.payment_status as enum ('pending', 'confirmed', 'refunded');

create type public.payment_method as enum ('pix', 'credit_card', 'debit_card', 'cash', 'bank_transfer', 'other');

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  phone       text check (phone ~ '^[0-9]{10,13}$'),
  cpf         text check (cpf ~ '^[0-9]{11}$'),
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role = 'admin';
create index profiles_full_name_idx on public.profiles (lower(full_name));
create index profiles_email_idx on public.profiles (lower(email));

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 60),
  position    integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();

create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid references public.categories (id) on delete restrict,
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name               text not null check (char_length(name) between 2 and 120),
  description        text not null default '' check (char_length(description) <= 5000),
  price_cents        integer not null check (price_cents > 0),
  promo_price_cents  integer check (promo_price_cents > 0),
  status             public.product_status not null default 'draft',
  is_new             boolean not null default false,
  is_featured        boolean not null default false,
  search             tsvector generated always as (
                       to_tsvector('portuguese', name || ' ' || description)
                     ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint products_promo_lt_price check (promo_price_cents is null or promo_price_cents < price_cents)
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index products_featured_idx on public.products (is_featured) where status = 'active';
create index products_new_idx on public.products (is_new) where status = 'active';
create index products_search_idx on public.products using gin (search);
create trigger products_updated_at before update on public.products
  for each row execute function private.set_updated_at();

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  storage_path  text not null check (char_length(storage_path) between 1 and 500),
  alt_text      text not null default '' check (char_length(alt_text) <= 200),
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  color_name  text not null check (char_length(color_name) between 1 and 40),
  color_hex   text not null default '#000000' check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  size        text not null check (size in ('PP', 'P', 'M', 'G', 'GG', 'XG', 'U')),
  sku         text unique check (sku is null or char_length(sku) between 1 and 60),
  is_active   boolean not null default true,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, color_name, size)
);
create index product_variants_product_idx on public.product_variants (product_id);
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function private.set_updated_at();

-- Estoque por variação. available = on_hand - reserved.
create table public.inventory (
  variant_id           uuid primary key references public.product_variants (id) on delete cascade,
  on_hand              integer not null default 0 check (on_hand >= 0),
  reserved             integer not null default 0 check (reserved >= 0),
  available            integer generated always as (on_hand - reserved) stored,
  low_stock_threshold  integer not null default 3 check (low_stock_threshold >= 0),
  updated_at           timestamptz not null default now(),
  constraint inventory_reserved_le_on_hand check (reserved <= on_hand)
);
create index inventory_low_stock_idx on public.inventory (available);
create trigger inventory_updated_at before update on public.inventory
  for each row execute function private.set_updated_at();

-- Toda variação nasce com linha de estoque zerada.
create or replace function private.create_inventory_for_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory (variant_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger product_variants_inventory after insert on public.product_variants
  for each row execute function private.create_inventory_for_variant();

create table public.inventory_movements (
  id              bigint generated always as identity primary key,
  variant_id      uuid references public.product_variants (id) on delete set null,
  type            public.inventory_movement_type not null,
  delta_on_hand   integer not null default 0,
  delta_reserved  integer not null default 0,
  on_hand_after   integer not null,
  reserved_after  integer not null,
  order_id        uuid,
  actor_id        uuid references public.profiles (id) on delete set null,
  note            text check (char_length(note) <= 500),
  created_at      timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);

-- -----------------------------------------------------------------------------
-- Endereços
-- -----------------------------------------------------------------------------
create table public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  label           text not null default 'Casa' check (char_length(label) between 1 and 40),
  recipient_name  text not null check (char_length(recipient_name) between 2 and 120),
  phone           text check (phone ~ '^[0-9]{10,13}$'),
  cep             text not null check (cep ~ '^[0-9]{8}$'),
  street          text not null check (char_length(street) between 2 and 160),
  number          text not null check (char_length(number) between 1 and 20),
  complement      text check (char_length(complement) <= 80),
  district        text not null check (char_length(district) between 2 and 80),
  city            text not null check (char_length(city) between 2 and 80),
  state           text not null check (state ~ '^[A-Z]{2}$'),
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user on public.addresses (user_id) where is_default;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------
create sequence public.order_number_seq start with 1;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint not null unique default nextval('public.order_number_seq'),
  customer_id       uuid not null references public.profiles (id) on delete restrict,
  status            public.order_status not null default 'PENDING',
  -- Cópias (snapshot) no momento da compra: alterações futuras no perfil/endereço não mudam o pedido.
  customer_name     text not null,
  customer_email    text,
  customer_phone    text,
  shipping_address  jsonb not null,
  subtotal_cents    integer not null check (subtotal_cents >= 0),
  shipping_cents    integer not null default 0 check (shipping_cents >= 0),
  discount_cents    integer not null default 0 check (discount_cents >= 0),
  total_cents       integer not null check (total_cents >= 0),
  customer_note     text check (char_length(customer_note) <= 500),
  idempotency_key   uuid not null,
  reservation_expires_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_total_consistent check (total_cents = subtotal_cents + shipping_cents - discount_cents),
  constraint orders_idempotency_unique unique (customer_id, idempotency_key)
);
alter sequence public.order_number_seq owned by public.orders.order_number;
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_expiring_idx on public.orders (reservation_expires_at)
  where status in ('PENDING', 'AWAITING_PAYMENT');
create trigger orders_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  variant_id        uuid references public.product_variants (id) on delete set null,
  -- Snapshot histórico: preço e descrição da época da compra.
  product_name      text not null,
  product_slug      text,
  color_name        text not null,
  size              text not null,
  sku               text,
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  quantity          integer not null check (quantity between 1 and 99),
  line_total_cents  integer not null,
  created_at        timestamptz not null default now(),
  constraint order_items_line_total check (line_total_cents = unit_price_cents * quantity)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

alter table public.inventory_movements
  add constraint inventory_movements_order_fk foreign key (order_id)
  references public.orders (id) on delete set null;

create table public.order_status_history (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  changed_by   uuid references public.profiles (id) on delete set null, -- null = sistema
  note         text check (char_length(note) <= 500),
  created_at   timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  method        public.payment_method not null,
  status        public.payment_status not null default 'pending',
  amount_cents  integer not null check (amount_cents >= 0),
  confirmed_by  uuid references public.profiles (id) on delete set null,
  confirmed_at  timestamptz,
  note          text check (char_length(note) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

create table public.shipments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references public.orders (id) on delete cascade,
  carrier        text check (char_length(carrier) <= 80),
  tracking_code  text check (char_length(tracking_code) <= 80),
  tracking_url   text check (tracking_url is null or tracking_url ~ '^https://'),
  shipped_at     timestamptz,
  delivered_at   timestamptz,
  note           text check (char_length(note) <= 500),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger shipments_updated_at before update on public.shipments
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Configurações da loja (linha única)
-- -----------------------------------------------------------------------------
create table public.store_settings (
  id                         smallint primary key default 1 check (id = 1),
  store_name                 text not null default 'Amora Fit' check (char_length(store_name) between 2 and 60),
  tagline                    text not null default '' check (char_length(tagline) <= 160),
  logo_path                  text,
  whatsapp_phone             text not null check (whatsapp_phone ~ '^55[0-9]{10,11}$'),
  contact_email              text check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone              text,
  instagram_url              text check (instagram_url is null or instagram_url ~ '^https://'),
  tiktok_url                 text check (tiktok_url is null or tiktok_url ~ '^https://'),
  banner_active              boolean not null default false,
  banner_title               text not null default '' check (char_length(banner_title) <= 120),
  banner_text                text not null default '' check (char_length(banner_text) <= 500),
  banner_image_path          text,
  about_text                 text not null default '' check (char_length(about_text) <= 5000),
  shipping_policy_text       text not null default '' check (char_length(shipping_policy_text) <= 2000),
  whatsapp_order_greeting    text not null default '' check (char_length(whatsapp_order_greeting) <= 300),
  whatsapp_order_closing     text not null default '' check (char_length(whatsapp_order_closing) <= 300),
  reservation_hours          integer not null default 48 check (reservation_hours between 1 and 720),
  updated_at                 timestamptz not null default now(),
  updated_by                 uuid references public.profiles (id) on delete set null
);
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function private.set_updated_at();
