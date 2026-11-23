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

const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Envia vídeo (MP4/WebM até 50 MB) ao bucket store-videos. Retorna o caminho. */
export async function uploadStoreVideo(file: File): Promise<string> {
  const ext = VIDEO_TYPES[file.type];
  if (!ext) throw new Error("Use um vídeo MP4 ou WebM. (Vídeos .MOV do iPhone: exporte como MP4.)");
  if (file.size > MAX_VIDEO_BYTES) throw new Error(`Vídeo muito grande (${(file.size / 1048576).toFixed(0)} MB). O limite é 50 MB — prefira vídeos curtos (10–20 s).`);
  const path = `videos/${uuidv4()}.${ext}`;
  const { error } = await getSupabaseBrowserClient().storage.from("store-videos").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return path;
}
