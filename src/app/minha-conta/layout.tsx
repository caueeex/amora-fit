import { Suspense } from "react";
import { requireProfile } from "@/lib/auth/dal";

/**
 * Toda a área do cliente passa por aqui. A checagem lê a sessão no servidor
 * (dentro de <Suspense>, exigência do Cache Components). O proxy já barra quem
 * não está logado; esta é a segunda camada, e o banco (RLS) é a terceira.
 */
export default function AccountLayout({ children }: LayoutProps<"/minha-conta">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-10">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-amora-700/40" />}>
        <AccountGate>{children}</AccountGate>
      </Suspense>
    </div>
  );
}

async function AccountGate({ children }: { children: React.ReactNode }) {
  await requireProfile("/minha-conta");
  return <>{children}</>;
}
