export default function StudentLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded bg-rule/60" />
        <div className="h-7 w-24 animate-pulse rounded-full bg-rule/40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl border border-rule bg-surface"
          />
        ))}
      </div>
    </div>
  )
}
