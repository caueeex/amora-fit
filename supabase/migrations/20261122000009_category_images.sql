-- =============================================================================
-- Amora Fit — 0009: imagem por categoria (círculos da home).
-- O arquivo fica no bucket público "store-assets"; o caminho é salvo aqui.
-- A coluna herda os privilégios/RLS existentes de categories
-- (leitura pública das ativas; escrita só admin).
-- =============================================================================
alter table public.categories
  add column if not exists image_path text
  check (image_path is null or char_length(image_path) between 1 and 500);
