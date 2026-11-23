/**
 * Traduz erros do Supabase Auth para mensagens em português.
 * Mensagens de login são propositalmente genéricas para não revelar
 * se um e-mail está ou não cadastrado.
 */
type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).",
  user_already_exists: "Não foi possível concluir o cadastro. Se você já tem conta, tente entrar ou recuperar a senha.",
  email_exists: "Não foi possível concluir o cadastro. Se você já tem conta, tente entrar ou recuperar a senha.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  email_address_invalid: "E-mail inválido.",
  over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  signup_disabled: "Cadastros estão temporariamente desativados.",
  session_not_found: "Seu link expirou. Solicite um novo.",
  session_expired: "Seu link expirou. Solicite um novo.",
  otp_expired: "Seu link expirou. Solicite um novo.",
  flow_state_expired: "Seu link expirou. Solicite um novo.",
  flow_state_not_found: "Abra o link no mesmo navegador em que você fez a solicitação, ou solicite um novo.",
  bad_code_verifier: "Abra o link no mesmo navegador em que você fez a solicitação, ou solicite um novo.",
  pkce_code_verifier_not_found: "Abra o link no mesmo navegador em que você fez a solicitação, ou solicite um novo.",
  invalid_link: "Link inválido ou incompleto. Solicite um novo.",
  access_denied: "Seu link expirou ou já foi usado. Solicite um novo.",
};

export const GENERIC_AUTH_ERROR = "Não foi possível concluir agora. Tente novamente em instantes.";

export function authErrorMessage(error: AuthErrorLike): string {
  if (!error) return GENERIC_AUTH_ERROR;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return MESSAGES.over_request_rate_limit;
  return GENERIC_AUTH_ERROR;
}
