import { cn } from "@/lib/utils";
import "./intelligence-canvas.css";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { NeuralSpine, AgentExecution } from "./NeuralSpine";
import { NarrativeStream } from "./NarrativeStream";
import { EvidenceLab, EvidenceObject } from "./EvidenceLab";
import { getReport, getRunState } from "@/lib/api-client";

interface IntelligenceCanvasProps {
    runId: string;
    className?: string;
}

/**
 * Intelligence Canvas - The Cognitive Operating System
 * 
 * Replaces passive report viewing with active intelligence exploration.
 * Uses Triptych Layout: Neural Spine | Narrative Stream | Evidence Lab
 * 
 * Phase 2: Operation Intelligence Canvas
 */
export function IntelligenceCanvas({ runId, className }: IntelligenceCanvasProps) {
    const [activeClaimId, setActiveClaimId] = useState<string | null>(null);

    // Fetch report content
    const { data: reportContent, isLoading: reportLoading } = useQuery({
        queryKey: ['report', runId],
        queryFn: () => getReport(runId),
        enabled: Boolean(runId),
    });

    // Fetch pipeline state for agent timeline
    const { data: pipelineState } = useQuery({
        queryKey: ['state', runId],
        queryFn: () => getRunStatus(runId),
        enabled: Boolean(runId),
        refetchInterval: 5000, // Poll every 5s
    });

    // Transform pipeline state to agent executions
    const agents: AgentExecution[] = useMemo(() => {
        if (!pipelineState) return [];

        const steps = pipelineState.steps || [];
        return steps.map((step: any) => ({
            name: step.name || step.agent || "unknown",
            status: step.status || "pending",
            duration: step.duration,
            confidence: step.confidence,
            insights_count: step.insights_count,
        }));
    }, [pipelineState]);

    // Mock evidence for active claim (will be replaced with real extraction)
    const activeEvidence: EvidenceObject | null = useMemo(() => {
        if (!activeClaimId) return null;

        // Mock evidence - will be replaced with real evidence extraction from analytics
        return {
            claim: "Customer churn rate is 25%",
            confidence: 0.87,
            evidence: {
                metric: "churn_rate",
                value: 0.25,
                sample_size: 1024,
                source_columns: ["customer_id", "last_active_date"],
                methodology: "cohort_analysis",
                timestamp: new Date().toISOString(),
            },
            severity: "warning",
        };
    }, [activeClaimId]);

    if (reportLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-void">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-neural-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted font-mono">Loading Intelligence Canvas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("intelligence-canvas", className)}>
            {/* Triptych Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_400px] min-h-screen">

                {/* LEFT PANEL: Neural Spine */}
                <NeuralSpine
                    agents={agents}
                    onAgentClick={(agentName) => {
                        console.log("Agent clicked:", agentName);
                        // Future: Scroll to agent's section in narrative
                    }}
                />

                {/* CENTER PANEL: Narrative Stream */}
                <NarrativeStream
                    content={reportContent || "# Loading...\n\nPlease wait while we load the analysis report."}
                    onClaimClick={setActiveClaimId}
                />

                {/* RIGHT PANEL: Evidence Lab */}
                <EvidenceLab
                    activeEvidence={activeEvidence}
                />
            </div>
        </div>
    );
}
