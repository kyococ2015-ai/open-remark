import { Skeleton } from "@/components/ui/skeleton"

export default function UsersLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
