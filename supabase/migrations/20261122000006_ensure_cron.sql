-- =============================================================================
-- Amora Fit — 0006: garante o pg_cron e o job de expiração de reservas.
-- A 0004 pulava esse passo em silêncio quando o pg_cron não aparecia como
-- disponível. Aqui o passo é idempotente e, se não for possível, emite um
-- WARNING visível em vez de ignorar.
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    -- Forma recomendada pelo Supabase.
    create extension if not exists pg_cron with schema pg_catalog;
    grant usage on schema cron to postgres;
    -- cron.schedule com nome atualiza o job se ele já existir.
    perform cron.schedule(
      'amora-expire-stale-orders',
      '*/15 * * * *',
      'select private.expire_stale_orders();'
    );
  else
    raise warning 'pg_cron indisponível: ative em Database > Extensions e rode esta migration de novo. Sem ele, reservas vencidas não expiram sozinhas.';
  end if;
end;
$$;
