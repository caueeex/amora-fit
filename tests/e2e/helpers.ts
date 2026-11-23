import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Utilitários E2E. Criam e removem um usuário descartável usando a chave secreta
 * do projeto de DESENVOLVIMENTO (.env.local). Nunca aponte para produção.
 */
export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createTestUser(admin: SupabaseClient) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@amora-fit.test`;
  const password = `Amora${Date.now()}x1`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // não envia e-mail
    user_metadata: { full_name: "Cliente Teste E2E" },
  });
  if (error || !data.user) throw new Error(`Falha ao criar usuário de teste: ${error?.message}`);
  return { id: data.user.id, email, password };
}

/**
 * Remove o usuário de teste e tudo que ele criou, devolvendo ao estoque as
 * reservas dos pedidos dele (para não "prender" peças no ambiente de dev).
 */
export async function cleanupTestUser(admin: SupabaseClient, userId: string) {
  const { data: orders } = await admin.from("orders").select("id, status, items:order_items(variant_id, quantity)").eq("customer_id", userId);
  for (const o of orders ?? []) {
    if (o.status === "PENDING" || o.status === "AWAITING_PAYMENT") {
      for (const it of (o.items ?? []) as { variant_id: string | null; quantity: number }[]) {
        if (!it.variant_id) continue;
        const { data: inv } = await admin.from("inventory").select("reserved").eq("variant_id", it.variant_id).single();
        if (inv) await admin.from("inventory").update({ reserved: Math.max(0, inv.reserved - it.quantity) }).eq("variant_id", it.variant_id);
      }
    }
    await admin.from("inventory_movements").delete().eq("order_id", o.id);
    await admin.from("orders").delete().eq("id", o.id);
  }
  await admin.auth.admin.deleteUser(userId);
}
