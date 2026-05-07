import { Skeleton } from "@/components/ui/skeleton";

export default function CommentsLoading() {
  return (
    <div className="flex h-full min-h-0">
      {/* Pages panel skeleton */}
      <div className="border-r flex flex-col w-52 shrink-0 bg-background">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="p-1.5 flex flex-col gap-0.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-16" />
            ))}
          </div>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
