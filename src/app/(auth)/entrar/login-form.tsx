"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authErrorMessage } from "@/lib/auth/errors";
import { initialFormState } from "@/lib/validators/auth";
import { loginAction } from "../actions";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const linkError = params.get("erro");
  const [state, action, pending] = useActionState(loginAction, initialFormState);

  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <header>
        <h1 className="font-display text-2xl font-bold text-creme-300">Entrar</h1>
        <p className="mt-1 text-sm text-creme-100/75">Acompanhe seus pedidos e compre mais rápido.</p>
      </header>

      {linkError && state.status === "idle" && <Notice tone="error">{authErrorMessage({ code: linkError })}</Notice>}
      {state.message && <Notice tone={state.status === "error" ? "error" : "success"}>{state.message}</Notice>}

      <input type="hidden" name="next" value={next} />
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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />

      <div className="-mt-2 text-right">
        <Link href="/recuperar-senha" className="text-sm text-creme-200 underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
      </div>

      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      <p className="text-center text-sm text-creme-100/80">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro${query}`} className="font-semibold text-creme-300 underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
