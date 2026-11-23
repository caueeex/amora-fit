import { z } from "zod";
import { normalizeBrazilianPhone } from "@/lib/domain/phone";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `Informe ${label}.` })
    .trim()
    .min(min, { error: `Informe ${label}.` })
    .max(max, { error: `${label[0].toUpperCase()}${label.slice(1)} muito longo.` });

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().transform((v) => v || "Casa"),
  recipientName: text(2, 120, "o nome de quem recebe"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const n = normalizeBrazilianPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Telefone inválido. Use DDD + número." });
        return z.NEVER;
      }
      return n;
    }),
  cep: z
    .string({ error: "Informe o CEP." })
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{8}$/, { error: "CEP deve ter 8 dígitos." })),
  street: text(2, 160, "a rua"),
  number: text(1, 20, "o número"),
  complement: z.string().trim().max(80, { error: "Complemento muito longo." }).optional().transform((v) => v || undefined),
  district: text(2, 80, "o bairro"),
  city: text(2, 80, "a cidade"),
  state: z
    .string({ error: "Informe o estado." })
    .trim()
    .toUpperCase()
    .refine((v) => (UFS as readonly string[]).includes(v), { error: "Estado inválido." }),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.input<typeof addressSchema>;
export type Address = z.output<typeof addressSchema>;

export const contactSchema = z.object({
  fullName: text(2, 120, "seu nome"),
  phone: z
    .string({ error: "Informe seu WhatsApp." })
    .trim()
    .transform((v, ctx) => {
      const n = normalizeBrazilianPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "WhatsApp inválido. Use DDD + número." });
        return z.NEVER;
      }
      return n;
    }),
});
