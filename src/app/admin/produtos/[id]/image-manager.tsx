"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { AdminButton, Card, CardTitle } from "@/components/admin/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAcceptedImage, toWebp } from "@/lib/images/to-webp";
import { uuidv4 } from "@/lib/uuid";
import { addProductImagesAction, deleteProductImageAction, reorderProductImagesAction, updateProductImageAction } from "../actions";

type Img = { id: string; url: string; alt_text: string; color_name: string | null };

export function ImageManager({ productId, productName, images, colors }: { productId: string; productName: string; images: Img[]; colors: string[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [drag, setDrag] = useState(false);

  async function upload(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files).slice(0, 12);
    const bad = list.find((f) => !isAcceptedImage(f));
    if (bad) {
      setError(`“${bad.name}” não é uma imagem válida ou tem mais de 15 MB.`);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const paths: string[] = [];
    try {
      for (const [i, file] of list.entries()) {
        setUploading(`Enviando ${i + 1} de ${list.length}…`);
        const blob = await toWebp(file);
        const path = `products/${productId}/${uuidv4()}.webp`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
        if (upErr) throw new Error(upErr.message);
        paths.push(path);
      }
      const r = await addProductImagesAction(productId, paths, productName);
      if (!r.ok) throw new Error(r.error);
    } catch (e) {
      // Desfaz uploads órfãos se algo falhou no meio.
      if (paths.length) await supabase.storage.from("product-images").remove(paths);
      setError(`Não foi possível enviar: ${(e as Error).message}`);
    } finally {
      setUploading(null);
      if (input.current) input.current.value = "";
    }
  }

  function move(index: number, dir: -1 | 1) {
    const ids = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    start(async () => {
      const r = await reorderProductImagesAction(productId, ids);
      if (!r.ok) setError(r.error);
    });
  }

  function update(img: Img, patch: Partial<Img>) {
    start(async () => {
      const r = await updateProductImageAction({ id: img.id, alt_text: patch.alt_text ?? img.alt_text, color_name: patch.color_name !== undefined ? patch.color_name : img.color_name });
      if (!r.ok) setError(r.error);
    });
  }

  function remove(img: Img) {
    if (!window.confirm("Remover esta foto?")) return;
    start(async () => {
      const r = await deleteProductImageAction(img.id);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <Card>
      <CardTitle action={pending && <span className="text-xs text-amora-900/50">Salvando…</span>}>Fotos</CardTitle>

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
        disabled={Boolean(uploading)}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          drag ? "border-amora-700 bg-amora-100/40" : "border-amora-900/20 hover:border-amora-700/60 hover:bg-amora-100/20"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-amora-700" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-semibold text-amora-950">{uploading ?? "Clique ou arraste fotos aqui"}</span>
        <span className="text-xs text-amora-900/55">JPG, PNG ou WebP até 15 MB. Reduzimos automaticamente para carregar rápido.</span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />

      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}

      {images.length > 0 && (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {images.map((img, i) => (
            <li key={img.id} className="flex gap-3 rounded-xl border border-amora-900/10 p-2">
              <span className="relative h-28 w-22 shrink-0 overflow-hidden rounded-lg bg-amora-100/40">
                <Image src={img.url} alt={img.alt_text} fill sizes="88px" className="object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-amora-800 px-2 py-0.5 text-[10px] font-semibold text-creme-50">Capa</span>}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-amora-900/60">Cor da foto</span>
                  <select
                    defaultValue={img.color_name ?? ""}
                    onChange={(e) => update(img, { color_name: e.target.value || null })}
                    className="min-h-8 rounded-lg border border-amora-900/15 px-2"
                  >
                    <option value="">Todas / geral</option>
                    {colors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-amora-900/60">Descrição (acessibilidade)</span>
                  <input defaultValue={img.alt_text} maxLength={200} onBlur={(e) => e.target.value !== img.alt_text && update(img, { alt_text: e.target.value })} className="min-h-8 rounded-lg border border-amora-900/15 px-2" />
                </label>
                <div className="mt-auto flex flex-wrap gap-1">
                  <AdminButton type="button" variant="ghost" className="min-h-8 px-2" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Mover para a esquerda">
                    ←
                  </AdminButton>
                  <AdminButton type="button" variant="ghost" className="min-h-8 px-2" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label="Mover para a direita">
                    →
                  </AdminButton>
                  <AdminButton type="button" variant="danger" className="ml-auto min-h-8 px-2" onClick={() => remove(img)}>
                    Remover
                  </AdminButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
