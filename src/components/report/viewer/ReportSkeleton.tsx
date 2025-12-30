import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ReportSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <Skeleton className="h-9 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Metrics Strip Skeleton */}
            <div className="grid gap-3 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-3 border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <Skeleton className="h-3 w-20 bg-slate-100 dark:bg-slate-800" />
                            <Skeleton className="h-4 w-8 rounded-full bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <Skeleton className="h-8 w-16 mb-2 bg-slate-200 dark:bg-slate-700" />
                        <Skeleton className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                    </Card>
                ))}
            </div>

            {/* Hero Cards Skeleton */}
            <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" />
                <Skeleton className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" />
            </div>

            {/* Narrative Skeleton */}
            <div className="grid gap-3 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800" />
                ))}
            </div>

            {/* Large Content Area Skeleton */}
            <Skeleton className="h-[500px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
        </div>
    );
}
