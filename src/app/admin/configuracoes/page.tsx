import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { storagePublicUrl } from "@/lib/catalog/normalize";
import { formatBrazilianPhone } from "@/lib/domain/phone";
import { publicEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações da loja" description="Informações que aparecem no site e nas mensagens do WhatsApp." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <Loader />
      </Suspense>
    </>
  );
}

async function Loader() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  // Leitura direta (sem cache): o admin sempre edita o valor atual.
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("Configurações da loja não encontradas.");

  return (
    <SettingsForm
      initial={{
        store_name: data.store_name,
        tagline: data.tagline,
        whatsapp_phone: formatBrazilianPhone(data.whatsapp_phone),
        contact_email: data.contact_email ?? "",
        contact_phone: data.contact_phone ?? "",
        instagram_url: data.instagram_url ?? "",
        tiktok_url: data.tiktok_url ?? "",
        banner_active: data.banner_active,
        banner_title: data.banner_title,
        banner_text: data.banner_text,
        about_text: data.about_text,
        shipping_policy_text: data.shipping_policy_text,
        whatsapp_order_greeting: data.whatsapp_order_greeting,
        whatsapp_order_closing: data.whatsapp_order_closing,
        reservation_hours: data.reservation_hours,
        logo_path: data.logo_path,
      }}
      logoUrl={data.logo_path ? storagePublicUrl(publicEnv.supabaseUrl, "store-assets", data.logo_path) : null}
      updatedAt={data.updated_at}
    />
  );
}
