/**
 * Run Summary View Model
 * 
 * Canonical data structure for Run Overview UI.
 * All components consume this normalized model instead of raw backend fields.
 */

export type RunMode = 'normal' | 'limitations' | 'failed';
export type TrustLabel = 'low' | 'moderate' | 'high';
export type TimeCoverage = 'unknown' | 'partial' | 'sufficient';
export type IssueSeverity = 'info' | 'warning' | 'critical';
export type KPIStatus = 'good' | 'warning' | 'bad';

/**
 * Normalized issue object
 * Represents validation errors or governance blocks
 */
export interface Issue {
    key: string;
    severity: IssueSeverity;
    title: string;
    description: string;
    whyItMatters: string;
    howToFix: string;
}

/**
 * KPI card data
 */
export interface KPI {
    key: string;
    label: string;
    value: string | number;
    status: KPIStatus;
    meaning: string;
}

/**
 * SCQA narrative structure (hidden by default)
 */
export interface SCQANarrative {
    situation: string;
    complication: string;
    question: string;
    answer: string;
}

/**
 * Complete Run Summary View Model
 * 
 * This is the ONLY object the UI should consume.
 * No components should read raw backend fields directly.
 */
export interface RunSummaryViewModel {
    /** Run metadata */
    run: {
        id: string;
        shortId: string;  // First 8 characters
        createdAt: string;
        mode: RunMode;
        statusLabel: string;
    };

    /** Trust and confidence signals */
    trust: {
        score: number;  // 0-1
        label: TrustLabel;
        guidance: string;
    };

    /** Dataset characteristics */
    dataset: {
        typeLabel: string;
        rows: number;
        columns: number;
        timeCoverage: TimeCoverage;
    };

    /** Executive summary (max 140 chars + 4 bullets) */
    executive: {
        oneLiner: string;  // Max 140 characters
        bullets: string[];  // Max 4 items
    };

    /** Key performance indicators (3-4 cards) */
    kpis: KPI[];

    /** Limitations and issues */
    limitations: {
        validationIssues: Issue[];
        governanceBlocks: Issue[];
        practicalImpact: string;
    };

    /** Available actions */
    actions: {
        primary: 'fixDataset';
        secondary: Array<'viewValidation' | 'openLab' | 'viewEvidence'>;
    };

    /** Technical details (hidden by default) */
    technical: {
        metadataTable: Array<{ key: string; value: any }>;
        scqaNarrative: SCQANarrative | null;
        rawJson: any;
    };
}
