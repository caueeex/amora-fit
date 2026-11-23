-- =============================================================================
-- Amora Fit — 0010: indicadores do painel administrativo.
-- Agregações feitas no banco (rápidas e consistentes). Só admin executa.
-- "Faturamento" = pedidos com pagamento confirmado (PAID em diante).
-- Datas agrupadas no fuso de São Paulo.
-- =============================================================================
create or replace function public.admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_paid constant public.order_status[] := array['PAID', 'PROCESSING', 'INVOICED', 'SHIPPED', 'COMPLETED']::public.order_status[];
begin
  if not private.is_admin() then
    raise exception 'AMORA:FORBIDDEN' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '400 days' then
    raise exception 'AMORA:INVALID_PERIOD';
  end if;

  with period as (
    select * from public.orders where created_at >= p_from and created_at < p_to
  ),
  paid as (
    select * from period where status = any (v_paid)
  )
  select jsonb_build_object(
    'orders_count',  (select count(*) from period),
    'paid_count',    (select count(*) from paid),
    'cancelled_count', (select count(*) from period where status = 'CANCELLED'),
    'revenue_cents', (select coalesce(sum(total_cents), 0) from paid),
    'items_sold',    (select coalesce(sum(oi.quantity), 0) from public.order_items oi join paid on paid.id = oi.order_id),
    -- Situação ATUAL da operação (independe do período)
    'status_now', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (select status, count(*) as n from public.orders group by status) s
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'revenue_cents', coalesce(x.revenue, 0), 'orders', coalesce(x.n, 0)) order by d.day), '[]'::jsonb)
        from generate_series(
               date_trunc('day', p_from at time zone 'America/Sao_Paulo'),
               date_trunc('day', (p_to - interval '1 second') at time zone 'America/Sao_Paulo'),
               interval '1 day'
             ) as d(day)
        left join (
          select date_trunc('day', created_at at time zone 'America/Sao_Paulo') as day,
                 sum(total_cents) filter (where status = any (v_paid)) as revenue,
                 count(*) as n
            from period
           group by 1
        ) x on x.day = d.day
    ),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.quantity desc, t.revenue_cents desc), '[]'::jsonb)
        from (
          select oi.product_name as name, oi.product_slug as slug,
                 sum(oi.quantity)::int as quantity, sum(oi.line_total_cents)::bigint as revenue_cents
            from public.order_items oi join paid on paid.id = oi.order_id
           group by oi.product_name, oi.product_slug
           order by 3 desc, 4 desc
           limit 5
        ) t
    ),
    'low_stock_count', (
      select count(*)
        from public.inventory i
        join public.product_variants v on v.id = i.variant_id
        join public.products p on p.id = v.product_id
       where p.status = 'active' and v.is_active and i.available <= i.low_stock_threshold
    ),
    'low_stock', (
      select coalesce(jsonb_agg(l), '[]'::jsonb)
        from (
          select p.id as product_id, p.name as product_name, v.color_name, v.size,
                 i.available, i.low_stock_threshold
            from public.inventory i
            join public.product_variants v on v.id = i.variant_id
            join public.products p on p.id = v.product_id
           where p.status = 'active' and v.is_active and i.available <= i.low_stock_threshold
           order by i.available, p.name, v.color_name, v.size
           limit 8
        ) l
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated;

-- Foto ligada a uma cor (a galeria troca a foto ao escolher a cor). Opcional.
alter table public.product_images
  add column if not exists color_name text check (color_name is null or char_length(color_name) between 1 and 40);
