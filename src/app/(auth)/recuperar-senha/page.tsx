"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { initialFormState } from "@/lib/validators/auth";
import { forgotPasswordAction } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <header>
        <h1 className="font-display text-2xl font-bold text-creme-300">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-creme-100/75">
          Informe seu e-mail e enviaremos um link para você criar uma nova senha.
        </p>
      </header>

      {state.message && <Notice tone={state.status === "error" ? "error" : "success"}>{state.message}</Notice>}

      {state.status !== "success" && (
        <>
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
          <Button type="submit" size="lg" loading={pending}>
            {pending ? "Enviando…" : "Enviar link"}
          </Button>
        </>
      )}

      <Link href="/entrar" className="text-center text-sm font-semibold text-creme-300 underline-offset-4 hover:underline">
        Voltar para o login
      </Link>
    </form>
  );
}
