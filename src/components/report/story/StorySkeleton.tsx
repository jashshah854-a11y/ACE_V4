import { Sparkles } from "lucide-react";

export function StorySkeleton() {
    return (
        <div className="max-w-3xl mx-auto py-12 space-y-12 animate-pulse">
            {/* Header Skeleton */}
            <div className="space-y-6 text-center">
                <div className="h-4 w-32 bg-muted rounded mx-auto" />
                <div className="h-12 w-3/4 bg-muted rounded mx-auto" />
                <div className="h-6 w-1/2 bg-muted rounded mx-auto" />
            </div>

            {/* Metrics Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-muted/50 rounded-2xl border border-border/50" />
                ))}
            </div>

            {/* Content Skeleton */}
            <div className="space-y-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-4">
                        <div className="h-8 w-1/3 bg-muted rounded" />
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-muted/50 rounded" />
                            <div className="h-4 w-full bg-muted/50 rounded" />
                            <div className="h-4 w-2/3 bg-muted/50 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 font-mono text-sm animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                <span>ACE is crafting your story...</span>
            </div>
        </div>
    );
}
