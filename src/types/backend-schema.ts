/**
 * Strongly typed interface for the ACE backend run output.
 * Mirrors the structure expected by the frontend transfomers.
 */

export interface BackendReportSection {
    id: string;
    title: string;
    type: "narrative" | "key_insight" | "recommendation" | "metadata" | "diagnostics" | string;
    content: string;
}

export interface BackendDiagnostics {
    data_quality?: {
        score: number;
        issues?: string[];
    };
    warnings?: string[];
}

export interface BackendRunData {
    run_id: string;
    created_at: string;
    status?: string;
    confidence_score?: number;
    sections: BackendReportSection[];
    diagnostics?: BackendDiagnostics;
}
