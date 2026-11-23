-- =============================================================================
-- Amora Fit — 0011: cadastro de produtos pelo painel.
-- admin_save_product grava produto + variações + estoque inicial numa ÚNICA
-- transação (ou tudo, ou nada). Variações retiradas são DESATIVADAS, nunca
-- apagadas, para preservar histórico de pedidos e de estoque.
-- =============================================================================
create or replace function public.admin_save_product(p_product jsonb, p_variants jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v jsonb;
  v_variant_id uuid;
  v_pos integer := 0;
  v_keep uuid[] := '{}';
  v_initial integer;
  v_inv public.inventory;
  v_constraint text;
begin
  if not private.is_admin() then
    raise exception 'AMORA:FORBIDDEN' using errcode = '42501';
  end if;
  if p_product is null or jsonb_typeof(p_product) <> 'object' then
    raise exception 'AMORA:INVALID_PRODUCT';
  end if;
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 200 then
    raise exception 'AMORA:INVALID_VARIANTS';
  end if;

  begin
    v_id := nullif(p_product ->> 'id', '')::uuid;

    if v_id is null then
      insert into public.products (category_id, slug, name, description, price_cents, promo_price_cents, status, is_new, is_featured)
      values (
        nullif(p_product ->> 'category_id', '')::uuid,
        p_product ->> 'slug',
        p_product ->> 'name',
        coalesce(p_product ->> 'description', ''),
        (p_product ->> 'price_cents')::integer,
        nullif(p_product ->> 'promo_price_cents', '')::integer,
        coalesce(nullif(p_product ->> 'status', ''), 'draft')::public.product_status,
        coalesce((p_product ->> 'is_new')::boolean, false),
        coalesce((p_product ->> 'is_featured')::boolean, false)
      )
      returning id into v_id;
    else
      update public.products set
        category_id       = nullif(p_product ->> 'category_id', '')::uuid,
        slug              = p_product ->> 'slug',
        name              = p_product ->> 'name',
        description       = coalesce(p_product ->> 'description', ''),
        price_cents       = (p_product ->> 'price_cents')::integer,
        promo_price_cents = nullif(p_product ->> 'promo_price_cents', '')::integer,
        status            = coalesce(nullif(p_product ->> 'status', ''), 'draft')::public.product_status,
        is_new            = coalesce((p_product ->> 'is_new')::boolean, false),
        is_featured       = coalesce((p_product ->> 'is_featured')::boolean, false)
      where id = v_id;
      if not found then
        raise exception 'AMORA:PRODUCT_NOT_FOUND';
      end if;
    end if;

    for v in select * from jsonb_array_elements(p_variants) loop
      v_pos := v_pos + 1;
      v_variant_id := nullif(v ->> 'id', '')::uuid;

      if v_variant_id is null then
        insert into public.product_variants (product_id, color_name, color_hex, size, sku, is_active, position)
        values (
          v_id, v ->> 'color_name', coalesce(v ->> 'color_hex', '#000000'), v ->> 'size',
          nullif(v ->> 'sku', ''), coalesce((v ->> 'is_active')::boolean, true), v_pos
        )
        on conflict (product_id, color_name, size) do update set
          color_hex = excluded.color_hex, is_active = excluded.is_active, position = excluded.position
        returning id into v_variant_id;

        v_initial := coalesce((v ->> 'initial_stock')::integer, 0);
        if v_initial < 0 or v_initial > 100000 then
          raise exception 'AMORA:INVALID_QUANTITY';
        end if;
        if v_initial > 0 then
          update public.inventory set on_hand = on_hand + v_initial where variant_id = v_variant_id returning * into v_inv;
          perform private.log_inventory_movement(v_inv, 'restock', v_initial, 0, null, v_uid, 'Estoque inicial (cadastro do produto)');
        end if;
      else
        update public.product_variants set
          color_name = v ->> 'color_name',
          color_hex  = coalesce(v ->> 'color_hex', color_hex),
          size       = v ->> 'size',
          sku        = nullif(v ->> 'sku', ''),
          is_active  = coalesce((v ->> 'is_active')::boolean, true),
          position   = v_pos
        where id = v_variant_id and product_id = v_id;
        if not found then
          raise exception 'AMORA:VARIANT_NOT_FOUND';
        end if;
      end if;

      v_keep := v_keep || v_variant_id;
    end loop;

    -- Variações que saíram da lista: desativadas (histórico preservado).
    update public.product_variants set is_active = false
     where product_id = v_id and not (id = any (v_keep)) and is_active;

  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'products_slug_key' then
        raise exception 'AMORA:SLUG_TAKEN';
      elsif v_constraint = 'product_variants_sku_key' then
        raise exception 'AMORA:SKU_TAKEN';
      else
        raise exception 'AMORA:DUPLICATE_VARIANT';
      end if;
    when check_violation then
      get stacked diagnostics v_constraint = constraint_name;
      raise exception 'AMORA:INVALID_PRODUCT' using detail = v_constraint;
    when invalid_text_representation or numeric_value_out_of_range or not_null_violation then
      raise exception 'AMORA:INVALID_PRODUCT';
  end;

  return v_id;
end;
$$;

revoke all on function public.admin_save_product(jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb, jsonb) to authenticated;
