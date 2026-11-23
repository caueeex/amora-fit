export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-hidden="true">
      <div className="h-7 w-40 rounded-lg bg-creme-300/10" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-4 w-24 rounded bg-creme-300/10" />
          <div className="h-12 rounded-xl bg-creme-300/10" />
        </div>
      ))}
      <div className="h-12 rounded-full bg-creme-300/15" />
    </div>
  );
}
