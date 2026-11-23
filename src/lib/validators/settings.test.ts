import { describe, expect, it } from "vitest";
import { settingsSchema, type SettingsInput } from "./settings";

const base = (over: Partial<SettingsInput> = {}): SettingsInput => ({
  store_name: "Amora Fit",
  tagline: "Peças que te valorizam",
  whatsapp_phone: "(12) 99199-2477",
  contact_email: "",
  contact_phone: "",
  instagram_url: "",
  tiktok_url: "",
  banner_active: true,
  banner_title: "Presente",
  banner_text: "Texto",
  about_text: "",
  shipping_policy_text: "",
  whatsapp_order_greeting: "Olá!",
  whatsapp_order_closing: "Obrigada!",
  reservation_hours: 48,
  logo_path: null,
  ...over,
});

describe("settingsSchema", () => {
  it("normaliza WhatsApp, e-mail e links", () => {
    const r = settingsSchema.parse(base({ contact_email: " Loja@Amora.com ", instagram_url: "instagram.com/amorafit", tiktok_url: "http://tiktok.com/@amora" }));
    expect(r.whatsapp_phone).toBe("5512991992477");
    expect(r.contact_email).toBe("loja@amora.com");
    expect(r.instagram_url).toBe("https://instagram.com/amorafit");
    expect(r.tiktok_url).toBe("https://tiktok.com/@amora");
    expect(r.contact_phone).toBeNull();
  });

  it("recusa dados inválidos", () => {
    expect(settingsSchema.safeParse(base({ whatsapp_phone: "123" })).success).toBe(false);
    expect(settingsSchema.safeParse(base({ contact_email: "x@" })).success).toBe(false);
    expect(settingsSchema.safeParse(base({ instagram_url: "não é link" })).success).toBe(false);
    expect(settingsSchema.safeParse(base({ reservation_hours: 0 })).success).toBe(false);
    expect(settingsSchema.safeParse(base({ logo_path: "../etc/passwd" })).success).toBe(false);
  });
});
