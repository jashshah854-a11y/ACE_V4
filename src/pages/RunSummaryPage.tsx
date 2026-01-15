/**
 * Run Summary Page
 * 
 * Main page component for Run Overview.
 * Orchestrates layout and renders RunSummaryViewModel.
 * 
 * NO BACKEND LOGIC — Only consumes RunSummaryViewModel.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { RunHeader } from '@/components/run-summary/RunHeader';
import { ExecutiveSummaryCard } from '@/components/run-summary/ExecutiveSummaryCard';
import { KpiRow } from '@/components/run-summary/KpiRow';
import { AccordionGroup } from '@/components/run-summary/AccordionGroup';
import { NextStepCard } from '@/components/run-summary/NextStepCard';
import { mapToRunSummaryViewModel } from '@/lib/runSummaryMapper';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch raw backend data
 */
async function fetchRunData(runId: string) {
    const response = await fetch(`${API_BASE}/run/${runId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch run: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Run Summary Page Component
 */
export default function RunSummaryPage() {
    const { runId } = useParams<{ runId: string }>();

    // Fetch and map data
    const { data: rawData, isLoading, error } = useQuery({
        queryKey: ['run-summary', runId],
        queryFn: () => fetchRunData(runId!),
        enabled: !!runId,
    });

    // Map to view model
    const viewModel = rawData ? mapToRunSummaryViewModel(rawData) : null;

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading analysis...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !viewModel) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-foreground mb-2">
                        Failed to Load Report
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {error?.message || 'Unable to load run data'}
                    </p>
                </div>
            </div>
        );
    }

    // Main render
    return (
        <div className="min-h-screen bg-background">
            {/* Run Header (above the fold) */}
            <RunHeader viewModel={viewModel} />

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {/* Executive Summary (above the fold) */}
                <ExecutiveSummaryCard viewModel={viewModel} />

                {/* KPIs (above the fold) */}
                <KpiRow viewModel={viewModel} />

                {/* Divider */}
                <div className="border-t my-8" />

                {/* Details Accordions (below the fold) */}
                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                        Details and Diagnostics
                    </h2>
                    <AccordionGroup viewModel={viewModel} />
                </div>

                {/* Next Steps (below the fold) */}
                <NextStepCard viewModel={viewModel} />
            </main>
        </div>
    );
}
