/**
 * KPI Card Component
 * 
 * Displays a single KPI with label, value, status, and meaning.
 * Max 6 lines per card.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KPI } from '@/types/RunSummaryViewModel';

interface KpiCardProps {
    kpi: KPI;
}

export function KpiCard({ kpi }: KpiCardProps) {
    // Status badge styling
    const statusVariant = {
        good: 'default' as const,
        warning: 'secondary' as const,
        bad: 'destructive' as const,
    }[kpi.status];

    return (
        <Card>
            <CardContent className="pt-6">
                {/* Label */}
                <p className="text-sm font-medium text-muted-foreground mb-2">
                    {kpi.label}
                </p>

                {/* Value + Status Badge */}
                <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-foreground">
                        {kpi.value}
                    </span>
                    <Badge variant={statusVariant} className="text-xs">
                        {kpi.status}
                    </Badge>
                </div>

                {/* Meaning */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {kpi.meaning}
                </p>
            </CardContent>
        </Card>
    );
}
