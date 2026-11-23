import { describe, expect, it } from "vitest";
import { fieldErrorsFrom, loginSchema, resetPasswordSchema, signUpSchema } from "@/lib/validators/auth";
import { authErrorMessage, GENERIC_AUTH_ERROR } from "./errors";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/minha-conta/pedidos")).toBe("/minha-conta/pedidos");
    expect(safeNextPath("/admin?status=PENDING")).toBe("/admin?status=PENDING");
  });

  it("bloqueia redirecionamentos externos", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "javascript:alert(1)", "/\u0000x", "", null, undefined, 42]) {
      expect(safeNextPath(bad), String(bad)).toBe("/minha-conta");
    }
  });
});

describe("authErrorMessage", () => {
  it("traduz códigos conhecidos e cai no genérico", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("E-mail ou senha incorretos.");
    expect(authErrorMessage({ status: 429 })).toMatch(/Muitas tentativas/);
    expect(authErrorMessage({ code: "algo_novo", message: "Internal details" })).toBe(GENERIC_AUTH_ERROR);
  });
});

describe("validação de formulários", () => {
  it("cadastro válido normaliza e-mail e telefone", () => {
    const r = signUpSchema.safeParse({
      fullName: "  Maria Souza ",
      phone: "(12) 99199-2477",
      email: " Maria@Email.COM ",
      password: "amora2026",
      confirmPassword: "amora2026",
    });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ fullName: "Maria Souza", phone: "5512991992477", email: "maria@email.com" });
  });

  it("cadastro sem telefone é aceito", () => {
    const r = signUpSchema.safeParse({ fullName: "Maria", phone: "", email: "m@e.com", password: "amora2026", confirmPassword: "amora2026" });
    expect(r.success).toBe(true);
    expect(r.data?.phone).toBeUndefined();
  });

  it("aponta os erros por campo", () => {
    const r = signUpSchema.safeParse({ fullName: "M", phone: "123", email: "x", password: "curta", confirmPassword: "outra" });
    expect(r.success).toBe(false);
    const errors = fieldErrorsFrom(r.error!);
    expect(Object.keys(errors).sort()).toEqual(["email", "fullName", "password", "phone"].sort());
  });

  it("senha precisa de letras e números e confirmação igual", () => {
    expect(resetPasswordSchema.safeParse({ password: "somenteletras", confirmPassword: "somenteletras" }).success).toBe(false);
    const r = resetPasswordSchema.safeParse({ password: "amora2026", confirmPassword: "amora2027" });
    expect(fieldErrorsFrom(r.error!)).toEqual({ confirmPassword: "As senhas não conferem." });
  });

  it("login exige e-mail válido e senha", () => {
    expect(loginSchema.safeParse({ email: "m@e.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "m@e.com", password: "" }).success).toBe(false);
  });
});
