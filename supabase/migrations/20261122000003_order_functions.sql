-- =============================================================================
-- Amora Fit — 0003: regras de negócio transacionais
--
-- Estoque:
--   criar pedido      -> reserved += qtd                 (reserve)
--   PAID              -> on_hand -= qtd, reserved -= qtd (sale)
--   cancelar antes    -> reserved -= qtd                 (release)
--   cancelar depois   -> on_hand += qtd                  (return)
--   expiração (48h)   -> cancelamento automático com release
--
-- Erros são lançados como 'AMORA:<CODIGO>' (DETAIL opcional em JSON) para o
-- servidor Next.js traduzir em mensagens amigáveis.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Transições de status permitidas
-- -----------------------------------------------------------------------------
create or replace function private.order_transition_allowed(
  p_from public.order_status,
  p_to public.order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'PENDING'          then p_to in ('AWAITING_PAYMENT', 'PAID', 'CANCELLED')
    when 'AWAITING_PAYMENT' then p_to in ('PAID', 'CANCELLED')
    when 'PAID'             then p_to in ('PROCESSING', 'CANCELLED')
    when 'PROCESSING'       then p_to in ('INVOICED', 'CANCELLED')
    when 'INVOICED'         then p_to in ('SHIPPED')
    when 'SHIPPED'          then p_to in ('COMPLETED')
    else false -- COMPLETED e CANCELLED são finais
  end;
$$;

-- -----------------------------------------------------------------------------
-- Registro de movimentação de estoque
-- -----------------------------------------------------------------------------
create or replace function private.log_inventory_movement(
  p_inv public.inventory,
  p_type public.inventory_movement_type,
  p_delta_on_hand integer,
  p_delta_reserved integer,
  p_order_id uuid,
  p_actor uuid,
  p_note text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.inventory_movements
    (variant_id, type, delta_on_hand, delta_reserved, on_hand_after, reserved_after, order_id, actor_id, note)
  values
    (p_inv.variant_id, p_type, p_delta_on_hand, p_delta_reserved, p_inv.on_hand, p_inv.reserved, p_order_id, p_actor, p_note);
$$;

-- -----------------------------------------------------------------------------
-- Núcleo da mudança de status (sem checagem de permissão: quem chama decide).
-- -----------------------------------------------------------------------------
create or replace function private.apply_status_change(
  p_order_id uuid,
  p_to public.order_status,
  p_actor uuid,
  p_note text default null,
  p_payment_method public.payment_method default null,
  p_shipment jsonb default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_from public.order_status;
  v_item record;
  v_inv public.inventory;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'AMORA:ORDER_NOT_FOUND';
  end if;
  v_from := v_order.status;

  if not private.order_transition_allowed(v_from, p_to) then
    raise exception 'AMORA:INVALID_TRANSITION'
      using detail = jsonb_build_object('from', v_from, 'to', p_to)::text;
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'AMORA:NOTE_TOO_LONG';
  end if;

  -- Efeitos no estoque (linhas travadas sempre em ordem de variant_id).
  for v_item in
    select oi.variant_id, sum(oi.quantity)::integer as qty
    from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is not null
    group by oi.variant_id
    order by oi.variant_id
  loop
    if p_to = 'PAID' then
      update public.inventory
         set on_hand = on_hand - v_item.qty, reserved = reserved - v_item.qty
       where variant_id = v_item.variant_id
      returning * into v_inv;
      if found then
        perform private.log_inventory_movement(v_inv, 'sale', -v_item.qty, -v_item.qty, p_order_id, p_actor, null);
      end if;

    elsif p_to = 'CANCELLED' and v_from in ('PENDING', 'AWAITING_PAYMENT') then
      update public.inventory
         set reserved = reserved - v_item.qty
       where variant_id = v_item.variant_id
      returning * into v_inv;
      if found then
        perform private.log_inventory_movement(v_inv, 'release', 0, -v_item.qty, p_order_id, p_actor, p_note);
      end if;

    elsif p_to = 'CANCELLED' and v_from in ('PAID', 'PROCESSING') then
      update public.inventory
         set on_hand = on_hand + v_item.qty
       where variant_id = v_item.variant_id
      returning * into v_inv;
      if found then
        perform private.log_inventory_movement(v_inv, 'return', v_item.qty, 0, p_order_id, p_actor, p_note);
      end if;
    end if;
  end loop;

  -- Pagamento confirmado manualmente.
  if p_to = 'PAID' then
    insert into public.payments (order_id, method, status, amount_cents, confirmed_by, confirmed_at, note)
    values (p_order_id, coalesce(p_payment_method, 'other'), 'confirmed', v_order.total_cents, p_actor, now(), p_note);
  end if;

  -- Envio.
  if p_to = 'SHIPPED' then
    insert into public.shipments (order_id, carrier, tracking_code, tracking_url, shipped_at, note, created_by)
    values (
      p_order_id,
      nullif(trim(p_shipment ->> 'carrier'), ''),
      nullif(trim(p_shipment ->> 'tracking_code'), ''),
      nullif(trim(p_shipment ->> 'tracking_url'), ''),
      now(),
      nullif(trim(p_shipment ->> 'note'), ''),
      p_actor
    )
    on conflict (order_id) do update set
      carrier       = coalesce(excluded.carrier, public.shipments.carrier),
      tracking_code = coalesce(excluded.tracking_code, public.shipments.tracking_code),
      tracking_url  = coalesce(excluded.tracking_url, public.shipments.tracking_url),
      note          = coalesce(excluded.note, public.shipments.note),
      shipped_at    = coalesce(public.shipments.shipped_at, excluded.shipped_at);
  end if;

  if p_to = 'COMPLETED' then
    update public.shipments set delivered_at = coalesce(delivered_at, now()) where order_id = p_order_id;
  end if;

  update public.orders
     set status = p_to,
         reservation_expires_at = case when p_to in ('PENDING', 'AWAITING_PAYMENT')
                                       then reservation_expires_at end
   where id = p_order_id
  returning * into v_order;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, v_from, p_to, p_actor, p_note);

  return v_order;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: criar pedido (cliente logado)
-- p_items: [{"variant_id": "<uuid>", "quantity": 2}, ...]
-- Preços, disponibilidade e totais são calculados AQUI, a partir do banco.
-- Idempotente por (cliente, p_idempotency_key).
-- -----------------------------------------------------------------------------
create or replace function public.create_order(
  p_items jsonb,
  p_address_id uuid,
  p_idempotency_key uuid,
  p_customer_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing public.orders;
  v_profile public.profiles;
  v_address public.addresses;
  v_hours integer;
  v_ids uuid[];
  v_qtys integer[];
  v_line record;
  v_problems jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_order_id uuid;
  v_order_number bigint;
  v_inv public.inventory;
  v_note text := nullif(trim(p_customer_note), '');
begin
  if v_uid is null then
    raise exception 'AMORA:NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if p_idempotency_key is null then
    raise exception 'AMORA:INVALID_INPUT' using detail = 'idempotency_key';
  end if;

  -- Serializa requisições repetidas com a mesma chave (duplo clique, retry de rede).
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_idempotency_key::text, 0));

  select * into v_existing
    from public.orders
   where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', v_existing.id, 'order_number', v_existing.order_number, 'created', false);
  end if;

  -- Validação estrutural dos itens.
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'AMORA:INVALID_ITEMS';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) <> 'object'
       or coalesce(e ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(e ->> 'quantity', '') !~ '^[0-9]{1,3}$'
  ) then
    raise exception 'AMORA:INVALID_ITEMS';
  end if;

  select array_agg(s.variant_id order by s.variant_id), array_agg(s.qty order by s.variant_id)
    into v_ids, v_qtys
    from (
      select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::integer)::integer as qty
      from jsonb_array_elements(p_items) e
      group by 1
    ) s;

  if exists (select 1 from unnest(v_qtys) q where q < 1 or q > 99) then
    raise exception 'AMORA:INVALID_QUANTITY';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'AMORA:NOTE_TOO_LONG';
  end if;

  -- Endereço precisa pertencer ao cliente.
  select * into v_address from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then
    raise exception 'AMORA:ADDRESS_NOT_FOUND';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'AMORA:PROFILE_NOT_FOUND';
  end if;

  -- Trava o estoque das variações envolvidas, em ordem (evita deadlock).
  perform 1 from public.inventory i
   where i.variant_id = any (v_ids)
   order by i.variant_id
   for update;

  -- 1ª passada: valida tudo e acumula problemas (para o cliente ver todos de uma vez).
  for v_line in
    select r.variant_id as requested_id, r.qty,
           v.id as variant_id, v.is_active as variant_active,
           p.status as product_status,
           coalesce(p.promo_price_cents, p.price_cents) as unit_price,
           coalesce(i.available, 0) as available
      from unnest(v_ids, v_qtys) as r(variant_id, qty)
      left join public.product_variants v on v.id = r.variant_id
      left join public.products p on p.id = v.product_id
      left join public.inventory i on i.variant_id = v.id
     order by r.variant_id
  loop
    if v_line.variant_id is null or not v_line.variant_active or v_line.product_status <> 'active' then
      v_problems := v_problems || jsonb_build_object('variant_id', v_line.requested_id, 'reason', 'unavailable', 'available', 0);
    elsif v_line.available < v_line.qty then
      v_problems := v_problems || jsonb_build_object('variant_id', v_line.requested_id, 'reason', 'insufficient_stock', 'available', greatest(v_line.available, 0));
    else
      v_subtotal := v_subtotal + v_line.unit_price * v_line.qty;
    end if;
  end loop;

  if jsonb_array_length(v_problems) > 0 then
    raise exception 'AMORA:STOCK_PROBLEM' using detail = v_problems::text;
  end if;

  select coalesce((select reservation_hours from public.store_settings where id = 1), 48) into v_hours;

  insert into public.orders (
    customer_id, status, customer_name, customer_email, customer_phone, shipping_address,
    subtotal_cents, shipping_cents, discount_cents, total_cents,
    customer_note, idempotency_key, reservation_expires_at
  ) values (
    v_uid, 'PENDING',
    coalesce(nullif(trim(v_profile.full_name), ''), v_address.recipient_name),
    v_profile.email,
    coalesce(v_profile.phone, v_address.phone),
    jsonb_build_object(
      'label', v_address.label, 'recipient_name', v_address.recipient_name, 'phone', v_address.phone,
      'cep', v_address.cep, 'street', v_address.street, 'number', v_address.number,
      'complement', v_address.complement, 'district', v_address.district,
      'city', v_address.city, 'state', v_address.state
    ),
    v_subtotal, 0, 0, v_subtotal, -- frete: a combinar pelo WhatsApp (v1)
    v_note, p_idempotency_key, now() + make_interval(hours => v_hours)
  )
  returning id, order_number into v_order_id, v_order_number;

  -- 2ª passada: grava itens (snapshot de preço/descrição) e reserva estoque.
  for v_line in
    select r.qty, v.id as variant_id, v.color_name, v.size, v.sku,
           p.id as product_id, p.name as product_name, p.slug as product_slug,
           coalesce(p.promo_price_cents, p.price_cents) as unit_price
      from unnest(v_ids, v_qtys) as r(variant_id, qty)
      join public.product_variants v on v.id = r.variant_id
      join public.products p on p.id = v.product_id
     order by v.id
  loop
    insert into public.order_items (
      order_id, product_id, variant_id, product_name, product_slug, color_name, size, sku,
      unit_price_cents, quantity, line_total_cents
    ) values (
      v_order_id, v_line.product_id, v_line.variant_id, v_line.product_name, v_line.product_slug,
      v_line.color_name, v_line.size, v_line.sku,
      v_line.unit_price, v_line.qty, v_line.unit_price * v_line.qty
    );

    update public.inventory set reserved = reserved + v_line.qty
     where variant_id = v_line.variant_id
    returning * into v_inv;
    perform private.log_inventory_movement(v_inv, 'reserve', 0, v_line.qty, v_order_id, v_uid, null);
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (v_order_id, null, 'PENDING', v_uid, 'Pedido criado na loja virtual.');

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'created', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: admin muda status (inclui confirmar pagamento, faturar, enviar...)
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_to public.order_status,
  p_note text default null,
  p_payment_method public.payment_method default null,
  p_shipment jsonb default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'AMORA:FORBIDDEN' using errcode = '42501';
  end if;
  return private.apply_status_change(
    p_order_id, p_to, (select auth.uid()), nullif(trim(p_note), ''), p_payment_method, p_shipment
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: admin registra/atualiza dados de envio sem mudar status
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_shipment(
  p_order_id uuid,
  p_carrier text default null,
  p_tracking_code text default null,
  p_tracking_url text default null,
  p_note text default null
)
returns public.shipments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
  v_row public.shipments;
begin
  if not private.is_admin() then
    raise exception 'AMORA:FORBIDDEN' using errcode = '42501';
  end if;

  select status into v_status from public.orders where id = p_order_id;
  if not found then
    raise exception 'AMORA:ORDER_NOT_FOUND';
  end if;
  if v_status in ('CANCELLED') then
    raise exception 'AMORA:ORDER_CANCELLED';
  end if;

  insert into public.shipments (order_id, carrier, tracking_code, tracking_url, note, created_by)
  values (p_order_id, nullif(trim(p_carrier), ''), nullif(trim(p_tracking_code), ''),
          nullif(trim(p_tracking_url), ''), nullif(trim(p_note), ''), (select auth.uid()))
  on conflict (order_id) do update set
    carrier = excluded.carrier,
    tracking_code = excluded.tracking_code,
    tracking_url = excluded.tracking_url,
    note = excluded.note
  returning * into v_row;

  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: admin ajusta estoque (entrada ou ajuste), com histórico
-- -----------------------------------------------------------------------------
create or replace function public.admin_adjust_inventory(
  p_variant_id uuid,
  p_delta integer,
  p_type public.inventory_movement_type default 'adjustment',
  p_note text default null
)
returns public.inventory
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.inventory;
begin
  if not private.is_admin() then
    raise exception 'AMORA:FORBIDDEN' using errcode = '42501';
  end if;
  if p_type not in ('restock', 'adjustment') then
    raise exception 'AMORA:INVALID_MOVEMENT_TYPE';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'AMORA:INVALID_QUANTITY';
  end if;
  if p_type = 'restock' and p_delta < 0 then
    raise exception 'AMORA:INVALID_QUANTITY';
  end if;

  begin
    update public.inventory set on_hand = on_hand + p_delta
     where variant_id = p_variant_id
    returning * into v_inv;
  exception when check_violation then
    raise exception 'AMORA:STOCK_BELOW_RESERVED';
  end;
  if not found then
    raise exception 'AMORA:VARIANT_NOT_FOUND';
  end if;

  perform private.log_inventory_movement(v_inv, p_type, p_delta, 0, null, (select auth.uid()), nullif(trim(p_note), ''));
  return v_inv;
end;
$$;

-- -----------------------------------------------------------------------------
-- Expiração automática de reservas (executada pelo pg_cron, migration 0004)
-- -----------------------------------------------------------------------------
create or replace function private.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.orders
     where status in ('PENDING', 'AWAITING_PAYMENT')
       and reservation_expires_at is not null
       and reservation_expires_at < now()
     order by created_at
     for update skip locked
  loop
    perform private.apply_status_change(
      v_id, 'CANCELLED', null,
      'Cancelado automaticamente: prazo de reserva expirou sem confirmação do pagamento.'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permissões de execução
-- -----------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

revoke all on function public.create_order(jsonb, uuid, uuid, text) from public, anon;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text, public.payment_method, jsonb) from public, anon;
revoke all on function public.admin_upsert_shipment(uuid, text, text, text, text) from public, anon;
revoke all on function public.admin_adjust_inventory(uuid, integer, public.inventory_movement_type, text) from public, anon;

grant execute on function public.create_order(jsonb, uuid, uuid, text) to authenticated;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text, public.payment_method, jsonb) to authenticated;
grant execute on function public.admin_upsert_shipment(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_adjust_inventory(uuid, integer, public.inventory_movement_type, text) to authenticated;
