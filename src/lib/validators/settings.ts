import { z } from "zod";
import { normalizeBrazilianPhone } from "@/lib/domain/phone";

const optionalHttps = (label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .transform((v, ctx) => {
      if (!v) return null;
      const url = /^https?:\/\//i.test(v) ? v.replace(/^http:\/\//i, "https://") : `https://${v}`;
      try {
        const u = new URL(url);
        if (!u.hostname.includes(".")) throw new Error();
        return u.toString();
      } catch {
        ctx.addIssue({ code: "custom", message: `${label}: link inválido.` });
        return z.NEVER;
      }
    });

const text = (max: number) => z.string().trim().max(max, { error: `Máximo de ${max} caracteres.` });

export const settingsSchema = z.object({
  store_name: z.string().trim().min(2, { error: "Informe o nome da loja." }).max(60),
  tagline: text(160),
  whatsapp_phone: z.string().transform((v, ctx) => {
    const n = normalizeBrazilianPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "WhatsApp inválido. Use DDD + número, ex.: (12) 99199-2477." });
      return z.NEVER;
    }
    return n;
  }),
  contact_email: z
    .string()
    .trim()
    .max(254)
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
        ctx.addIssue({ code: "custom", message: "E-mail de contato inválido." });
        return z.NEVER;
      }
      return v.toLowerCase();
    }),
  contact_phone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => v || null),
  instagram_url: optionalHttps("Instagram"),
  tiktok_url: optionalHttps("TikTok"),
  banner_active: z.boolean(),
  banner_title: text(120),
  banner_text: text(500),
  about_text: text(5000),
  shipping_policy_text: text(2000),
  whatsapp_order_greeting: text(300),
  whatsapp_order_closing: text(300),
  reservation_hours: z.number().int().min(1, { error: "Mínimo de 1 hora." }).max(720, { error: "Máximo de 720 horas (30 dias)." }),
  logo_path: z
    .string()
    .regex(/^logo\/[0-9a-f-]{36}\.(png|webp|jpg|jpeg|svg)$/i)
    .nullable(),
});

export type SettingsInput = z.input<typeof settingsSchema>;
