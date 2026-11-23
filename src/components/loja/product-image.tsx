import Image from "next/image";
import { AmoraIcon } from "@/components/brand/logo";

/** Foto do produto, ou um placeholder elegante quando ainda não há foto. */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-amora-600 via-amora-700 to-amora-900 ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-creme-200/70">
          <AmoraIcon className="h-8 w-8 text-berry/70" />
          <span className="text-xs tracking-wide">foto em breve</span>
        </div>
      )}
    </div>
  );
}
