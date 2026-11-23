import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "../form-skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
