-- =============================================================================
-- Amora Fit — 0008: "Mais vendidos" para a vitrine.
-- Pedidos são privados (RLS), então a vitrine não pode somar order_items.
-- Esta função expõe APENAS a ordem dos produtos ativos mais vendidos
-- (ids), sem quantidades, valores ou dados de clientes.
-- Conta só pedidos com pagamento confirmado (PAID em diante).
-- =============================================================================
create or replace function public.catalog_best_sellers(p_limit integer default 8)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select oi.product_id
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.products p on p.id = oi.product_id
   where o.status in ('PAID', 'PROCESSING', 'INVOICED', 'SHIPPED', 'COMPLETED')
     and p.status = 'active'
   group by oi.product_id
   order by sum(oi.quantity) desc, max(o.created_at) desc
   limit least(greatest(coalesce(p_limit, 8), 1), 24);
$$;

revoke all on function public.catalog_best_sellers(integer) from public;
grant execute on function public.catalog_best_sellers(integer) to anon, authenticated;
