"use client";

import { useRef, useState, useTransition } from "react";
import { AdminButton } from "@/components/admin/ui";
import type { AdminCategory } from "@/lib/admin/home";
import { uploadStoreAsset } from "@/lib/images/upload-asset";
import { deleteCategoryAction, moveCategoryAction, saveCategoryAction } from "./actions";

function CategoryRow({ c, index, total }: { c: AdminCategory; index: number; total: number }) {
  const [name, setName] = useState(c.name);
  const [active, setActive] = useState(c.is_active);
  const [imagePath, setImagePath] = useState(c.image_path);
  const [preview, setPreview] = useState(c.image_url);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const dirty = name !== c.name || active !== c.is_active || imagePath !== c.image_path;

  async function pick(f: File) {
    setUploading(true);
    setMsg(null);
    try {
      const path = await uploadStoreAsset("categories", f, 600);
      setImagePath(path);
      setPreview(URL.createObjectURL(f));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  const save = () =>
    start(async () => {
      const r = await saveCategoryAction({ id: c.id, name, is_active: active, image_path: imagePath });
      setMsg(r.ok ? { ok: true, text: "Salvo." } : { ok: false, text: r.error });
    });

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-amora-900/10 bg-white p-3">
      <button type="button" onClick={() => file.current?.click()} className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-amora-700 text-[10px] text-creme-100/80 ring-2 ring-transparent hover:ring-amora-700" aria-label={`Trocar foto de ${c.name}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou Storage
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : uploading ? (
          "enviando…"
        ) : (
          "+ foto"
        )}
      </button>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      <div className="min-w-0 flex-1">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Nome da categoria" className="min-h-9 w-full max-w-xs rounded-lg border border-amora-900/15 px-2 text-sm font-semibold" />
        <p className="mt-1 text-xs text-amora-900/55">
          /produtos?categoria={c.slug} · {c.products} produto(s)
          {preview && (
            <button type="button" className="ml-2 text-red-700 hover:underline" onClick={() => (setImagePath(null), setPreview(null))}>
              remover foto
            </button>
          )}
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs text-amora-900/70">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-amora-800" />
        Ativa
      </label>
      <div className="flex items-center gap-1">
        <AdminButton variant="ghost" className="min-h-9 px-2" disabled={pending || index === 0} onClick={() => start(async () => void (await moveCategoryAction(c.id, -1)))} aria-label="Subir">
          ↑
        </AdminButton>
        <AdminButton variant="ghost" className="min-h-9 px-2" disabled={pending || index === total - 1} onClick={() => start(async () => void (await moveCategoryAction(c.id, 1)))} aria-label="Descer">
          ↓
        </AdminButton>
        <AdminButton className="min-h-9" disabled={!dirty || uploading} loading={pending} onClick={save}>
          Salvar
        </AdminButton>
        <AdminButton
          variant="ghost"
          className="min-h-9 px-2 text-red-700"
          disabled={pending}
          aria-label="Excluir categoria"
          onClick={() =>
            window.confirm(`Excluir a categoria ${c.name}?`) &&
            start(async () => {
              const r = await deleteCategoryAction(c.id);
              if (!r.ok) setMsg({ ok: false, text: r.error });
            })
          }
        >
          ✕
        </AdminButton>
      </div>
      {msg && <p className={`w-full text-xs ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>{msg.text}</p>}
    </li>
  );
}

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-amora-900/65">
        A foto aparece no círculo da categoria na página inicial (use uma imagem quadrada). Sem foto, a loja usa a foto de um produto da categoria ou um ícone.
      </p>
      <ul className="flex flex-col gap-2">
        {categories.map((c, i) => (
          <CategoryRow key={`${c.id}-${c.position}-${c.image_path}`} c={c} index={i} total={categories.length} />
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-amora-900/20 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await saveCategoryAction({ name, is_active: true, image_path: null });
            if (r.ok) setName("");
            else setError(r.error);
          });
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nova categoria (ex.: Bodies)" aria-label="Nome da nova categoria" className="min-h-10 flex-1 rounded-xl border border-amora-900/15 px-3 text-sm" />
        <AdminButton type="submit" loading={pending} disabled={name.trim().length < 2}>
          Adicionar categoria
        </AdminButton>
        {error && <p className="w-full text-xs text-red-800">{error}</p>}
      </form>
    </div>
  );
}
