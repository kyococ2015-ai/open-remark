import { Skeleton } from "@/components/ui/skeleton";

export default function InstallLoading() {
  return (
    <div className="p-6 flex flex-col gap-10 max-w-3xl">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <Skeleton className="h-32 w-full ml-12" />
        </div>
      ))}
    </div>
  );
}
