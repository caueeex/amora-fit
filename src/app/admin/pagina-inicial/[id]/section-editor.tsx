"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AdminButton, AdminInput, AdminSelect, AdminTextarea, Card, CardTitle } from "@/components/admin/ui";
import { PRODUCT_SOURCES, SECTION_LABEL, type HomeSection } from "@/lib/home/sections";
import { uploadStoreAsset } from "@/lib/images/upload-asset";
import { saveSectionAction } from "../actions";

type Picker = { id: string; name: string; status: string; thumb: string | null };
type Cat = { slug: string; name: string };

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

/** Campo de imagem com envio para o Storage (store-assets). */
function ImageField({ label, path, url, onChange, folder = "banners", hint }: { label: string; path: string | null; url: string | null; onChange: (path: string | null, preview: string | null) => void; folder?: "banners" | "categories"; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-amora-950">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} className="relative grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-amora-900/25 bg-amora-100/30 text-xs text-amora-900/60 hover:border-amora-700">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou Storage
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : busy ? (
            "enviando…"
          ) : (
            "+ imagem"
          )}
        </button>
        <div className="flex flex-col gap-1">
          <AdminButton type="button" variant="secondary" className="min-h-9" loading={busy} onClick={() => input.current?.click()}>
            {path ? "Trocar" : "Enviar"}
          </AdminButton>
          {path && (
            <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => onChange(null, null)}>
              Remover imagem
            </button>
          )}
        </div>
      </div>
      {hint && <span className="text-xs text-amora-900/50">{hint}</span>}
      {error && <span className="text-xs text-red-700">{error}</span>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            const p = await uploadStoreAsset(folder, f);
            onChange(p, URL.createObjectURL(f));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

export function SectionEditor({ section, assetBase, products, categories }: { section: HomeSection; assetBase: string; products: Picker[]; categories: Cat[] }) {
  const router = useRouter();
  const [s, setS] = useState<HomeSection>(section);
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [productFilter, setProductFilter] = useState("");

  const urlOf = (key: string, path: string | null | undefined) => (key in previews ? previews[key] : path ? `${assetBase}/${path}` : null);
  const patch = (p: Partial<HomeSection>) => {
    setS((cur) => ({ ...cur, ...p }) as HomeSection);
    setStatus(null);
  };
  const patchConfig = (p: Record<string, unknown>) => {
    setS((cur) => ({ ...cur, config: { ...cur.config, ...p } }) as HomeSection);
    setStatus(null);
  };

  function save() {
    start(async () => {
      const r = await saveSectionAction(s);
      if (r.ok) {
        setStatus({ ok: true, text: "Seção salva. A página inicial já foi atualizada." });
        router.refresh();
      } else setStatus({ ok: false, text: r.error });
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Card>
        <CardTitle>{SECTION_LABEL[s.type].label}</CardTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {s.type !== "hero" && <AdminInput label={s.type === "categories" ? "Título (opcional)" : "Título"} value={s.title} maxLength={120} onChange={(e) => patch({ title: e.target.value })} />}
          <label className="flex items-center gap-3 self-end text-sm">
            <input type="checkbox" checked={s.is_active} onChange={(e) => patch({ is_active: e.target.checked })} className="h-4 w-4 accent-amora-800" />
            Seção ativa
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AdminInput label="Aparece a partir de (opcional)" type="datetime-local" value={toLocal(s.starts_at)} onChange={(e) => patch({ starts_at: fromLocal(e.target.value) })} />
          <AdminInput label="Sai do ar em (opcional)" type="datetime-local" value={toLocal(s.ends_at)} onChange={(e) => patch({ ends_at: fromLocal(e.target.value) })} />
        </div>
        <p className="mt-2 text-xs text-amora-900/50">Use o agendamento para promoções: a seção entra e sai do ar sozinha (com até ~1 minuto de diferença).</p>
        {s.type === "hero" && <p className="mt-4 rounded-xl bg-amora-100/25 p-3 text-sm text-amora-900/70">Esta seção é automática: usa o slogan das Configurações e os produtos em destaque.</p>}
        {s.type === "categories" && (
          <p className="mt-4 rounded-xl bg-amora-100/25 p-3 text-sm text-amora-900/70">
            Mostra as categorias ativas, na ordem e com as fotos definidas na aba <strong>Categorias</strong>.
          </p>
        )}
      </Card>

      {s.type === "banners" && (
        <Card>
          <CardTitle
            action={
              <AdminSelect label="Troca automática" value={String(s.config.autoplay_seconds)} onChange={(e) => patchConfig({ autoplay_seconds: Number(e.target.value) })} className="w-44">
                <option value="0">Desligada</option>
                {[4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    A cada {n} segundos
                  </option>
                ))}
              </AdminSelect>
            }
          >
            Slides
          </CardTitle>
          <ol className="flex flex-col gap-4">
            {s.config.slides.map((sl, i) => {
              const setSlide = (p: Record<string, unknown>) => patchConfig({ slides: s.config.slides.map((x, j) => (j === i ? { ...x, ...p } : x)) });
              const move = (d: -1 | 1) => {
                const arr = [...s.config.slides];
                [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
                patchConfig({ slides: arr });
              };
              return (
                <li key={i} className="rounded-2xl border border-amora-900/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-amora-950">Slide {i + 1}</span>
                    <div className="flex gap-1">
                      <AdminButton type="button" variant="ghost" className="min-h-8 px-2" disabled={i === 0} onClick={() => move(-1)} aria-label="Subir slide">
                        ↑
                      </AdminButton>
                      <AdminButton type="button" variant="ghost" className="min-h-8 px-2" disabled={i === s.config.slides.length - 1} onClick={() => move(1)} aria-label="Descer slide">
                        ↓
                      </AdminButton>
                      <AdminButton type="button" variant="ghost" className="min-h-8 px-2 text-red-700" disabled={s.config.slides.length === 1} onClick={() => patchConfig({ slides: s.config.slides.filter((_, j) => j !== i) })}>
                        Remover
                      </AdminButton>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ImageField
                      label="Imagem (computador)"
                      hint="Horizontal, ideal 2100 × 900 px."
                      path={sl.image_path}
                      url={urlOf(`s${i}d`, sl.image_path)}
                      onChange={(p, prev) => (setPreviews((x) => ({ ...x, [`s${i}d`]: prev })), setSlide({ image_path: p }))}
                    />
                    <ImageField
                      label="Imagem (celular, opcional)"
                      hint="Vertical, ideal 1080 × 1350 px. Sem ela, usa a do computador."
                      path={sl.mobile_image_path ?? null}
                      url={urlOf(`s${i}m`, sl.mobile_image_path)}
                      onChange={(p, prev) => (setPreviews((x) => ({ ...x, [`s${i}m`]: prev })), setSlide({ mobile_image_path: p }))}
                    />
                    <AdminInput label="Título" maxLength={80} value={sl.title} onChange={(e) => setSlide({ title: e.target.value })} />
                    <AdminInput label="Texto de apoio" maxLength={200} value={sl.subtitle} onChange={(e) => setSlide({ subtitle: e.target.value })} />
                    <AdminInput label="Texto do botão" maxLength={30} placeholder="Ex.: Comprar agora" value={sl.cta_label} onChange={(e) => setSlide({ cta_label: e.target.value })} />
                    <AdminInput label="Link (o banner inteiro é clicável)" placeholder="/produtos?oferta=1" value={sl.cta_href} onChange={(e) => setSlide({ cta_href: e.target.value })} />
                    <AdminSelect label="Posição do texto" value={sl.align} onChange={(e) => setSlide({ align: e.target.value })}>
                      <option value="left">À esquerda</option>
                      <option value="center">Centralizado</option>
                    </AdminSelect>
                  </div>
                </li>
              );
            })}
          </ol>
          {s.config.slides.length < 8 && (
            <AdminButton type="button" variant="secondary" className="mt-4" onClick={() => patchConfig({ slides: [...s.config.slides, { image_path: null, mobile_image_path: null, title: "", subtitle: "", cta_label: "", cta_href: "", align: "left" }] })}>
              + Adicionar slide
            </AdminButton>
          )}
        </Card>
      )}

      {s.type === "products" && (
        <Card>
          <CardTitle>Vitrine</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminInput label="Linha acima do título (opcional)" maxLength={60} placeholder="Ex.: Acabou de chegar" value={s.config.eyebrow} onChange={(e) => patchConfig({ eyebrow: e.target.value })} />
            <AdminSelect label="Quais produtos" value={s.config.source} onChange={(e) => patchConfig({ source: e.target.value })}>
              {Object.entries(PRODUCT_SOURCES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </AdminSelect>
            {s.config.source === "category" && (
              <AdminSelect label="Categoria" value={s.config.category_slug ?? ""} onChange={(e) => patchConfig({ category_slug: e.target.value || undefined })}>
                <option value="">Escolha…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </AdminSelect>
            )}
            <AdminSelect label="Quantidade máxima" value={String(s.config.limit)} onChange={(e) => patchConfig({ limit: Number(e.target.value) })}>
              {[4, 6, 8, 12, 16, 24].map((n) => (
                <option key={n} value={n}>
                  {n} produtos
                </option>
              ))}
            </AdminSelect>
            <AdminInput label="Link do “Ver todos” (opcional)" placeholder="/produtos?categoria=tops" value={s.config.link_href} onChange={(e) => patchConfig({ link_href: e.target.value })} />
          </div>

          {s.config.source === "manual" && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-amora-950">
                Produtos escolhidos ({s.config.product_ids?.length ?? 0}) <span className="font-normal text-amora-900/55">— aparecem na ordem em que forem marcados</span>
              </p>
              <input value={productFilter} onChange={(e) => setProductFilter(e.target.value)} placeholder="Filtrar produtos" aria-label="Filtrar produtos" className="mb-2 min-h-10 w-full rounded-xl border border-amora-900/15 px-3 text-sm" />
              <ul className="grid max-h-80 gap-1 overflow-y-auto rounded-xl border border-amora-900/10 p-2 sm:grid-cols-2">
                {products
                  .filter((p) => p.name.toLowerCase().includes(productFilter.toLowerCase()))
                  .map((p) => {
                    const ids = s.config.product_ids ?? [];
                    const checked = ids.includes(p.id);
                    return (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 hover:bg-amora-100/30">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => patchConfig({ product_ids: e.target.checked ? [...ids, p.id].slice(0, 24) : ids.filter((x) => x !== p.id) })}
                            className="h-4 w-4 accent-amora-800"
                          />
                          <span className="relative h-10 w-8 shrink-0 overflow-hidden rounded bg-amora-100/50">
                            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
                            {p.thumb && <img src={p.thumb} alt="" className="h-full w-full object-cover" />}
                          </span>
                          <span className="truncate text-sm">
                            {p.name}
                            {p.status !== "active" && <span className="ml-1 text-xs text-amora-900/45">(rascunho)</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </Card>
      )}

      {s.type === "double_banner" && (
        <Card>
          <CardTitle>Banners</CardTitle>
          <div className="grid gap-6 lg:grid-cols-2">
            {s.config.items.map((it, i) => {
              const setItem = (p: Record<string, unknown>) => patchConfig({ items: s.config.items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} className="flex flex-col gap-3 rounded-2xl border border-amora-900/10 p-4">
                  <span className="text-sm font-semibold">{i === 0 ? "Esquerda" : "Direita"}</span>
                  <ImageField label="Imagem" hint="Ideal 1200 × 900 px." path={it.image_path} url={urlOf(`d${i}`, it.image_path)} onChange={(p, prev) => (setPreviews((x) => ({ ...x, [`d${i}`]: prev })), setItem({ image_path: p }))} />
                  <AdminInput label="Título" maxLength={60} value={it.title} onChange={(e) => setItem({ title: e.target.value })} />
                  <AdminInput label="Texto (opcional)" maxLength={120} value={it.subtitle} onChange={(e) => setItem({ subtitle: e.target.value })} />
                  <AdminInput label="Link" placeholder="/produtos?categoria=leggings" value={it.href} onChange={(e) => setItem({ href: e.target.value })} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {s.type === "text" && (
        <Card>
          <CardTitle>Texto</CardTitle>
          <div className="grid gap-4">
            <AdminInput label="Linha acima do título (opcional)" maxLength={60} value={s.config.eyebrow} onChange={(e) => patchConfig({ eyebrow: e.target.value })} />
            <AdminTextarea label="Texto (deixe uma linha em branco para separar parágrafos)" rows={8} maxLength={3000} value={s.config.body} onChange={(e) => patchConfig({ body: e.target.value })} />
            <AdminSelect label="Alinhamento" value={s.config.align} onChange={(e) => patchConfig({ align: e.target.value })}>
              <option value="center">Centralizado</option>
              <option value="left">À esquerda</option>
            </AdminSelect>
          </div>
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-amora-900/10 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
          {status && (
            <p className={`mr-auto text-sm ${status.ok ? "text-emerald-800" : "text-red-800"}`} role={status.ok ? "status" : "alert"}>
              {status.ok ? "✓ " : ""}
              {status.text}
            </p>
          )}
          <AdminButton variant="secondary" onClick={() => router.push("/admin/pagina-inicial")}>
            Voltar
          </AdminButton>
          <a href="/" target="_blank" className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-amora-800 hover:bg-amora-100/50">
            Ver loja ↗
          </a>
          <AdminButton loading={pending} onClick={save}>
            Salvar seção
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
