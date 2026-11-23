/** Traduz erros 'AMORA:<CODIGO>' lançados pelas funções SQL. */
export type StockProblem = { variant_id: string; reason: "unavailable" | "insufficient_stock"; available: number };

export type DbError = { message?: string; details?: string | null; code?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Sua sessão expirou. Entre novamente para finalizar o pedido.",
  STOCK_PROBLEM: "Alguns itens mudaram de disponibilidade. Ajustamos seu carrinho — confira antes de continuar.",
  ADDRESS_NOT_FOUND: "Selecione um endereço de entrega válido.",
  INVALID_ITEMS: "Seu carrinho tem itens inválidos. Atualize a página e tente novamente.",
  INVALID_QUANTITY: "Quantidade inválida em algum item (máximo de 99 por peça).",
  NOTE_TOO_LONG: "A observação pode ter no máximo 500 caracteres.",
  PROFILE_NOT_FOUND: "Não encontramos seu cadastro. Entre novamente.",
  FORBIDDEN: "Você não tem permissão para esta ação.",
  INVALID_TRANSITION: "Essa mudança de status não é permitida para o pedido atual.",
  ORDER_NOT_FOUND: "Pedido não encontrado.",
  STOCK_BELOW_RESERVED: "O estoque não pode ficar abaixo da quantidade reservada em pedidos abertos.",
};

export function amoraCode(error: DbError): string | null {
  const m = error?.message?.match(/^AMORA:([A-Z_]+)/);
  return m ? m[1] : null;
}

export function orderErrorMessage(error: DbError): string {
  const code = amoraCode(error);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}

export function stockProblems(error: DbError): StockProblem[] {
  if (amoraCode(error) !== "STOCK_PROBLEM" || !error?.details) return [];
  try {
    const parsed = JSON.parse(error.details) as StockProblem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
