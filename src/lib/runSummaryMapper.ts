/**
 * Run Summary Mapper
 * 
 * Pure function to translate raw backend payload into RunSummaryViewModel.
 * NO JSX, NO UI LOGIC, NO SIDE EFFECTS.
 */

import type { RunSummaryViewModel, RunMode, SCQANarrative } from '@/types/RunSummaryViewModel';
import { mapBackendSignalsToIssues } from './issueRegistry';
import { normalizeKPIs } from './kpiNormalizer';
import { parseSCQABlocks } from './reportParser';

/**
 * Derive run mode from validation issues
 */
function deriveRunMode(
    validationIssues: any[],
    governanceBlocks: any[]
): RunMode {
    // Failed: Critical validation errors
    const hasCriticalErrors = validationIssues.some(
        (issue) => issue.severity === 'critical'
    );
    if (hasCriticalErrors) return 'failed';

    // Limitations: Any blocking issues
    const hasBlockingValidation = validationIssues.some((issue) => issue.severity !== 'info');
    const hasBlockingGovernance = governanceBlocks.some((issue) => issue.severity !== 'info');
    if (hasBlockingValidation || hasBlockingGovernance) {
        return 'limitations';
    }

    // Normal: No issues
    return 'normal';
}

/**
 * Generate executive one-liner (max 140 chars)
 */
function generateExecutiveOneLiner(
    mode: RunMode,
    validationIssues: any[]
): string {
    if (mode === 'failed') {
        const topIssue = validationIssues[0];
        return `Analysis failed: ${topIssue?.title || 'Critical data issues detected'}`;
    }

    if (mode === 'limitations') {
        const topIssue = validationIssues[0];
        return `Limited analysis mode: ${topIssue?.title || 'Some features unavailable'}`;
    }

    return 'Full analysis enabled: All insights available';
}

/**
 * Generate executive bullets (max 4)
 */
function generateExecutiveBullets(
    rawPayload: any,
    validationIssues: any[],
    governanceBlocks: any[]
): string[] {
    const bullets: string[] = [];

    // Add top validation issue
    if (validationIssues.length > 0) {
        bullets.push(validationIssues[0].whyItMatters);
    }

    // Add dataset facts
    const rows = rawPayload.row_count || 0;
    const columns = rawPayload.column_count || 0;
    bullets.push(`Analyzed ${rows.toLocaleString()} records across ${columns} features`);

    // Add governance note
    if (governanceBlocks.length > 0) {
        bullets.push(`${governanceBlocks.length} feature(s) disabled by governance`);
    }

    // Return max 4 bullets
    return bullets.slice(0, 4);
}

/**
 * Extract SCQA narrative from markdown
 */
function extractSCQANarrative(markdown: string): SCQANarrative | null {
    try {
        const blocks = parseSCQABlocks(markdown);
        if (blocks.length === 0) return null;

        const first = blocks[0];
        return {
            situation: first.situation || '',
            complication: first.complication || '',
            question: first.question || '',
            answer: first.answer || '',
        };
    } catch (error) {
        console.warn('Failed to parse SCQA narrative:', error);
        return null;
    }
}

/**
 * Main mapper function
 * 
 * Translates raw backend response into RunSummaryViewModel.
 */
export function mapToRunSummaryViewModel(
    rawPayload: any
): RunSummaryViewModel {
    // 1. Normalize issues
    const { validationIssues, governanceBlocks } = mapBackendSignalsToIssues(rawPayload);

    // 2. Derive run mode
    const mode = deriveRunMode(validationIssues, governanceBlocks);

    // 3. Generate executive summary
    const oneLiner = generateExecutiveOneLiner(mode, validationIssues);
    const bullets = generateExecutiveBullets(rawPayload, validationIssues, governanceBlocks);

    // 4. Normalize KPIs
    const kpis = normalizeKPIs(rawPayload);

    // 5. Extract SCQA narrative
    const scqaNarrative = extractSCQANarrative(rawPayload.report_content || '');

    const hasTimeField = rawPayload.has_time_field || false;
    const timeCoverage = hasTimeField ? 'sufficient' : 'unknown';

    // 8. Determine available actions
    const canOpenLab = mode === 'normal' && !governanceBlocks.some(b => b.key === 'strategy_lab_disabled');
    const canViewEvidence = mode !== 'failed';

    const secondaryActions: Array<'viewValidation' | 'openLab' | 'viewEvidence'> = [];
    if (validationIssues.length > 0 || governanceBlocks.length > 0) {
        secondaryActions.push('viewValidation');
    }
    if (canOpenLab) {
        secondaryActions.push('openLab');
    }
    if (canViewEvidence) {
        secondaryActions.push('viewEvidence');
    }

    // 9. Build metadata table
    const metadataTable = [
        { key: 'Run ID', value: rawPayload.run_id || 'Unknown' },
        { key: 'Status', value: rawPayload.status || 'Unknown' },
        { key: 'Created', value: rawPayload.created_at || 'Unknown' },
        { key: 'Mode', value: mode },
    ];

    // 10. Assemble view model
    return {
        run: {
            id: rawPayload.run_id || '',
            shortId: (rawPayload.run_id || '').slice(0, 8),
            createdAt: rawPayload.created_at || new Date().toISOString(),
            mode,
            statusLabel: mode === 'normal'
                ? 'Full analysis enabled'
                : mode === 'limitations'
                    ? 'Limited analysis mode'
                    : 'Run failed',
        },

        dataset: {
            typeLabel: rawPayload.dataset_type || 'Unknown',
            rows: rawPayload.row_count || 0,
            columns: rawPayload.column_count || 0,
            timeCoverage,
        },

        executive: {
            oneLiner,
            bullets,
        },

        kpis,

        limitations: {
            validationIssues,
            governanceBlocks,
            practicalImpact: validationIssues.length > 0
                ? validationIssues[0].whyItMatters
                : governanceBlocks.length > 0
                    ? governanceBlocks[0].whyItMatters
                    : 'No limitations detected',
        },

        actions: {
            primary: 'fixDataset',
            secondary: secondaryActions,
        },

        technical: {
            metadataTable,
            scqaNarrative,
            rawJson: rawPayload,
        },
    };
}
