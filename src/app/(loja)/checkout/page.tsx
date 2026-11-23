import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth/dal";
import { formatBrazilianPhone } from "@/lib/domain/phone";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SavedAddress } from "./actions";
import { CheckoutFlow } from "./checkout-flow";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-creme-50">Finalizar pedido</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-amora-700/40" aria-hidden="true" />}>
        <CheckoutLoader />
      </Suspense>
    </div>
  );
}

async function CheckoutLoader() {
  const profile = await requireProfile("/checkout");
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("addresses")
    .select("id, label, recipient_name, phone, cep, street, number, complement, district, city, state, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <CheckoutFlow
      contact={{
        fullName: profile.full_name,
        phone: profile.phone ? formatBrazilianPhone(profile.phone) : "",
        email: profile.email ?? "",
      }}
      initialAddresses={(data ?? []) as SavedAddress[]}
    />
  );
}
