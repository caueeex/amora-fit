"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { SETTINGS_TAG } from "@/lib/catalog/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validators/settings";

export type SettingsResult = { ok: true } | { ok: false; error: string; field?: string };

export async function saveSettingsAction(raw: unknown): Promise<SettingsResult> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Dados inválidos.", field: String(issue?.path[0] ?? "") };
  }

  const supabase = await getSupabaseServerClient();
  const { data: current } = await supabase.from("store_settings").select("logo_path").eq("id", 1).single();

  const { error } = await supabase
    .from("store_settings")
    .update({ ...parsed.data, updated_by: admin.id })
    .eq("id", 1);
  if (error) return { ok: false, error: "Não foi possível salvar as configurações." };

  // Logo trocado/removido: apaga o arquivo antigo do Storage.
  if (current?.logo_path && current.logo_path !== parsed.data.logo_path) {
    await supabase.storage.from("store-assets").remove([current.logo_path]);
  }

  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true };
}
