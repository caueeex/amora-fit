import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCategories, getStoreSettings } from "@/lib/catalog/queries";
import { formatBrazilianPhone } from "@/lib/domain/phone";

export async function StoreFooter() {
  const [settings, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  const wa = `https://wa.me/${settings.whatsappPhone}`;

  return (
    <footer className="mt-16 bg-tinta text-creme-100/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col items-start gap-3">
          <Logo variant="compact" />
          {settings.tagline && <p className="text-sm">{settings.tagline}</p>}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-creme-300">Categorias</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/produtos?categoria=${c.slug}`} className="hover:text-creme-300">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-creme-300">Atendimento</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-creme-300">
                WhatsApp {formatBrazilianPhone(settings.whatsappPhone)}
              </a>
            </li>
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-creme-300">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.instagramUrl && (
              <li>
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-creme-300">
                  Instagram
                </a>
              </li>
            )}
            {settings.tiktokUrl && (
              <li>
                <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="hover:text-creme-300">
                  TikTok
                </a>
              </li>
            )}
            <li>
              <Link href="/minha-conta" className="hover:text-creme-300">
                Minha conta
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-creme-300">Entrega e pagamento</h2>
          <p className="text-sm leading-relaxed">
            {settings.shippingPolicyText || "Frete e pagamento combinados pelo WhatsApp após o pedido."}
          </p>
        </div>
      </div>
      <div className="border-t border-creme-300/10 px-5 py-5 text-center text-xs text-creme-100/50">
        © {settings.storeName}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
