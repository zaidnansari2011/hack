export default function VerifyLoading() {
  return (
    <div className="mx-auto w-[min(960px,92vw)] py-10">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-20 animate-pulse rounded bg-rule/60" />
        <div className="h-3 w-44 animate-pulse rounded-full bg-rule/40" />
      </div>
      <div className="mt-8 space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-rule/60" />
        <div className="h-32 w-full animate-pulse rounded-md bg-rule/40" />
        <div className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-paper" />
          ))}
        </div>
      </div>
    </div>
  )
}
