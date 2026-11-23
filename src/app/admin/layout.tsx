import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { RealtimeOrders } from "@/components/admin/realtime-orders";
import { countPendingOrders } from "@/lib/admin/queries";
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
    <div className="flex min-h-dvh flex-1 flex-col bg-[#FBF7F1] text-amora-950 lg:flex-row">
      <Suspense fallback={<div className="hidden w-64 shrink-0 bg-amora-900 lg:block" aria-hidden="true" />}>
        <AdminShellNav />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}

async function AdminShellNav() {
  const admin = await requireAdmin();
  const pending = await countPendingOrders();
  return <AdminNav pending={pending} name={admin.full_name.split(" ")[0] || admin.email || ""} />;
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <RealtimeOrders />
      </div>
      {children}
    </>
  );
}
