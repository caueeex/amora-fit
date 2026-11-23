/**
 * Normaliza um telefone brasileiro para o formato exigido pelo wa.me
 * (somente dígitos, com DDI 55). Ex.: "(12) 99199-2477" -> "5512991992477".
 * Retorna null se não parecer um celular/fixo brasileiro válido.
 */
export function normalizeBrazilianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!digits.startsWith("55")) return null;

  const national = digits.slice(2);
  if (national.length !== 10 && national.length !== 11) return null;
  const ddd = Number(national.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  // Celular (11 dígitos) começa com 9.
  if (national.length === 11 && national[2] !== "9") return null;

  return digits;
}

/** "5512991992477" -> "(12) 99199-2477" para exibição. */
export function formatBrazilianPhone(normalized: string): string {
  const n = normalized.startsWith("55") ? normalized.slice(2) : normalized;
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return normalized;
}
