/**
 * Valida o destino pós-login vindo da URL (?next=...).
 * Só aceita caminhos internos, para não virar "open redirect"
 * (ex.: ?next=https://site-malicioso.com ou ?next=//site-malicioso.com).
 */
export function safeNextPath(next: unknown, fallback = "/minha-conta"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
