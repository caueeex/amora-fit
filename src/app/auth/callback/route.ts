import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Destino dos links enviados por e-mail (confirmação de cadastro e recuperação de senha).
 * Suporta os dois formatos do Supabase:
 *   - PKCE: ?code=...                      (modelos de e-mail padrão)
 *   - OTP:  ?token_hash=...&type=recovery  (modelos personalizados)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(url.searchParams.get("next"));

  const supabase = await getSupabaseServerClient();
  let errorCode: string | undefined;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorCode = error?.code ?? (error ? "unknown" : undefined);
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    errorCode = error?.code ?? (error ? "unknown" : undefined);
  } else {
    errorCode = url.searchParams.get("error_code") ?? "invalid_link";
  }

  const target = request.nextUrl.clone();
  target.search = "";
  if (errorCode) {
    target.pathname = "/entrar";
    target.searchParams.set("erro", errorCode);
  } else {
    const dest = new URL(next, request.nextUrl.origin);
    target.pathname = dest.pathname;
    dest.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  }
  return NextResponse.redirect(target);
}
