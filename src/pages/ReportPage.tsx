import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { ResponsiveThreePanelCanvas } from '@/components/canvas/ThreePanelCanvas';
import { DatasetPulse } from '@/components/canvas/DatasetPulse';
import { NarrativeStream } from '@/components/canvas/NarrativeStream';
import { EvidenceLab } from '@/components/canvas/EvidenceLab';
import { useQuery } from '@tanstack/react-query';
import { extractEvidenceObjects } from '@/lib/reportParser';
import type { EnhancedAnalyticsData } from '@/lib/enhancedAnalyticsTypes';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ReportResponse {
    run_id: string;
    status: 'running' | 'completed' | 'failed';
    report_content: string;
    quality_score: number;
    row_count: number;
    column_count: number;
    schema: Array<{ name: string; type: string }>;
    enhanced_analytics?: EnhancedAnalyticsData;
    task_contract?: {
        allowed_sections: string[];
        blocked_agents: string[];
    };
}

/**
 * Fetch report data from backend
 */
async function fetchReport(runId: string): Promise<ReportResponse> {
    const response = await fetch(`${API_BASE}/run/${runId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
    }

    const data = await response.json();

    // Fetch enhanced analytics separately
    let enhancedAnalytics: EnhancedAnalyticsData | undefined;
    try {
        const analyticsResponse = await fetch(`${API_BASE}/run/${runId}/artifact/enhanced_analytics`);
        if (analyticsResponse.ok) {
            enhancedAnalytics = await analyticsResponse.json();
        }
    } catch (error) {
        console.warn('Enhanced analytics not available:', error);
    }

    return {
        run_id: data.run_id || runId,
        status: data.status || 'completed',
        report_content: data.report_content || data.markdown || '',
        quality_score: data.quality_score || data.data_quality || 1.0,
        row_count: data.row_count || data.rows || 0,
        column_count: data.column_count || data.columns || 0,
        schema: data.schema || [],
        enhanced_analytics: enhancedAnalytics,
        task_contract: data.task_contract || {
            allowed_sections: [],
            blocked_agents: [],
        },
    };
}

/**
 * ReportPage — Global Unification
 * 
 * Integrates all three panels with cross-panel state management:
 * - Left (20%): DatasetPulse — Identity & Quality
 * - Center (50%): NarrativeStream — SCQA Storytelling
 * - Right (30%): EvidenceLab — Code Proofs & Lineage
 */
export default function ReportPage() {
    const { runId } = useParams<{ runId: string }>();

    // Global state for cross-panel communication
    const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
    const [isEvidenceRailOpen, setIsEvidenceRailOpen] = useState(true);

    // Fetch report data
    const { data, isLoading, error } = useQuery({
        queryKey: ['report', runId],
        queryFn: () => fetchReport(runId!),
        enabled: !!runId,
        refetchInterval: (data) => {
            // Auto-refresh every 5s if status is running
            return data?.status === 'running' ? 5000 : false;
        },
    });

    // Error state: No run ID
    if (!runId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                    <p className="text-muted-foreground">Run ID not provided</p>
                </div>
            </div>
        );
    }

    // Loading state with Neural Pulse aesthetic
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-lab-bg">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-lab-accent animate-spin mx-auto mb-4" />
                    <p className="font-data text-sm text-lab-text">
                        Loading Intelligence Report...
                    </p>
                    <p className="font-data text-xs text-lab-text/60 mt-2">
                        Run ID: {runId}
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !data) {
        return (
            <div className="h-screen flex items-center justify-center bg-lab-bg">
                <div className="text-center max-w-md">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl text-white font-data mb-2">SIGNAL LOST</h1>
                    <p className="text-lab-text/60 text-sm">
                        {error?.message || "Report unavailable"}
                    </p>
                    <p className="text-lab-text/40 text-xs mt-4">
                        Run ID: {runId}
                    </p>
                </div>
            </div>
        );
    }

    // Extract evidence objects from enhanced analytics
    const evidenceObjects = extractEvidenceObjects(
        data.report_content,
        data.enhanced_analytics
    );

    // Click-to-verify handler
    const handleClaimClick = (evidenceId: string, type: string) => {
        console.log(`[Click-to-Verify] User clicked claim: ${evidenceId} (${type})`);
        setActiveEvidenceId(evidenceId);
        setIsEvidenceRailOpen(true);
    };

    return (
        <ResponsiveThreePanelCanvas
            defaultMobileTab="narrative"
            pulsePanel={
                <DatasetPulse
                    runId={runId}
                    schema={data.schema}
                    rowCount={data.row_count}
                    columnCount={data.column_count}
                    qualityScore={data.quality_score}
                    status={data.status}
                />
            }
            narrativePanel={
                <NarrativeStream
                    content={data.report_content}
                    taskContract={data.task_contract}
                    onClaimClick={handleClaimClick}
                />
            }
            labPanel={
                <EvidenceLab
                    evidence={evidenceObjects}
                    activeEvidenceId={activeEvidenceId}
                    onEvidenceClick={(id) => setActiveEvidenceId(id)}
                    showReasoningStream={data.status === 'running'}
                />
            }
        />
    );
}
