import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
