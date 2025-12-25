import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { numberFormatter } from "@/lib/numberFormatter";

interface AnomalyBannerProps {
    count: number;
    totalRecords?: number;
    topDrivers?: string[];
    onReview?: () => void;
    className?: string;
}

/**
 * Prominent amber warning banner for anomaly detection
 * Surfaces critical issues without harsh red styling
 */
export function AnomalyBanner({
    count,
    totalRecords,
    topDrivers = [],
    onReview,
    className
}: AnomalyBannerProps) {
    if (count === 0) {
        return (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <AlertTriangle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 dark:text-green-100">
                    No Anomalies Detected
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                    All data points follow expected patterns.
                </AlertDescription>
            </Alert>
        );
    }

    const percentage = totalRecords
        ? numberFormatter.decimal((count / totalRecords) * 100, 1)
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={className}
        >
            <Alert className="border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                <AlertTriangle className="h-5 w-5 text-orange-600" />

                <div className="flex-1">
                    <AlertTitle className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                        Anomalies Detected
                    </AlertTitle>

                    <AlertDescription className="space-y-3">
                        {/* Count Display */}
                        <div className="flex items-center gap-3">
                            <Badge
                                variant="destructive"
                                className="text-lg font-bold px-3 py-1 bg-orange-600"
                            >
                                {numberFormatter.integer(count)}
                            </Badge>
                            {percentage && (
                                <span className="text-sm text-orange-700 dark:text-orange-300">
                                    {percentage}% of dataset
                                </span>
                            )}
                        </div>

                        {/* Top Drivers */}
                        {topDrivers.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                                    Top Drivers:
                                </p>
                                <ul className="space-y-1">
                                    {topDrivers.slice(0, 3).map((driver, idx) => (
                                        <li
                                            key={idx}
                                            className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2"
                                        >
                                            <div className="h-1.5 w-1.5 rounded-full bg-orange-600" />
                                            {driver}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action Button */}
                        {onReview && (
                            <Button
                                onClick={onReview}
                                variant="default"
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 mt-2"
                            >
                                Review Issues
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </AlertDescription>
                </div>
            </Alert>
        </motion.div>
    );
}
