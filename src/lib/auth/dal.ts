import "server-only";

import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Data Access Layer de autenticação.
 * Lê a sessão (cookies) → só pode ser chamado em Server Actions, Route Handlers
 * ou em Server Components DENTRO de <Suspense> (exigência do Cache Components).
 * `cache()` evita repetir a consulta na mesma requisição.
 */

export type UserRole = "customer" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  cpf: string | null;
  role: UserRole;
};

/** Usuário autenticado (JWT validado por getClaims) ou null. */
export const getAuthUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  // A validação do JWT compara a expiração com o relógio (Date.now): isso só pode
  // acontecer na hora da requisição, nunca na pré-renderização.
  await connection();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { id: sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
});

/** Perfil do usuário logado (lido com RLS: só o próprio). */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, cpf, role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar perfil: ${error.message}`);
  return (data as Profile | null) ?? null;
});

/** Exige login; senão manda para /entrar com retorno para `nextPath`. */
export async function requireProfile(nextPath: string): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  return profile;
}

/**
 * Exige administrador. Quem não é admin recebe 404 (não revelamos que a área existe).
 * Lembrete: isto protege a INTERFACE; os dados são protegidos por RLS no banco.
 */
export async function requireAdmin(nextPath = "/admin"): Promise<Profile> {
  const profile = await requireProfile(nextPath);
  if (profile.role !== "admin") notFound();
  return profile;
}
