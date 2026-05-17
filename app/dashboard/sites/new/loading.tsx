import { Skeleton } from "@/components/ui/skeleton"

export default function NewSiteLoading() {
  return (
    <div className="flex max-w-xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}
