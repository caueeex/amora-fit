import { z } from "zod";
import { normalizeBrazilianPhone } from "@/lib/domain/phone";

const email = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "E-mail inválido." }).max(254, { error: "E-mail muito longo." }));

const password = z
  .string({ error: "Informe a senha." })
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .max(72, { error: "A senha pode ter no máximo 72 caracteres." })
  .refine((s) => /[A-Za-z]/.test(s) && /[0-9]/.test(s), {
    error: "Use letras e números na senha.",
  });

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Informe a senha." }).min(1, { error: "Informe a senha." }).max(72),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string({ error: "Informe seu nome." })
      .trim()
      .min(2, { error: "Informe seu nome completo." })
      .max(120, { error: "Nome muito longo." }),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return undefined;
        const normalized = normalizeBrazilianPhone(v);
        if (!normalized) {
          ctx.addIssue({ code: "custom", message: "Telefone inválido. Use DDD + número." });
          return z.NEVER;
        }
        // O banco guarda sem o DDI (10–13 dígitos aceitos); mantemos com 55.
        return normalized;
      }),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "As senhas não conferem.",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "As senhas não conferem.",
  });

/** Estado devolvido pelas Server Actions de formulário. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** Valores para re-preencher o formulário após erro (nunca senhas). */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

export function fieldErrorsFrom(error: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
