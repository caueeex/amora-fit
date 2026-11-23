import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Amora Fit" },
  robots: { index: false, follow: false },
};

/**
 * Painel administrativo. Quem não é admin recebe 404.
 * Cada Server Action do admin também chama requireAdmin(), e o banco
 * valida de novo via RLS / private.is_admin().
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-creme-50 text-amora-950">
      <Suspense fallback={<div className="m-6 h-40 animate-pulse rounded-[var(--radius-card)] bg-amora-100" />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
