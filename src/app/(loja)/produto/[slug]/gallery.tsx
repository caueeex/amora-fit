"use client";

import { useState } from "react";
import { ProductImage } from "@/components/loja/product-image";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col gap-3 md:sticky md:top-40 md:self-start">
      <ProductImage
        src={current?.url}
        alt={current?.alt ?? name}
        sizes="(min-width: 768px) 50vw, 100vw"
        priority
        className="aspect-[4/5] rounded-[var(--radius-card)] border border-creme-300/10"
      />
      {images.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Fotos do produto">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
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
