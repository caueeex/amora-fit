import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta (ignora RLS).
 * USO RESTRITO: apenas scripts/rotinas de servidor que realmente precisem.
 * A aplicação web NÃO usa este cliente nos fluxos normais; as operações
 * administrativas passam pela sessão do admin + RLS + funções SQL.
 * O import "server-only" impede que este arquivo entre no bundle do navegador.
 */
export function getSupabaseSecretClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("SUPABASE_SECRET_KEY não configurada (somente servidor).");
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
