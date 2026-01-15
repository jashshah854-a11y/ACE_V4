/**
 * Run Header Component
 * 
 * Displays run metadata, mode badge, trust signals, and dataset facts.
 * This is the first thing users see (above the fold).
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Copy, Database, Calendar } from 'lucide-react';
import type { RunSummaryViewModel } from '@/types/RunSummaryViewModel';

interface RunHeaderProps {
    viewModel: RunSummaryViewModel;
}

export function RunHeader({ viewModel }: RunHeaderProps) {
    const { run, trust, dataset } = viewModel;

    // Copy run ID to clipboard
    const copyRunId = () => {
        navigator.clipboard.writeText(run.id);
    };

    // Mode badge styling
    const modeBadgeVariant = {
        normal: 'default' as const,
        limitations: 'secondary' as const,
        failed: 'destructive' as const,
    }[run.mode];

    // Trust badge styling
    const trustBadgeVariant = {
        high: 'default' as const,
        moderate: 'secondary' as const,
        low: 'destructive' as const,
    }[trust.label];

    return (
        <header className="border-b bg-background pb-6">
            <div className="max-w-5xl mx-auto px-6">
                {/* Run Title and ID */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Analysis Report
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">{run.shortId}</span>
                            <button
                                onClick={copyRunId}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                title="Copy full run ID"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Mode Badge */}
                    <Badge variant={modeBadgeVariant} className="text-sm px-3 py-1">
                        {run.statusLabel}
                    </Badge>
                </div>

                {/* Trust and Dataset Facts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Trust Badge */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0">
                            <Badge variant={trustBadgeVariant}>
                                {Math.round(trust.score * 100)}%
                            </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                {trust.label.charAt(0).toUpperCase() + trust.label.slice(1)} Confidence
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {trust.guidance}
                            </p>
                        </div>
                    </div>

                    {/* Dataset Facts */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Database className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                {dataset.rows.toLocaleString()} records
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {dataset.columns} features analyzed
                            </p>
                        </div>
                    </div>

                    {/* Time Coverage */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                {dataset.timeCoverage === 'sufficient' ? 'Time data available' : 'No time data'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {dataset.typeLabel}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
