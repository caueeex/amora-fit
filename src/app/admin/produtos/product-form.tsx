"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AdminButton, AdminInput, AdminSelect, AdminTextarea, Card, CardTitle } from "@/components/admin/ui";
import { PRODUCT_STATUS_INFO, type ProductStatus } from "@/lib/admin/product-status";
import { SIZE_ORDER } from "@/lib/catalog/types";
import { formatBRL, parseBRLToCents } from "@/lib/domain/money";
import { slugify } from "@/lib/slug";
import { saveProductAction } from "./actions";

type Size = (typeof SIZE_ORDER)[number];

export type ProductFormInitial = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  price_cents: number | null;
  promo_price_cents: number | null;
  status: ProductStatus;
  is_new: boolean;
  is_featured: boolean;
  variants: { id: string; color_name: string; color_hex: string; size: string; is_active: boolean; on_hand: number; reserved: number }[];
};

type Color = { key: string; name: string; hex: string };
type Cell = { id?: string; active: boolean; stock: number; onHand?: number; reserved?: number };

const PRESET_COLORS = [
  { name: "Preto", hex: "#0A0A0A" },
  { name: "Vinho", hex: "#6B1544" },
  { name: "Amora", hex: "#560832" },
  { name: "Off-white", hex: "#F3EDE2" },
  { name: "Rosa Seco", hex: "#C98F9B" },
  { name: "Verde Oliva", hex: "#5B6B3A" },
  { name: "Azul Marinho", hex: "#1F2A44" },
  { name: "Cinza", hex: "#8A8A8A" },
];

let keySeq = 0;
const newKey = () => `c${++keySeq}`;
const centsToInput = (c: number | null) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

export function ProductForm({ initial, categories }: { initial: ProductFormInitial; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const isNew = !initial.id;

  // ---- dados básicos ----
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [categoryId, setCategoryId] = useState(initial.category_id ?? "");
  const [description, setDescription] = useState(initial.description);
  const [price, setPrice] = useState(centsToInput(initial.price_cents));
  const [promo, setPromo] = useState(centsToInput(initial.promo_price_cents));
  const [status, setStatus] = useState<ProductStatus>(initial.status);
  const [isNewFlag, setIsNewFlag] = useState(initial.is_new);
  const [featured, setFeatured] = useState(initial.is_featured);

  // ---- variações (grade cor × tamanho) ----
  const init = useMemo(() => {
    const colors: Color[] = [];
    const cells: Record<string, Cell> = {};
    const sizes = new Set<Size>();
    for (const v of initial.variants) {
      let c = colors.find((x) => x.name === v.color_name);
      if (!c) colors.push((c = { key: newKey(), name: v.color_name, hex: v.color_hex }));
      sizes.add(v.size as Size);
      cells[`${c.key}|${v.size}`] = { id: v.id, active: v.is_active, stock: 0, onHand: v.on_hand, reserved: v.reserved };
    }
    return { colors, cells, sizes: SIZE_ORDER.filter((s) => sizes.has(s)) };
  }, [initial.variants]);

  const [colors, setColors] = useState<Color[]>(init.colors);
  const [sizes, setSizes] = useState<Size[]>(init.sizes.length ? init.sizes : ["P", "M", "G"]);
  const [cells, setCells] = useState<Record<string, Cell>>(init.cells);

  const [pending, start] = useTransition();
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const cell = (c: Color, s: Size): Cell => cells[`${c.key}|${s}`] ?? { active: true, stock: 0 };
  const setCell = (c: Color, s: Size, patch: Partial<Cell>) => {
    setCells((all) => ({ ...all, [`${c.key}|${s}`]: { ...cell(c, s), ...patch } }));
    setSaved(false);
  };

  function addColor(preset?: { name: string; hex: string }) {
    const p = preset ?? { name: "", hex: "#560832" };
    if (preset && colors.some((c) => c.name.toLowerCase() === preset.name.toLowerCase())) return;
    setColors((cs) => [...cs, { key: newKey(), ...p }]);
    setSaved(false);
  }

  function toggleSize(s: Size) {
    setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : SIZE_ORDER.filter((x) => x === s || cur.includes(x))));
    setSaved(false);
  }

  function buildVariants() {
    const out: { id?: string; color_name: string; color_hex: string; size: Size; is_active: boolean; initial_stock?: number }[] = [];
    for (const c of colors) {
      for (const s of SIZE_ORDER) {
        const k = `${c.key}|${s}`;
        const existing = cells[k];
        const inGrid = sizes.includes(s);
        if (existing?.id) {
          // Já existe no banco: mantém, desativando se saiu da grade ou foi desmarcada.
          out.push({ id: existing.id, color_name: c.name.trim(), color_hex: c.hex, size: s, is_active: inGrid && existing.active });
        } else if (inGrid && (existing?.active ?? true)) {
          out.push({ color_name: c.name.trim(), color_hex: c.hex, size: s, is_active: true, initial_stock: existing?.stock || 0 });
        }
      }
    }
    return out;
  }

  const promoCents = parseBRLToCents(promo);
  const priceCents = parseBRLToCents(price);
  const discount = priceCents && promoCents && promoCents < priceCents ? Math.round((1 - promoCents / priceCents) * 100) : null;

  function submit() {
    setError(null);
    if (colors.some((c) => !c.name.trim())) {
      setError({ msg: "Dê um nome para todas as cores.", field: "variants" });
      return;
    }
    start(async () => {
      const r = await saveProductAction({
        id: initial.id,
        name,
        slug,
        category_id: categoryId,
        description,
        price,
        promo_price: promo,
        status,
        is_new: isNewFlag,
        is_featured: featured,
        variants: buildVariants(),
      });
      if (!r.ok) {
        setError({ msg: r.error, field: r.field });
        return;
      }
      setSaved(true);
      if (isNew) router.push(`/admin/produtos/${r.id}?criado=1`);
      else router.refresh();
    });
  }

  const err = (f: string) => (error?.field === f ? error.msg : undefined);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle>Informações</CardTitle>
          <div className="grid gap-4">
            <AdminInput
              label="Nome do produto"
              value={name}
              maxLength={120}
              error={err("name")}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
                setSaved(false);
              }}
            />
            <div>
              <AdminInput
                label="Endereço na loja (slug)"
                value={slug}
                maxLength={80}
                error={err("slug")}
                onChange={(e) => {
                  setSlug(slugify(e.target.value) || e.target.value.toLowerCase());
                  setSlugTouched(true);
                  setSaved(false);
                }}
              />
              <p className="mt-1 text-xs text-amora-900/50">amorafit.com.br/produto/{slug || "…"}</p>
            </div>
            <AdminSelect label="Categoria" value={categoryId} onChange={(e) => (setCategoryId(e.target.value), setSaved(false))}>
              <option value="">Escolha…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </AdminSelect>
            {err("category_id") && <p className="-mt-3 text-xs text-red-700">{err("category_id")}</p>}
            <AdminTextarea
              label="Descrição"
              rows={5}
              maxLength={5000}
              value={description}
              placeholder="Tecido, modelagem, compressão, dicas de uso…"
              onChange={(e) => (setDescription(e.target.value), setSaved(false))}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Preço</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <AdminInput label="Preço (R$)" inputMode="decimal" placeholder="89,90" value={price} error={err("price")} onChange={(e) => (setPrice(e.target.value), setSaved(false))} />
              <AdminInput label="Promocional (R$)" inputMode="decimal" placeholder="opcional" value={promo} error={err("promo_price")} onChange={(e) => (setPromo(e.target.value), setSaved(false))} />
            </div>
            {priceCents ? (
              <p className="mt-3 text-sm text-amora-900/70">
                Na loja:{" "}
                {discount ? (
                  <>
                    <strong className="text-amora-950">{formatBRL(promoCents!)}</strong> <span className="line-through">{formatBRL(priceCents)}</span>{" "}
                    <span className="rounded-full bg-amora-100/70 px-2 py-0.5 text-xs font-semibold">-{discount}%</span>
                  </>
                ) : (
                  <strong className="text-amora-950">{formatBRL(priceCents)}</strong>
                )}
              </p>
            ) : null}
          </Card>

          <Card>
            <CardTitle>Publicação</CardTitle>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Situação</legend>
              {(Object.keys(PRODUCT_STATUS_INFO) as ProductStatus[]).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-3 rounded-xl border border-amora-900/10 px-3 py-2.5 has-[:checked]:border-amora-800 has-[:checked]:bg-amora-100/30">
                  <input type="radio" name="status" checked={status === s} onChange={() => (setStatus(s), setSaved(false))} className="accent-amora-800" />
                  <span className="text-sm">
                    <strong className="text-amora-950">{PRODUCT_STATUS_INFO[s].label}</strong>
                    <span className="block text-xs text-amora-900/55">{PRODUCT_STATUS_INFO[s].hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={isNewFlag} onChange={(e) => (setIsNewFlag(e.target.checked), setSaved(false))} className="h-4 w-4 accent-amora-800" />
                Lançamento (selo “Novo” e seção Novidades)
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={featured} onChange={(e) => (setFeatured(e.target.checked), setSaved(false))} className="h-4 w-4 accent-amora-800" />
                Destaque na página inicial
              </label>
            </div>
          </Card>
        </div>
      </div>

      {/* Variações */}
      <Card>
        <CardTitle>Cores, tamanhos e estoque</CardTitle>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amora-900/55">Tamanhos</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {SIZE_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              aria-pressed={sizes.includes(s)}
              className={`min-h-10 min-w-12 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                sizes.includes(s) ? "border-amora-800 bg-amora-800 text-creme-50" : "border-amora-900/15 bg-white text-amora-900/70 hover:border-amora-800/40"
              }`}
            >
              {s === "U" ? "Único" : s}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amora-900/55">Cores</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESET_COLORS.filter((p) => !colors.some((c) => c.name.toLowerCase() === p.name.toLowerCase())).map((p) => (
            <button key={p.name} type="button" onClick={() => addColor(p)} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-amora-900/15 bg-white px-3 text-xs hover:border-amora-800/40">
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: p.hex }} aria-hidden="true" />+ {p.name}
            </button>
          ))}
          <button type="button" onClick={() => addColor()} className="inline-flex min-h-9 items-center rounded-full border border-dashed border-amora-900/30 px-3 text-xs font-semibold text-amora-800 hover:bg-amora-100/30">
            + Outra cor
          </button>
        </div>

        {colors.length === 0 || sizes.length === 0 ? (
          <p className="rounded-xl bg-amora-100/25 p-4 text-sm text-amora-900/65">Escolha ao menos um tamanho e uma cor para montar as variações.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-amora-900/55">
                  <th className="pb-2 pr-3 font-medium">Cor</th>
                  {sizes.map((s) => (
                    <th key={s} className="pb-2 text-center font-medium">
                      {s === "U" ? "Único" : s}
                    </th>
                  ))}
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-amora-900/10">
                {colors.map((c) => (
                  <tr key={c.key}>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={c.hex}
                          aria-label={`Tom da cor ${c.name || "nova"}`}
                          onChange={(e) => (setColors((cs) => cs.map((x) => (x.key === c.key ? { ...x, hex: e.target.value.toUpperCase() } : x))), setSaved(false))}
                          className="h-9 w-9 cursor-pointer rounded-lg border border-amora-900/15 bg-white p-0.5"
                        />
                        <input
                          value={c.name}
                          placeholder="Nome da cor"
                          maxLength={40}
                          aria-label="Nome da cor"
                          onChange={(e) => (setColors((cs) => cs.map((x) => (x.key === c.key ? { ...x, name: e.target.value } : x))), setSaved(false))}
                          className="min-h-9 w-36 rounded-lg border border-amora-900/15 px-2 text-sm focus:border-amora-700 focus:outline-none"
                        />
                      </div>
                    </td>
                    {sizes.map((s) => {
                      const v = cell(c, s);
                      return (
                        <td key={s} className="px-1 py-2 text-center align-top">
                          <label className="inline-flex flex-col items-center gap-1">
                            <input type="checkbox" checked={v.active} onChange={(e) => setCell(c, s, { active: e.target.checked })} className="h-4 w-4 accent-amora-800" aria-label={`${c.name || "cor"} ${s} disponível`} />
                            {v.id ? (
                              <span className={`text-[11px] tabular-nums ${v.active ? "text-amora-900/60" : "text-amora-900/30 line-through"}`} title="Estoque atual (ajuste em Estoque)">
                                {v.onHand} un
                              </span>
                            ) : v.active ? (
                              <input
                                type="number"
                                min={0}
                                max={100000}
                                inputMode="numeric"
                                value={v.stock || ""}
                                placeholder="0"
                                aria-label={`Estoque inicial ${c.name} ${s}`}
                                onChange={(e) => setCell(c, s, { stock: Math.max(0, Math.min(100000, Number(e.target.value) || 0)) })}
                                className="w-16 rounded-lg border border-amora-900/15 px-1 py-1 text-center text-xs tabular-nums focus:border-amora-700 focus:outline-none"
                              />
                            ) : null}
                          </label>
                        </td>
                      );
                    })}
                    <td className="py-2 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => (setColors((cs) => cs.filter((x) => x.key !== c.key)), setSaved(false))}
                        className="rounded-lg px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        aria-label={`Remover cor ${c.name}`}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-amora-900/55">
              Marque as combinações que existem. Em combinações novas, informe o estoque inicial. Para alterar o estoque de variações já cadastradas, use a tela
              Estoque. Variações desmarcadas ficam ocultas na loja, mas o histórico é preservado.
            </p>
          </div>
        )}
        {err("variants") && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{err("variants")}</p>}
      </Card>

      {/* Barra fixa de salvar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-amora-900/10 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
          {error && (
            <p className="mr-auto text-sm text-red-800" role="alert">
              {error.msg}
            </p>
          )}
          {saved && !error && (
            <p className="mr-auto text-sm text-emerald-800" role="status">
              ✓ Alterações salvas
            </p>
          )}
          <AdminButton type="button" variant="secondary" onClick={() => router.push("/admin/produtos")}>
            Voltar
          </AdminButton>
          <AdminButton type="button" loading={pending} onClick={submit}>
            {isNew ? "Criar produto" : "Salvar alterações"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
