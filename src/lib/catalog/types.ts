import type { Cents } from "@/lib/domain/money";

export const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "U"] as const;
export type Size = (typeof SIZE_ORDER)[number];

export type CatalogVariant = {
  id: string;
  colorName: string;
  colorHex: string;
  size: string;
  available: number;
};

export type CatalogColor = { name: string; hex: string; available: number };

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categorySlug: string | null;
  categoryName: string | null;
  priceCents: Cents;
  promoPriceCents: Cents | null;
  /** Preço efetivo exibido (promoção, se houver). O servidor recalcula no pedido. */
  effectivePriceCents: Cents;
  isNew: boolean;
  isFeatured: boolean;
  createdAt: string;
  images: { url: string; alt: string }[];
  variants: CatalogVariant[];
  colors: CatalogColor[];
  sizes: string[];
  totalAvailable: number;
};

export type Category = { id: string; slug: string; name: string };

export type StoreSettings = {
  storeName: string;
  tagline: string;
  whatsappPhone: string;
  contactEmail: string | null;
  contactPhone: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  bannerActive: boolean;
  bannerTitle: string;
  bannerText: string;
  bannerImageUrl: string | null;
  logoUrl: string | null;
  aboutText: string;
  shippingPolicyText: string;
  whatsappOrderGreeting: string;
  whatsappOrderClosing: string;
};
