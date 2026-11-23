import { z } from "zod";
import { SIZE_ORDER } from "@/lib/catalog/types";
import { parseBRLToCents } from "@/lib/domain/money";

const money = (label: string) =>
  z.string().transform((v, ctx) => {
    const cents = parseBRLToCents(v);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: `${label}: informe um valor válido (ex.: 89,90).` });
      return z.NEVER;
    }
    if (cents > 10_000_000) {
      ctx.addIssue({ code: "custom", message: `${label}: valor alto demais.` });
      return z.NEVER;
    }
    return cents;
  });

export const variantInputSchema = z.object({
  id: z.uuid().optional(),
  color_name: z.string().trim().min(1, { error: "Informe o nome da cor." }).max(40),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Cor inválida." }),
  size: z.enum(SIZE_ORDER),
  is_active: z.boolean(),
  initial_stock: z.number().int().min(0).max(100000).optional(),
});

export const productFormSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2, { error: "Informe o nome do produto." }).max(120),
    slug: z
      .string()
      .trim()
      .min(2, { error: "Informe o endereço (slug)." })
      .max(80)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "Use só letras minúsculas, números e hífens." }),
    category_id: z.uuid({ error: "Escolha a categoria." }),
    description: z.string().trim().max(5000, { error: "Descrição muito longa (máx. 5000)." }),
    price: money("Preço"),
    promo_price: z.string().optional(),
    status: z.enum(["draft", "active", "archived"]),
    is_new: z.boolean(),
    is_featured: z.boolean(),
    variants: z.array(variantInputSchema).max(200),
  })
  .transform((d, ctx) => {
    let promo: number | null = null;
    if (d.promo_price && d.promo_price.trim()) {
      promo = parseBRLToCents(d.promo_price);
      if (promo === null || promo <= 0) {
        ctx.addIssue({ code: "custom", path: ["promo_price"], message: "Preço promocional inválido." });
        return z.NEVER;
      }
      if (promo >= d.price) {
        ctx.addIssue({ code: "custom", path: ["promo_price"], message: "O preço promocional precisa ser menor que o preço normal." });
        return z.NEVER;
      }
    }
    const seen = new Set<string>();
    for (const v of d.variants) {
      const key = `${v.color_name.toLowerCase()}|${v.size}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: `Variação repetida: ${v.color_name} / ${v.size}.` });
        return z.NEVER;
      }
      seen.add(key);
    }
    if (d.status === "active" && !d.variants.some((v) => v.is_active)) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Para publicar, cadastre ao menos uma cor e um tamanho." });
      return z.NEVER;
    }
    return {
      product: {
        id: d.id,
        name: d.name,
        slug: d.slug,
        category_id: d.category_id,
        description: d.description,
        price_cents: d.price,
        promo_price_cents: promo,
        status: d.status,
        is_new: d.is_new,
        is_featured: d.is_featured,
      },
      variants: d.variants,
    };
  });

export type ProductFormInput = z.input<typeof productFormSchema>;
