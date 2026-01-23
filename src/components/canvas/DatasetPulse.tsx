import React from 'react';
import { Shield, AlertTriangle, Database, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatasetPulseProps {
    /** Run ID for display */
    runId: string;

    /** Dataset schema fields */
    schema: Array<{ name: string; type: string }>;

    /** Total number of rows */
    rowCount: number;

    /** Total number of columns */
    columnCount: number;

    /** Quality score (0-1 or 0-100) */
    qualityScore: number;

    /** Analysis status */
    status?: 'running' | 'completed' | 'failed';
}

/**
 * The Pulse — Dataset Identity & Quality Rail
 * 
 * Left panel (20%) providing the "Identity Rail" that anchors the user
 * with dataset context and real-time quality metrics.
 * 
 * **Components:**
 * - Dataset Identity Card: Schema, volume metrics, quality badge
 * - Mission Control Header: Run ID and status indicator
 */
export function DatasetPulse({
    runId,
    schema,
    rowCount,
    columnCount,
    qualityScore,
    status = 'completed',
}: DatasetPulseProps) {
    // Normalize quality score to 0-100 range
    const normalizedQuality = qualityScore > 1 ? qualityScore : qualityScore * 100;

    // Determine quality level
    const qualityLevel: 'high' | 'medium' | 'low' =
        normalizedQuality >= 80 ? 'high' :
            normalizedQuality >= 50 ? 'medium' : 'low';

    const qualityConfig = {
        high: {
            icon: CheckCircle2,
            label: 'High Quality',
            color: 'text-quality-high',
            bgColor: 'bg-quality-high/10',
            borderColor: 'border-quality-high',
        },
        medium: {
            icon: AlertTriangle,
            label: 'Medium Quality',
            color: 'text-quality-medium',
            bgColor: 'bg-quality-medium/10',
            borderColor: 'border-quality-medium',
        },
        low: {
            icon: XCircle,
            label: 'Low Quality',
            color: 'text-quality-low',
            bgColor: 'bg-quality-low/10',
            borderColor: 'border-quality-low',
        },
    };

    const config = qualityConfig[qualityLevel];
    const QualityIcon = config.icon;

    // Status indicator
    const statusConfig = {
        running: { color: 'bg-blue-500', label: 'Processing', pulse: true },
        completed: { color: 'bg-green-500', label: 'Complete', pulse: false },
        failed: { color: 'bg-red-500', label: 'Failed', pulse: false },
    };

    const statusInfo = statusConfig[status];

    return (
        <div className="flex flex-col h-full font-ui">
            {/* Mission Control Header */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className={cn(
                            "w-3 h-3 rounded-full",
                            statusInfo.color,
                            statusInfo.pulse && "animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        )}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 font-data uppercase tracking-widest mb-1">
                            MISSION CONTROL
                        </p>
                        <p
                            className="text-sm font-data text-white/90 truncate"
                            title={runId}
                        >
                            {runId}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-white/60" />
                    <span className="text-xs text-white/80">{statusInfo.label}</span>
                </div>
            </div>

            {/* Dataset Identity Card */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <h3 className="text-sm font-semibold text-white/90 mb-4 uppercase tracking-wide">
                        Dataset Identity
                    </h3>

                    {/* Volume Metrics */}
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/60">Rows</span>
                            <span className="font-data text-sm text-white font-semibold">
                                {rowCount.toLocaleString()}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/60">Columns</span>
                            <span className="font-data text-sm text-white font-semibold">
                                {columnCount}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/60">Quality Score</span>
                            <span className={cn("font-data text-sm font-semibold", config.color)}>
                                {normalizedQuality.toFixed(0)}%
                            </span>
                        </div>

                    </div>

                    {/* Quality Badge */}
                    <div className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border",
                        config.bgColor,
                        config.borderColor
                    )}>
                        <QualityIcon className={cn("w-4 h-4", config.color)} />
                        <span className={cn("text-sm font-semibold", config.color)}>
                            {config.label}
                        </span>
                    </div>
                </div>

                {/* Schema Preview */}
                {schema && schema.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-white/70 mb-3 uppercase tracking-wide flex items-center gap-2">
                            <Database className="w-3 h-3" />
                            Schema Fields
                        </h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {schema.slice(0, 10).map((field, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <span className="font-data text-white/80 truncate flex-1 mr-2">
                                        {field.name}
                                    </span>
                                    <span className="font-data text-white/50 text-[10px] uppercase">
                                        {field.type}
                                    </span>
                                </div>
                            ))}
                            {schema.length > 10 && (
                                <p className="text-xs text-white/50 text-center py-2">
                                    +{schema.length - 10} more fields
                                </p>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
                <p className="text-xs text-white/40 font-data text-center">
                    ACE V4.0.0 // NEURAL REFINERY
                </p>
            </div>
        </div>
    );
}
