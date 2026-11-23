"use client";

import { useState } from "react";
import { ProductImage } from "@/components/loja/product-image";
import { foldText } from "@/lib/catalog/filters";
import { useProductColor } from "./product-color";

/**
 * Galeria do produto. Ao trocar a cor no painel de compra, mostra a foto daquela cor
 * (identificada pelo texto alternativo da imagem). Clicar numa miniatura vale até
 * a próxima troca de cor.
 */
export function Gallery({ images, name }: { images: { url: string; alt: string; color?: string | null }[]; name: string }) {
  const { color } = useProductColor();
  const [manual, setManual] = useState<{ index: number; color: string } | null>(null);

  // 1º: cor definida no painel; 2º: "cor <nome>" no texto alternativo (evita confundir a cor "Amora" com o nome do produto).
  const byTag = images.findIndex((img) => color && img.color && foldText(img.color) === foldText(color));
  // Prefere "cor <nome>" no texto alternativo (evita confundir a cor "Amora" com o nome do produto).
  const byPhrase = images.findIndex((img) => color && foldText(img.alt).includes(foldText(`cor ${color}`)));
  const colorIndex = byTag >= 0 ? byTag : byPhrase >= 0 ? byPhrase : images.findIndex((img) => color && foldText(img.alt).includes(foldText(color)));
  const active = manual && manual.color === color ? manual.index : colorIndex >= 0 ? colorIndex : 0;
  const current = images[active];

  return (
    <div className="flex flex-col gap-3 md:sticky md:top-40 md:self-start">
      <ProductImage
        key={current?.url ?? "vazio"}
        src={current?.url}
        alt={current?.alt ?? name}
        sizes="(min-width: 768px) 50vw, 100vw"
        priority
        className="aspect-[4/5] animate-[subir_250ms_var(--ease-suave)] rounded-[var(--radius-card)] border border-creme-300/10"
      />
      {images.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Fotos do produto">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setManual({ index: i, color })}
                aria-label={`Ver foto ${i + 1} de ${images.length}`}
                aria-current={i === active}
                className={`block overflow-hidden rounded-xl border-2 transition-colors ${
                  i === active ? "border-creme-300" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <ProductImage src={img.url} alt="" sizes="80px" className="h-20 w-16" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
