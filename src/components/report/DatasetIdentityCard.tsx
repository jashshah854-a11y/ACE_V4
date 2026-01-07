import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface DatasetIdentityCardProps {
    rowCount: number;
    columnCount: number;
    qualityScore: 'high' | 'medium' | 'low';
    typeErrors: number;
    safeMode: boolean;
}

export default function DatasetIdentityCard({
    rowCount,
    columnCount,
    qualityScore,
    typeErrors,
    safeMode
}: DatasetIdentityCardProps) {
    const qualityConfig = {
        high: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30', label: 'High Quality' },
        medium: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Medium Quality' },
        low: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', label: 'Low Quality' }
    };

    const config = qualityConfig[qualityScore];
    const QualityIcon = config.icon;

    return (
        <Card className="p-4 border-2">
            <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Dataset Identity Card
                </h3>
                <Badge variant={qualityScore === 'high' ? 'default' : qualityScore === 'medium' ? 'secondary' : 'destructive'}>
                    {config.label}
                </Badge>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rows</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {rowCount.toLocaleString()}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Columns</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {columnCount}
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Quality Score</span>
                    <div className="flex items-center gap-1.5">
                        <QualityIcon className={`w-4 h-4 ${config.color}`} />
                        <span className={`font-semibold ${config.color}`}>
                            {config.label}
                        </span>
                    </div>
                </div>

                {typeErrors > 0 && (
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type Errors</span>
                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                            {typeErrors}
                        </span>
                    </div>
                )}
            </div>

            {safeMode && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                                Safe Mode Active
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                Data type confusion detected. Predictive modeling paused to prevent calculation errors. Displaying descriptive stats only.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
