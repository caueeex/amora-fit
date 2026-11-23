"use client";

import { useRef, useState, useTransition } from "react";
import { AdminButton, AdminInput, AdminTextarea, Card, CardTitle } from "@/components/admin/ui";
import { buildOrderMessage } from "@/lib/domain/whatsapp";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { uuidv4 } from "@/lib/uuid";
import type { SettingsInput } from "@/lib/validators/settings";
import { saveSettingsAction } from "./actions";

const dt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg", "image/svg+xml": "svg" };

export function SettingsForm({ initial, logoUrl, updatedAt }: { initial: SettingsInput; logoUrl: string | null; updatedAt: string }) {
  const [v, setV] = useState(initial);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string; field?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadedThisSession = useRef<string | null>(null);

  const set = <K extends keyof SettingsInput>(k: K, value: SettingsInput[K]) => {
    setV((s) => ({ ...s, [k]: value }));
    setStatus(null);
  };
  const field = (k: keyof SettingsInput) => ({
    value: String(v[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
    error: status?.field === k ? status.text : undefined,
  });

  async function uploadLogo(file: File) {
    const ext = LOGO_TYPES[file.type];
    if (!ext || file.size > 2 * 1024 * 1024) {
      setStatus({ ok: false, text: "Logo: use PNG, WebP, JPG ou SVG de até 2 MB." });
      return;
    }
    setUploading(true);
    const supabase = getSupabaseBrowserClient();
    const path = `logo/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setUploading(false);
    if (error) {
      setStatus({ ok: false, text: `Não foi possível enviar o logo: ${error.message}` });
      return;
    }
    // Se trocar de novo antes de salvar, descarta o envio anterior não salvo.
    if (uploadedThisSession.current) await supabase.storage.from("store-assets").remove([uploadedThisSession.current]);
    uploadedThisSession.current = path;
    set("logo_path", path);
    setLogoPreview(URL.createObjectURL(file));
  }

  function save() {
    start(async () => {
      const r = await saveSettingsAction({ ...v, reservation_hours: Number(v.reservation_hours) });
      if (r.ok) {
        uploadedThisSession.current = null;
        setStatus({ ok: true, text: "Configurações salvas. A loja já foi atualizada." });
      } else setStatus({ ok: false, text: r.error, field: r.field });
    });
  }

  const preview = buildOrderMessage(
    {
      orderNumber: 123,
      customerName: "Maria Souza",
      items: [{ productName: "Legging Cintura Alta", size: "M", colorName: "Preto", quantity: 1, unitPriceCents: 8990 }],
      subtotalCents: 8990,
      shippingCents: 0,
      totalCents: 8990,
      shippingToArrange: true,
    },
    { greeting: v.whatsapp_order_greeting, closing: v.whatsapp_order_closing },
  );

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Identidade</CardTitle>
          <div className="grid gap-4">
            <AdminInput label="Nome da loja" maxLength={60} {...field("store_name")} />
            <AdminInput label="Frase da marca (slogan)" maxLength={160} {...field("tagline")} />
            <div>
              <span className="text-sm font-medium text-amora-950">Logo</span>
              <div className="mt-1.5 flex items-center gap-4">
                <span className="grid h-16 w-32 place-items-center overflow-hidden rounded-xl border border-amora-900/10 bg-amora-800 p-2">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou SVG
                    <img src={logoPreview} alt="Logo atual" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-creme-100/70">logo em texto</span>
                  )}
                </span>
                <div className="flex flex-wrap gap-2">
                  <AdminButton type="button" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
                    {logoPreview ? "Trocar logo" : "Enviar logo"}
                  </AdminButton>
                  {logoPreview && (
                    <AdminButton type="button" variant="ghost" onClick={() => (set("logo_path", null), setLogoPreview(null))}>
                      Usar logo em texto
                    </AdminButton>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </div>
              <p className="mt-1 text-xs text-amora-900/50">De preferência PNG ou SVG com fundo transparente e letras claras (aparece sobre o vinho).</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Contato e redes</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput label="WhatsApp da loja (recebe os pedidos)" type="tel" inputMode="tel" {...field("whatsapp_phone")} />
            <AdminInput label="Telefone fixo (opcional)" type="tel" {...field("contact_phone")} />
            <AdminInput className="sm:col-span-2" label="E-mail de contato (opcional)" type="email" {...field("contact_email")} />
            <AdminInput label="Instagram (link)" placeholder="instagram.com/amorafit" {...field("instagram_url")} />
            <AdminInput label="TikTok (link)" placeholder="tiktok.com/@amorafit" {...field("tiktok_url")} />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Faixa de anúncio (topo do site)</CardTitle>
        <label className="mb-4 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={v.banner_active} onChange={(e) => set("banner_active", e.target.checked)} className="h-4 w-4 accent-amora-800" />
          Mostrar a faixa no site
        </label>
        <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
          <AdminInput label="Título (em negrito)" maxLength={120} {...field("banner_title")} />
          <AdminInput label="Texto" maxLength={500} {...field("banner_text")} />
        </div>
        <p className="mb-1 mt-4 text-xs font-medium text-amora-900/55">Prévia</p>
        <div className={`rounded-xl px-4 py-2 text-center text-sm ${v.banner_active ? "bg-creme-300 text-amora-900" : "bg-stone-100 text-stone-400 line-through"}`}>
          {v.banner_title && <strong>{v.banner_title}: </strong>}
          {v.banner_text || "…"}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Mensagem do pedido no WhatsApp</CardTitle>
          <div className="grid gap-4">
            <AdminTextarea label="Abertura" maxLength={300} rows={2} value={v.whatsapp_order_greeting} onChange={(e) => set("whatsapp_order_greeting", e.target.value)} />
            <AdminTextarea label="Encerramento" maxLength={300} rows={2} value={v.whatsapp_order_closing} onChange={(e) => set("whatsapp_order_closing", e.target.value)} />
          </div>
          <p className="mb-1 mt-4 text-xs font-medium text-amora-900/55">Prévia (pedido de exemplo)</p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#E7FFDB] p-4 font-sans text-[13px] leading-relaxed text-[#111B21] shadow-inner">{preview}</pre>
        </Card>

        <Card>
          <CardTitle>Textos e regras</CardTitle>
          <div className="grid gap-4">
            <AdminTextarea label="Entrega e pagamento (rodapé do site)" rows={3} maxLength={2000} value={v.shipping_policy_text} onChange={(e) => set("shipping_policy_text", e.target.value)} />
            <AdminTextarea label="Sobre a marca" rows={4} maxLength={5000} value={v.about_text} onChange={(e) => set("about_text", e.target.value)} />
            <div>
              <AdminInput
                label="Reserva das peças (horas)"
                type="number"
                min={1}
                max={720}
                value={String(v.reservation_hours)}
                onChange={(e) => set("reservation_hours", Number(e.target.value) as never)}
                error={status?.field === "reservation_hours" ? status.text : undefined}
              />
              <p className="mt-1 text-xs text-amora-900/50">
                Tempo que as peças ficam reservadas aguardando o pagamento. Depois disso o pedido é cancelado sozinho e as peças voltam ao estoque. Vale para os
                próximos pedidos.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-amora-900/10 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
          {status ? (
            <p className={`mr-auto text-sm ${status.ok ? "text-emerald-800" : "text-red-800"}`} role={status.ok ? "status" : "alert"}>
              {status.ok ? "✓ " : ""}
              {status.text}
            </p>
          ) : (
            <p className="mr-auto text-xs text-amora-900/45">Última alteração: {dt.format(new Date(updatedAt))}</p>
          )}
          <AdminButton loading={pending} onClick={save}>
            Salvar configurações
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
