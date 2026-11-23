"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

/**
 * Cliente Supabase para Client Components (Realtime, auth no navegador).
 * Usa apenas a chave pública; toda proteção de dados é feita por RLS.
 * Instância única por aba para não abrir várias conexões Realtime.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseKey);
  }
  return browserClient;
}
