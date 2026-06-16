export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}
