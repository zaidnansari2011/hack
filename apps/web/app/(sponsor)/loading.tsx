export default function SponsorLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-rule/60" />
        <div className="h-8 w-72 animate-pulse rounded bg-rule/50" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-rule bg-surface"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-rule bg-surface" />
    </div>
  )
}
