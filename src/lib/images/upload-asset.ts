"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { uuidv4 } from "@/lib/uuid";
import { isAcceptedImage, toWebp } from "./to-webp";

/** Envia imagem da loja (banners/categorias) ao bucket store-assets, já reduzida. Retorna o caminho. */
export async function uploadStoreAsset(folder: "banners" | "categories", file: File, maxSide = 2000): Promise<string> {
  if (!isAcceptedImage(file)) throw new Error("Use uma imagem JPG, PNG ou WebP de até 15 MB.");
  const blob = await toWebp(file, maxSide);
  const path = `${folder}/${uuidv4()}.webp`;
  const { error } = await getSupabaseBrowserClient().storage.from("store-assets").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return path;
}
