-- =============================================================================
-- Amora Fit — 0004: recursos da plataforma Supabase (Storage, Realtime, pg_cron)
-- Blocos protegidos por verificações para também rodarem em ambiente de teste.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Storage: imagens de produtos e da loja (leitura pública; escrita só admin)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
      ('store-assets',   'store-assets',   true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute $p$
      create policy "amora: admin envia imagens" on storage.objects
        for insert to authenticated
        with check (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
    $p$;
    execute $p$
      create policy "amora: admin atualiza imagens" on storage.objects
        for update to authenticated
        using (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
        with check (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
    $p$;
    execute $p$
      create policy "amora: admin remove imagens" on storage.objects
        for delete to authenticated
        using (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
    $p$;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Realtime: tabelas que emitem mudanças (RLS é respeitado na entrega).
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.orders,
      public.order_status_history,
      public.inventory;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- pg_cron: expira reservas vencidas a cada 15 minutos.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'amora-expire-stale-orders',
      '*/15 * * * *',
      'select private.expire_stale_orders();'
    );
  end if;
end;
$$;
