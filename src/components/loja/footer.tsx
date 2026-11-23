import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCategories, getStoreSettings } from "@/lib/catalog/queries";
import { formatBrazilianPhone } from "@/lib/domain/phone";

export async function StoreFooter() {
  const [settings, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  const wa = `https://wa.me/${settings.whatsappPhone}`;

  return (
    <footer className="mt-20 bg-creme-300 text-amora-900/85">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col items-start gap-3">
          <Logo variant="compact" tone="light" src={settings.logoUrl} alt={settings.storeName} />
          {settings.tagline && <p className="text-sm">{settings.tagline}</p>}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amora-700">Categorias</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/produtos?categoria=${c.slug}`} className="transition-colors hover:text-amora-600 hover:underline underline-offset-4">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amora-700">Atendimento</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-amora-600 hover:underline underline-offset-4">
                WhatsApp {formatBrazilianPhone(settings.whatsappPhone)}
              </a>
            </li>
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="transition-colors hover:text-amora-600 hover:underline underline-offset-4">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.instagramUrl && (
              <li>
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-amora-600 hover:underline underline-offset-4">
                  Instagram
                </a>
              </li>
            )}
            {settings.tiktokUrl && (
              <li>
                <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-amora-600 hover:underline underline-offset-4">
                  TikTok
                </a>
              </li>
            )}
            <li>
              <Link href="/minha-conta" className="transition-colors hover:text-amora-600 hover:underline underline-offset-4">
                Minha conta
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amora-700">Entrega e pagamento</h2>
          <p className="text-sm leading-relaxed">
            {settings.shippingPolicyText || "Frete e pagamento combinados pelo WhatsApp após o pedido."}
          </p>
        </div>
      </div>
      <div className="border-t border-amora-800/15 bg-amora-900/[0.05] px-5 py-5 text-center text-xs text-amora-900/70">
        © {settings.storeName}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
