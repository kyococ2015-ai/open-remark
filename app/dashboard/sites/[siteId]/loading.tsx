import { Skeleton } from "@/components/ui/skeleton";

export default function SiteOverviewLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
