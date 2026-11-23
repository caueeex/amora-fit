"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { initialFormState } from "@/lib/validators/auth";
import { resetPasswordAction } from "../actions";

/** Aberta pelo link do e-mail (via /auth/callback, que cria a sessão de recuperação). */
export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <header>
        <h1 className="font-display text-2xl font-bold text-creme-300">Nova senha</h1>
        <p className="mt-1 text-sm text-creme-100/75">Escolha uma nova senha para sua conta.</p>
      </header>

      {state.message && (
        <Notice tone="error">
          {state.message}{" "}
          <Link href="/recuperar-senha" className="font-semibold underline underline-offset-4">
            Solicitar novo link
          </Link>
        </Notice>
      )}

      <Field
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres, com letras e números."
        error={state.fieldErrors?.password}
      />
      <Field
        label="Confirmar nova senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
