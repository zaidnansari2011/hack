export default function CredentialsLoading() {
  return (
    <div className="mx-auto w-[min(1100px,94vw)] py-10">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-20 animate-pulse rounded bg-rule/60" />
        <div className="h-3 w-32 animate-pulse rounded-full bg-rule/40" />
      </div>
      <div className="mt-8 space-y-6">
        <div className="h-8 w-72 animate-pulse rounded bg-rule/60" />
        <div className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-paper" />
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md border border-rule bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
