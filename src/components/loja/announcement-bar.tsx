import { getStoreSettings } from "@/lib/catalog/queries";

/** Faixa fina no topo do site com a promoção configurada no painel (store_settings). */
export async function AnnouncementBar() {
  const s = await getStoreSettings();
  if (!s.bannerActive || !(s.bannerTitle || s.bannerText)) return null;

  return (
    <div className="bg-creme-300 text-amora-900">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium leading-snug sm:text-[13px]">
        <svg viewBox="0 0 24 24" className="hidden h-4 w-4 shrink-0 sm:block" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3.5" y="9" width="17" height="11" rx="1.5" />
          <path d="M2.5 9h19V6.5h-19zM12 6.5V20M12 6.5c-1.5-3-5.5-3.5-5.5-1S9.5 6.5 12 6.5c2.5 0 5.5 1 5.5-1.5S13.5 3.5 12 6.5Z" strokeLinejoin="round" />
        </svg>
        <span>
          {s.bannerTitle && <strong className="font-bold">{s.bannerTitle}: </strong>}
          {s.bannerText}
        </span>
      </p>
    </div>
  );
}
