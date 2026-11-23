"use client";

/** Reduz a imagem no navegador (lado maior até `maxSide`, WebP) antes do upload. */
export async function toWebp(file: File, maxSide = 1600, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao converter imagem"))), "image/webp", quality));
}

export const MAX_IMAGE_INPUT_BYTES = 15 * 1024 * 1024;
export const isAcceptedImage = (f: File) => f.type.startsWith("image/") && f.size <= MAX_IMAGE_INPUT_BYTES;
