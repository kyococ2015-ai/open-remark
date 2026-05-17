import { Skeleton } from "@/components/ui/skeleton"

export default function InstallLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-10 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <Skeleton className="ml-12 h-32 w-full" />
        </div>
      ))}
    </div>
  )
}
