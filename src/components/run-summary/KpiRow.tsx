/**
 * KPI Row Component
 * 
 * Displays 3-4 KPI cards in a responsive grid.
 */

import React from 'react';
import { KpiCard } from './KpiCard';
import type { RunSummaryViewModel } from '@/types/RunSummaryViewModel';

interface KpiRowProps {
    viewModel: RunSummaryViewModel;
}

export function KpiRow({ viewModel }: KpiRowProps) {
    const { kpis } = viewModel;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
                <KpiCard key={kpi.key} kpi={kpi} />
            ))}
        </div>
    );
}
