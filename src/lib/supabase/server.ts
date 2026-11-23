import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Cliente com a sessão do usuário (lê os cookies da requisição).
 * Use em Server Components (dentro de <Suspense>), Server Actions e Route Handlers.
 * As consultas rodam com as permissões do usuário logado: RLS sempre se aplica.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component, onde cookies são somente leitura.
          // O proxy (src/proxy.ts) já cuida de renovar a sessão.
        }
      },
    },
  });
}

/**
 * Cliente anônimo, sem cookies: para dados públicos do catálogo.
 * Pode ser usado dentro de funções com "use cache", pois não lê a requisição.
 */
export function getSupabasePublicClient(): SupabaseClient {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
