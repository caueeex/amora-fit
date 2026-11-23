import { describe, expect, it } from "vitest";
import { safeHref, scheduleState, sectionSchema } from "./sections";

describe("safeHref", () => {
  it("aceita links da loja e https; bloqueia o resto", () => {
    for (const ok of ["", "/produtos", "/produtos?categoria=tops&cor=Preto", "https://instagram.com/amorafit"]) expect(safeHref.safeParse(ok).success, ok).toBe(true);
    for (const bad of ["javascript:alert(1)", "//evil.com", "http://site.com", "data:text/html,x", "/\\evil.com", "produtos", "https://"]) expect(safeHref.safeParse(bad).success, bad).toBe(false);
  });
});

describe("sectionSchema", () => {
  it("valida carrossel de banners", () => {
    const r = sectionSchema.parse({
      type: "banners",
      config: { slides: [{ image_path: "banners/00000000-0000-4000-8000-000000000001.webp", title: "Black Friday", cta_label: "Comprar", cta_href: "/produtos?oferta=1" }] },
    });
    expect(r.type === "banners" && r.config.autoplay_seconds).toBe(6);
    expect(sectionSchema.safeParse({ type: "banners", config: { slides: [] } }).success).toBe(false);
    expect(sectionSchema.safeParse({ type: "banners", config: { slides: [{ image_path: null, title: "" }] } }).success).toBe(false);
    expect(sectionSchema.safeParse({ type: "banners", config: { slides: [{ image_path: "../x.webp", title: "a" }] } }).success).toBe(false);
  });

  it("vitrine exige categoria ou produtos conforme a origem", () => {
    expect(sectionSchema.safeParse({ type: "products", title: "X", config: { source: "category" } }).success).toBe(false);
    expect(sectionSchema.safeParse({ type: "products", title: "X", config: { source: "category", category_slug: "tops" } }).success).toBe(true);
    expect(sectionSchema.safeParse({ type: "products", title: "X", config: { source: "manual", product_ids: [] } }).success).toBe(false);
  });

  it("período: fim depois do início", () => {
    expect(sectionSchema.safeParse({ type: "text", starts_at: "2026-12-01T10:00", ends_at: "2026-11-30T10:00", config: {} }).success).toBe(false);
    const ok = sectionSchema.parse({ type: "text", starts_at: "2026-11-25T00:00:00-03:00", ends_at: null, config: { body: "Oi" } });
    expect(ok.starts_at).toBe("2026-11-25T03:00:00.000Z");
  });

  it("tipo desconhecido é recusado", () => {
    expect(sectionSchema.safeParse({ type: "script", config: {} }).success).toBe(false);
  });

  it("situação do agendamento", () => {
    const now = new Date("2026-11-23T12:00:00Z");
    expect(scheduleState({ is_active: false, starts_at: null, ends_at: null }, now)).toBe("off");
    expect(scheduleState({ is_active: true, starts_at: "2026-11-24T00:00:00Z", ends_at: null }, now)).toBe("scheduled");
    expect(scheduleState({ is_active: true, starts_at: null, ends_at: "2026-11-23T11:00:00Z" }, now)).toBe("expired");
    expect(scheduleState({ is_active: true, starts_at: null, ends_at: null }, now)).toBe("live");
  });
});

describe("novos tipos de seção", () => {
  const vid = "videos/00000000-0000-4000-8000-000000000001.mp4";
  it("cards com imagem e atalhos em texto", () => {
    expect(sectionSchema.safeParse({ type: "image_tiles", title: "Compre por tamanho", config: { items: [{ image_path: null, label: "PP", href: "/produtos?tamanho=PP" }] } }).success).toBe(true);
    expect(sectionSchema.safeParse({ type: "image_tiles", config: { items: [{ image_path: null, label: "", href: "" }] } }).success).toBe(false);
    expect(sectionSchema.safeParse({ type: "link_cards", config: { items: [{ label: "Até R$ 180", href: "/produtos?max=180" }] } }).success).toBe(true);
    expect(sectionSchema.safeParse({ type: "link_cards", config: { items: [{ label: "x", href: "javascript:alert(1)" }] } }).success).toBe(false);
  });

  it("vídeos exigem arquivo válido; produto é opcional", () => {
    expect(sectionSchema.safeParse({ type: "videos", config: { items: [{ video_path: vid, product_id: null }] } }).success).toBe(true);
    expect(sectionSchema.safeParse({ type: "videos", config: { items: [{ video_path: null }] } }).success).toBe(false);
    expect(sectionSchema.safeParse({ type: "videos", config: { items: [{ video_path: "videos/x.exe" }] } }).success).toBe(false);
  });

  it("slide de banner pode ter só vídeo", () => {
    expect(sectionSchema.safeParse({ type: "banners", config: { slides: [{ image_path: null, video_path: vid, title: "" }] } }).success).toBe(true);
  });
});
