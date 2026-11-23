import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";
import { productFormSchema, type ProductFormInput } from "./product";

const valid = (over: Partial<ProductFormInput> = {}): ProductFormInput => ({
  name: "Legging Cintura Alta",
  slug: "legging-cintura-alta",
  category_id: "00000000-0000-4000-8000-000000000001",
  description: "",
  price: "89,90",
  promo_price: "",
  status: "active",
  is_new: true,
  is_featured: false,
  variants: [{ color_name: "Preto", color_hex: "#0A0A0A", size: "M", is_active: true, initial_stock: 4 }],
  ...over,
});

describe("slugify", () => {
  it("gera endereço amigável", () => {
    expect(slugify("Legging Cintura Alta — Preta!")).toBe("legging-cintura-alta-preta");
    expect(slugify("  Top Alça   Cruzada  ")).toBe("top-alca-cruzada");
    expect(slugify("Conjunto Amora (Top + Legging)")).toBe("conjunto-amora-top-legging");
  });
});

describe("productFormSchema", () => {
  it("converte preços para centavos", () => {
    const r = productFormSchema.parse(valid({ promo_price: "79,90" }));
    expect(r.product).toMatchObject({ price_cents: 8990, promo_price_cents: 7990 });
  });

  it("recusa promoção maior ou igual ao preço", () => {
    const r = productFormSchema.safeParse(valid({ promo_price: "89,90" }));
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toMatch(/menor que o preço/);
  });

  it("recusa variação repetida e publicação sem variações", () => {
    const dup = productFormSchema.safeParse(
      valid({ variants: [{ color_name: "Preto", color_hex: "#000000", size: "M", is_active: true }, { color_name: "preto", color_hex: "#000000", size: "M", is_active: true }] }),
    );
    expect(dup.error!.issues[0].message).toMatch(/repetida/);
    const none = productFormSchema.safeParse(valid({ variants: [] }));
    expect(none.error!.issues[0].message).toMatch(/Para publicar/);
    expect(productFormSchema.safeParse(valid({ variants: [], status: "draft" })).success).toBe(true);
  });

  it("valida slug, preço e tamanhos", () => {
    expect(productFormSchema.safeParse(valid({ slug: "Com Espaço" })).success).toBe(false);
    expect(productFormSchema.safeParse(valid({ price: "abc" })).success).toBe(false);
    expect(productFormSchema.safeParse(valid({ variants: [{ color_name: "A", color_hex: "#000000", size: "XXL" as "M", is_active: true }] })).success).toBe(false);
  });
});
