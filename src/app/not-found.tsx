import Link from "next/link";
import { AmoraIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <AmoraIcon className="h-12 w-12 text-berry" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-creme-300">Erro 404</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-creme-50">Página não encontrada</h1>
      <p className="mt-3 max-w-sm text-sm text-creme-100/75">
        O endereço pode estar errado ou a página não existe mais.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses({ size: "lg" })}>
          Ir para a loja
        </Link>
        <Link href="/minha-conta" className={buttonClasses({ size: "lg", variant: "secondary" })}>
          Minha conta
        </Link>
      </div>
    </main>
  );
}
