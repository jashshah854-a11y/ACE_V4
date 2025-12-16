import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "./ProgressRing";
import { ClusterMetric } from "@/lib/reportParser";
import { numberFormatter } from "@/lib/numberFormatter";
import { Layers, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ClusterGaugeSectionProps {
    data: ClusterMetric | null;
}

/**
 * Visual cluster metrics section with gauge cards
 * Replaces plain text table with radial progress rings
 */
export function ClusterGaugeSection({ data }: ClusterGaugeSectionProps) {
    if (!data) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No cluster data available</p>
            </div>
        );
    }

    const silhouettePercent = Math.round(data.silhouetteScore * 100);
    const qualityPercent = Math.round(data.dataQuality * 100);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Silhouette Score Gauge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
            >
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            {silhouettePercent >= 70 && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {silhouettePercent >= 50 && silhouettePercent < 70 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                            {silhouettePercent < 50 && <XCircle className="h-4 w-4 text-red-600" />}
                            Silhouette Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-6">
                        <ProgressRing
                            value={silhouettePercent}
                            size={100}
                            showValue={true}
                        />
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                            Cluster separation quality
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Data Quality Gauge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            {qualityPercent >= 80 && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {qualityPercent < 80 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                            Data Quality
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-6">
                        <ProgressRing
                            value={qualityPercent}
                            size={100}
                            showValue={true}
                        />
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                            Dataset completeness
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Clusters Found Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
            >
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Clusters Found
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-6">
                        <div className="text-6xl font-bold text-center">{data.k}</div>
                        <p className="text-sm text-muted-foreground text-center mt-2">
                            Behavioral segments
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
