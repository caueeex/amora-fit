export type ProductStatus = "draft" | "active" | "archived";

export const PRODUCT_STATUS_INFO: Record<ProductStatus, { label: string; hint: string; cls: string }> = {
  active: { label: "Publicado", hint: "Visível na loja", cls: "bg-emerald-100 text-emerald-900" },
  draft: { label: "Rascunho", hint: "Só aparece aqui no painel", cls: "bg-stone-200 text-stone-800" },
  archived: { label: "Arquivado", hint: "Fora da loja, histórico preservado", cls: "bg-amora-100/70 text-amora-900" },
};
