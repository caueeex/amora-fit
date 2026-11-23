-- =============================================================================
-- Amora Fit — 0007: garante Realtime e Storage (idempotente).
-- A 0004 pulava esses passos em silêncio em alguns cenários. Aqui:
--   - cria a publicação supabase_realtime se ela não existir;
--   - adiciona só as tabelas que ainda não estão nela;
--   - cria/atualiza os buckets e as políticas de Storage;
--   - emite WARNING quando algo não puder ser feito.
-- =============================================================================

-- Realtime ---------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach v_table in array array['orders', 'order_status_history', 'inventory'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

-- Storage ----------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise warning 'Schema storage não encontrado: buckets não criados.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('store-assets',   'store-assets',   true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'amora: admin envia imagens') then
    execute $p$
      create policy "amora: admin envia imagens" on storage.objects
        for insert to authenticated
        with check (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
    $p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'amora: admin atualiza imagens') then
    execute $p$
      create policy "amora: admin atualiza imagens" on storage.objects
        for update to authenticated
        using (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
        with check (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
    $p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'amora: admin remove imagens') then
    execute $p$
      create policy "amora: admin remove imagens" on storage.objects
        for delete to authenticated
        using (bucket_id in ('product-images', 'store-assets') and (select private.is_admin()))
    $p$;
  end if;
end;
$$;
