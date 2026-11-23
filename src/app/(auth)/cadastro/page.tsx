import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "../form-skeleton";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={5} />}>
      <SignUpForm />
    </Suspense>
  );
}
