type LogoProps = {
  /** "full": ícone + nome + "moda fitness"; "compact": ícone + nome em linha. */
  variant?: "full" | "compact";
  className?: string;
};

/** Ícone da amora (provisório até o arquivo oficial do logo ser enviado). */
export function AmoraIcon({ className }: { className?: string }) {
  const drupelets: [number, number][] = [
    [20, 16], [27, 16], [16.5, 22], [23.5, 22], [30.5, 22],
    [20, 28], [27, 28], [23.5, 33.5], [13, 27.5], [34, 27.5],
  ];
  return (
    <svg viewBox="0 0 48 44" className={className} aria-hidden="true" fill="currentColor">
      <path d="M26 10.5c2-5 7-8 13-7.5-1.5 5.5-6.5 8.5-13 7.5Z" opacity="0.9" />
      <path d="M23.5 11.5 25 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {drupelets.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.6" />
      ))}
    </svg>
  );
}

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "compact") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <AmoraIcon className="h-6 w-6 text-berry" />
        <span className="font-display text-2xl font-bold leading-none tracking-tight text-creme-300">
          Amora
        </span>
        <span className="sr-only">Amora Fit — moda fitness</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <AmoraIcon className="h-9 w-9 text-berry" />
      <span className="font-display text-5xl font-bold leading-none tracking-tight text-creme-300">
        Amora
      </span>
      <span className="mt-2 text-xs font-medium uppercase tracking-[0.3em] text-creme-200/90">
        Moda Fitness
      </span>
    </span>
  );
}
