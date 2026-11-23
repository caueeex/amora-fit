-- =============================================================================
-- Amora Fit — 0013: novos tipos de seção na página inicial + vídeos.
--   image_tiles  → cards com imagem (ex.: "Compre por tamanho")
--   link_cards   → atalhos em texto (ex.: "Compre do seu jeito" / faixas de preço)
--   videos       → vídeos verticais com produto ligado ("Veja no corpo")
-- Vídeos ficam no bucket público "store-videos" (até 50 MB, MP4/WebM);
-- só admin envia/remove.
-- =============================================================================
alter table public.home_sections drop constraint if exists home_sections_type_check;
alter table public.home_sections add constraint home_sections_type_check
  check (type in ('banners', 'hero', 'categories', 'products', 'double_banner', 'text', 'image_tiles', 'link_cards', 'videos'));

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise warning 'Schema storage não encontrado: bucket de vídeos não criado.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('store-videos', 'store-videos', true, 52428800, array['video/mp4', 'video/webm'])
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'amora: admin envia vídeos') then
    execute $p$
      create policy "amora: admin envia vídeos" on storage.objects
        for insert to authenticated
        with check (bucket_id = 'store-videos' and (select private.is_admin()))
    $p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'amora: admin atualiza vídeos') then
    execute $p$
      create policy "amora: admin atualiza vídeos" on storage.objects
        for update to authenticated
        using (bucket_id = 'store-videos' and (select private.is_admin()))
        with check (bucket_id = 'store-videos' and (select private.is_admin()))
    $p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'amora: admin remove vídeos') then
    execute $p$
      create policy "amora: admin remove vídeos" on storage.objects
        for delete to authenticated
        using (bucket_id = 'store-videos' and (select private.is_admin()))
    $p$;
  end if;
end;
$$;
