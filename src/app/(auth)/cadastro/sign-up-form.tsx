"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { initialFormState } from "@/lib/validators/auth";
import { signUpAction } from "../actions";

export function SignUpForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(signUpAction, initialFormState);
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-5 text-center">
        <h1 className="font-display text-2xl font-bold text-creme-300">Confirme seu e-mail</h1>
        <Notice tone="success">{state.message}</Notice>
        <p className="text-sm text-creme-100/75">
          Não recebeu? Verifique o spam ou aguarde alguns minutos antes de tentar de novo.
        </p>
        <Link href={`/entrar${query}`} className="text-sm font-semibold text-creme-300 underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <header>
        <h1 className="font-display text-2xl font-bold text-creme-300">Criar conta</h1>
        <p className="mt-1 text-sm text-creme-100/75">Leva menos de um minuto.</p>
      </header>

      {state.message && <Notice tone="error">{state.message}</Notice>}

      <input type="hidden" name="next" value={next} />
      <Field
        label="Nome completo"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
      />
      <Field
        label="WhatsApp (opcional)"
        name="phone"
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        placeholder="(12) 99999-9999"
        defaultValue={state.values?.phone}
        error={state.fieldErrors?.phone}
        hint="Usado só para falar sobre seus pedidos."
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres, com letras e números."
        error={state.fieldErrors?.password}
      />
      <Field
        label="Confirmar senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>

      <p className="text-center text-sm text-creme-100/80">
        Já tem conta?{" "}
        <Link href={`/entrar${query}`} className="font-semibold text-creme-300 underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
