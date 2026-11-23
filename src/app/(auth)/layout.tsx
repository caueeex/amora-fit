import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex flex-1 flex-col items-center px-5 pb-16 pt-10 sm:justify-center sm:pt-16">
      {/* brilho suave de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_60%_at_50%_0%,rgb(255_236_158/0.10),transparent)]"
      />
      <Link href="/" className="relative mb-8 rounded-lg" aria-label="Amora Fit — página inicial">
        <Logo />
      </Link>
      <div className="relative w-full max-w-md rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/50 p-6 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
