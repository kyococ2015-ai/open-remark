import { Skeleton } from "@/components/ui/skeleton";

export default function NewSiteLoading() {
  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
