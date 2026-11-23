import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Amora Fit — Moda Fitness",
    template: "%s · Amora Fit",
  },
  description: "Peças fitness femininas que te valorizam em movimento.",
};

export const viewport: Viewport = {
  themeColor: "#560832",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col overflow-x-clip">{children}</body>
    </html>
  );
}
