import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
        </Card>
        <Card className="border-border bg-card p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
        </Card>
      </div>
      <Card className="border-border bg-card p-6">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  );
}
