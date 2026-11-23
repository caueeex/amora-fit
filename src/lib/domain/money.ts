/**
 * Dinheiro é sempre representado como número inteiro de centavos.
 * Nunca some/multiplique valores em reais com ponto flutuante.
 */
export type Cents = number;

export function assertCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Valor monetário inválido (esperado inteiro em centavos): ${value}`);
  }
  return value;
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((acc, v) => acc + assertCents(v), 0);
}

export function multiplyCents(unit: Cents, quantity: number): Cents {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error(`Quantidade inválida: ${quantity}`);
  }
  return assertCents(unit) * quantity;
}

/** 8990 -> "R$ 89,90". Formatação manual para resultado idêntico no servidor e no navegador. */
export function formatBRL(cents: Cents): string {
  assertCents(cents);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100);
  const centavos = String(abs % 100).padStart(2, "0");
  const reaisStr = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}R$ ${reaisStr},${centavos}`;
}

/**
 * Converte texto digitado no admin ("89,90", "1.299,00", "89.9", "R$ 89") em centavos,
 * sem passar por float. Retorna null se inválido.
 */
export function parseBRLToCents(input: string): Cents | null {
  let s = input.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (s === "" || !/^\d[\d.,]*$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);

  let intPart = s;
  let decPart = "";
  if (sepIndex !== -1 && s.length - sepIndex - 1 <= 2) {
    // O último separador com até 2 dígitos depois é o decimal.
    intPart = s.slice(0, sepIndex);
    decPart = s.slice(sepIndex + 1);
  }
  intPart = intPart.replace(/[.,]/g, "");
  s = intPart || "0";
  if (!/^\d+$/.test(s) || !/^\d{0,2}$/.test(decPart)) return null;

  const cents = Number(s) * 100 + Number(decPart.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
