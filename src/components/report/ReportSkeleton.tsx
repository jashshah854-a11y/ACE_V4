import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";

/**
 * Dark-mode skeleton loader matching actual report layout
 * Shows while report is being fetched/generated
 */
export function ReportSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Hero Metrics Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="h-4 bg-muted rounded w-24 shimmer" />
                                    <div className="h-4 w-4 bg-muted rounded-full shimmer" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-muted rounded w-20 shimmer" />
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Visualization Section Skeleton */}
            <Card>
                <CardHeader>
                    <div className="h-6 bg-muted rounded w-48 shimmer" />
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Gauge Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="border-muted">
                                <CardHeader className="pb-2">
                                    <div className="h-4 bg-muted rounded w-28 shimmer" />
                                </CardHeader>
                                <CardContent className="flex flex-col items-center py-6">
                                    {/* Circular gauge placeholder */}
                                    <div className="w-24 h-24 rounded-full border-4 border-muted shimmer" />
                                    <div className="h-3 bg-muted rounded w-32 mt-3 shimmer" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Persona Cards Skeleton */}
                    <div className="space-y-4">
                        <div className="h-5 bg-muted rounded w-40 shimmer" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="overflow-hidden">
                                    {/* Gradient header bar */}
                                    <div className="h-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 shimmer" />
                                    <CardHeader>
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-full bg-muted shimmer" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-5 bg-muted rounded w-3/4 shimmer" />
                                                <div className="h-4 bg-muted rounded w-full shimmer" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-4 bg-muted rounded w-20 shimmer" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Model Performance Skeleton */}
                    <Card className="border-muted">
                        <CardHeader>
                            <div className="h-5 bg-muted rounded w-48 shimmer" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col items-center">
                                    <div className="w-28 h-28 rounded-full border-4 border-muted shimmer" />
                                    <div className="h-6 bg-muted rounded w-24 mt-3 shimmer" />
                                </div>
                                <div className="space-y-3">
                                    <div className="h-4 bg-muted rounded w-32 shimmer" />
                                    <div className="h-4 bg-muted rounded w-full shimmer" />
                                    <div className="h-4 bg-muted rounded w-5/6 shimmer" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            {/* Detailed Analysis Accordion Skeleton */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="h-6 bg-muted rounded w-40 shimmer" />
                        <div className="h-4 w-4 bg-muted rounded shimmer" />
                    </div>
                </CardHeader>
            </Card>

            {/* Add shimmer animation via CSS */}
            <style jsx>{`
        @keyframes shimmer {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        .shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
