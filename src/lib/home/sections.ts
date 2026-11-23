import { z } from "zod";

/**
 * Página inicial configurável: tipos de seção e suas configurações.
 * O mesmo schema valida o que o admin grava e o que a loja lê
 * (seção com config inválida é ignorada na loja, nunca quebra a página).
 */

/** Link permitido: caminho interno ("/produtos?..") ou https. Nada de javascript:, data:, //host. */
export const safeHref = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || (/^\/(?!\/)[^\s]*$/.test(v) && !v.includes("\\")) || /^https:\/\/[^\s/]+\.[^\s]+$/.test(v), {
    error: "Link inválido: use um caminho da loja (ex.: /produtos?categoria=tops) ou um endereço https://",
  });

const imagePath = z
  .string()
  .regex(/^(banners|categories)\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png|avif)$/i, { error: "Imagem inválida." })
  .nullable();

const videoPath = z
  .string()
  .regex(/^videos\/[0-9a-f-]{36}\.(mp4|webm)$/i, { error: "Vídeo inválido." })
  .nullable();

export const slideSchema = z.object({
  image_path: imagePath,
  video_path: videoPath.optional().default(null),
  mobile_image_path: imagePath.optional().default(null),
  title: z.string().trim().max(80).default(""),
  subtitle: z.string().trim().max(200).default(""),
  cta_label: z.string().trim().max(30).default(""),
  cta_href: safeHref.default(""),
  align: z.enum(["left", "center"]).default("left"),
});

export const PRODUCT_SOURCES = {
  featured: "Destaques",
  new: "Lançamentos",
  best: "Mais vendidos",
  sale: "Em promoção",
  category: "Uma categoria",
  manual: "Escolhidos à mão",
  all: "Todos os produtos",
} as const;

const configs = {
  banners: z.object({
    slides: z.array(slideSchema).min(1, { error: "Adicione ao menos um slide." }).max(8),
    autoplay_seconds: z.number().int().min(0).max(15).default(6),
  }),
  hero: z.object({}).default({}),
  categories: z.object({}).default({}),
  products: z.object({
    eyebrow: z.string().trim().max(60).default(""),
    source: z.enum(Object.keys(PRODUCT_SOURCES) as [keyof typeof PRODUCT_SOURCES, ...(keyof typeof PRODUCT_SOURCES)[]]).default("featured"),
    category_slug: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
    product_ids: z.array(z.uuid()).max(24).optional(),
    limit: z.number().int().min(2).max(24).default(8),
    link_href: safeHref.default(""),
  }),
  double_banner: z.object({
    items: z
      .array(
        z.object({
          image_path: imagePath,
          title: z.string().trim().max(60).default(""),
          subtitle: z.string().trim().max(120).default(""),
          href: safeHref.default(""),
        }),
      )
      .length(2),
  }),
  text: z.object({
    eyebrow: z.string().trim().max(60).default(""),
    body: z.string().trim().max(3000).default(""),
    align: z.enum(["left", "center"]).default("center"),
  }),
  image_tiles: z.object({
    items: z
      .array(
        z.object({
          image_path: imagePath,
          label: z.string().trim().min(1, { error: "Cada card precisa de um texto." }).max(30),
          cta_label: z.string().trim().max(20).default("Comprar"),
          href: safeHref.default(""),
        }),
      )
      .min(1, { error: "Adicione ao menos um card." })
      .max(8),
  }),
  link_cards: z.object({
    items: z
      .array(
        z.object({
          label: z.string().trim().min(1, { error: "Cada atalho precisa de um texto." }).max(40),
          href: safeHref.default(""),
        }),
      )
      .min(1, { error: "Adicione ao menos um atalho." })
      .max(6),
  }),
  videos: z.object({
    items: z
      .array(
        z.object({
          video_path: videoPath,
          poster_path: imagePath.optional().default(null),
          product_id: z.uuid().nullable().default(null),
          caption: z.string().trim().max(80).default(""),
        }),
      )
      .max(10),
  }),
} as const;

export type SectionType = keyof typeof configs;
export const SECTION_TYPES = Object.keys(configs) as SectionType[];

export const SECTION_LABEL: Record<SectionType, { label: string; hint: string }> = {
  banners: { label: "Carrossel de banners", hint: "Slides com imagem, texto e botão" },
  hero: { label: "Destaque da coleção", hint: "Banner com slogan e produtos em destaque (automático)" },
  categories: { label: "Categorias (círculos)", hint: "Atalhos para as categorias, com foto" },
  products: { label: "Vitrine de produtos", hint: "Fileira de produtos em carrossel" },
  double_banner: { label: "Banner duplo", hint: "Duas imagens lado a lado com link" },
  text: { label: "Bloco de texto", hint: "Texto institucional, ex.: sobre a marca" },
  image_tiles: { label: "Cards com imagem", hint: "Ex.: “Compre por tamanho” — foto com texto grande e link" },
  link_cards: { label: "Atalhos em texto", hint: "Ex.: “Compre do seu jeito” — faixas de preço" },
  videos: { label: "Vídeos com produtos", hint: "Ex.: “Veja no corpo” — vídeos verticais com o produto" },
};

const isoOrNull = z
  .string()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Data inválida." });
      return z.NEVER;
    }
    return d.toISOString();
  });

const base = {
  id: z.uuid().optional(),
  title: z.string().trim().max(120).default(""),
  is_active: z.boolean().default(true),
  starts_at: isoOrNull.default(null),
  ends_at: isoOrNull.default(null),
};

export const sectionSchema = z
  .discriminatedUnion("type", [
    z.object({ ...base, type: z.literal("banners"), config: configs.banners }),
    z.object({ ...base, type: z.literal("hero"), config: configs.hero }),
    z.object({ ...base, type: z.literal("categories"), config: configs.categories }),
    z.object({ ...base, type: z.literal("products"), config: configs.products }),
    z.object({ ...base, type: z.literal("double_banner"), config: configs.double_banner }),
    z.object({ ...base, type: z.literal("text"), config: configs.text }),
    z.object({ ...base, type: z.literal("image_tiles"), config: configs.image_tiles }),
    z.object({ ...base, type: z.literal("link_cards"), config: configs.link_cards }),
    z.object({ ...base, type: z.literal("videos"), config: configs.videos }),
  ])
  .refine((s) => !s.starts_at || !s.ends_at || s.ends_at > s.starts_at, { error: "O fim precisa ser depois do início.", path: ["ends_at"] })
  .refine((s) => s.type !== "products" || s.config.source !== "category" || Boolean(s.config.category_slug), { error: "Escolha a categoria da vitrine.", path: ["config"] })
  .refine((s) => s.type !== "products" || s.config.source !== "manual" || (s.config.product_ids?.length ?? 0) > 0, { error: "Escolha ao menos um produto.", path: ["config"] })
  .refine((s) => s.type !== "banners" || s.config.slides.every((sl) => sl.image_path || sl.video_path || sl.title), { error: "Cada slide precisa de uma imagem, um vídeo ou um título.", path: ["config"] })
  .refine((s) => s.type !== "videos" || s.config.items.every((it) => it.video_path), { error: "Envie o vídeo de cada item.", path: ["config"] });

export type HomeSection = z.output<typeof sectionSchema> & { id: string; position: number };
export type SectionInput = z.input<typeof sectionSchema>;

/** Situação de agendamento para o painel. */
export function scheduleState(s: { is_active: boolean; starts_at: string | null; ends_at: string | null }, now = new Date()) {
  if (!s.is_active) return "off" as const;
  if (s.starts_at && new Date(s.starts_at) > now) return "scheduled" as const;
  if (s.ends_at && new Date(s.ends_at) <= now) return "expired" as const;
  return "live" as const;
}

/** Home padrão (usada se a tabela ainda não existir no banco). */
export const DEFAULT_SECTIONS: HomeSection[] = [
  { id: "d1", position: 1, type: "hero", title: "", is_active: true, starts_at: null, ends_at: null, config: {} },
  { id: "d2", position: 2, type: "categories", title: "Categorias", is_active: true, starts_at: null, ends_at: null, config: {} },
  { id: "d3", position: 3, type: "products", title: "Destaques", is_active: true, starts_at: null, ends_at: null, config: { eyebrow: "Escolhidos para você", source: "featured", limit: 8, link_href: "/produtos" } },
  { id: "d4", position: 4, type: "products", title: "Novidades", is_active: true, starts_at: null, ends_at: null, config: { eyebrow: "Acabou de chegar", source: "new", limit: 8, link_href: "/produtos?ordem=novidades" } },
  { id: "d5", position: 5, type: "products", title: "Mais vendidos", is_active: true, starts_at: null, ends_at: null, config: { eyebrow: "As queridinhas", source: "best", limit: 8, link_href: "" } },
  { id: "d6", position: 6, type: "products", title: "Todos os produtos", is_active: true, starts_at: null, ends_at: null, config: { eyebrow: "Coleção completa", source: "all", limit: 16, link_href: "/produtos" } },
];
