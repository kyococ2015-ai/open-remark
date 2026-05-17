import { Skeleton } from "@/components/ui/skeleton"

export default function CommentsLoading() {
  return (
    <div className="flex h-full min-h-0">
      {/* Pages panel skeleton */}
      <div className="flex w-52 shrink-0 flex-col border-r bg-background">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex flex-col gap-0.5 p-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="min-w-0 flex-1 overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-52" />
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
