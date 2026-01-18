/**
 * Issue Registry
 * 
 * Centralized definitions for all validation and governance issues.
 * Maps raw backend signals to normalized Issue objects.
 */

import type { Issue, IssueSeverity } from '@/types/RunSummaryViewModel';

/**
 * Validation issue definitions
 */
export const VALIDATION_ISSUES: Record<string, Omit<Issue, 'key'>> = {
    missing_target: {
        severity: 'critical',
        title: 'No outcome column detected',
        description: 'The dataset does not contain a clear target variable for prediction.',
        whyItMatters: 'Predictive modeling and strategic recommendations require an outcome column.',
        howToFix: 'Add a column representing the outcome you want to predict (e.g., "churned", "revenue", "converted").',
    },
    missing_target_exploratory: {
        severity: 'info',
        title: 'Outcome modeling not applicable',
        description: 'Exploratory runs focus on descriptive insights without a target outcome.',
        whyItMatters: 'Predictions and strategy recommendations are out of scope without a target column.',
        howToFix: 'Add an outcome column if you want predictive modeling in a future run.',
    },

    missing_time_coverage: {
        severity: 'warning',
        title: 'No temporal data found',
        description: 'The dataset does not include date or time columns.',
        whyItMatters: 'Trend analysis, seasonality detection, and forecasting require time data.',
        howToFix: 'Add a date or timestamp column to unlock time-based insights.',
    },

    observational_only: {
        severity: 'warning',
        title: 'Observational data only',
        description: 'The dataset appears to be observational without experimental controls.',
        whyItMatters: 'Causal claims cannot be made; insights are limited to correlations.',
        howToFix: 'Consider running controlled experiments or A/B tests for causal insights.',
    },

    low_signal_schema: {
        severity: 'warning',
        title: 'Limited feature set',
        description: 'The dataset has fewer than 5 meaningful features.',
        whyItMatters: 'Model accuracy may be limited due to insufficient predictive signals.',
        howToFix: 'Enrich the dataset with additional relevant features.',
    },

    insufficient_rows: {
        severity: 'critical',
        title: 'Insufficient data volume',
        description: 'The dataset contains fewer than 100 rows.',
        whyItMatters: 'Statistical reliability is compromised; insights may not generalize.',
        howToFix: 'Collect more data before running analysis.',
    },

    high_missing_rate: {
        severity: 'warning',
        title: 'High missing data rate',
        description: 'More than 30% of values are missing across key columns.',
        whyItMatters: 'Missing data reduces model accuracy and may introduce bias.',
        howToFix: 'Investigate data collection issues or consider imputation strategies.',
    },
};

/**
 * Governance block definitions
 */
export const GOVERNANCE_BLOCKS: Record<string, Omit<Issue, 'key'>> = {
    segmentation_disabled: {
        severity: 'info',
        title: 'Clustering not available for this run',
        description: 'Behavioral segmentation requires additional setup.',
        whyItMatters: 'Customer segments and personas are not included in this analysis.',
        howToFix: 'Contact support to enable clustering for future runs.',
    },

    outcome_modeling_disabled: {
        severity: 'warning',
        title: 'Predictive modeling not available',
        description: 'Outcome modeling requires an outcome column and sufficient data quality.',
        whyItMatters: 'Predictions and risk scores are not included in this analysis.',
        howToFix: 'Add a target column and resolve data quality issues.',
    },

    strategy_lab_disabled: {
        severity: 'info',
        title: 'Strategy Lab not available for this run',
        description: 'Persona generation and strategy recommendations require additional data.',
        whyItMatters: 'Actionable strategies and personas are not included in this analysis.',
        howToFix: 'Add behavioral and outcome data to unlock Strategy Lab.',
    },

    agent_regression_disabled: {
        severity: 'warning',
        title: 'Regression analysis not available',
        description: 'Regression analysis requires setup adjustments.',
        whyItMatters: 'Predictive insights are not included in this analysis.',
        howToFix: 'Contact support to enable regression for future runs.',
    },

    agent_fabricator_disabled: {
        severity: 'info',
        title: 'Persona generation not available',
        description: 'Persona and strategy generation requires setup adjustments.',
        whyItMatters: 'Personas and strategies are not included in this analysis.',
        howToFix: 'Contact support to enable persona generation for future runs.',
    },
};

/**
 * Map raw backend signals to issue keys
 */
export function mapBackendSignalsToIssues(rawPayload: any): {
    validationIssues: Issue[];
    governanceBlocks: Issue[];
} {
    const validationIssues: Issue[] = [];
    const governanceBlocks: Issue[] = [];
    const analysisIntent =
        rawPayload?.analysis_intent?.intent ||
        rawPayload?.analysis_intent ||
        rawPayload?.analysisIntent ||
        "unknown";
    const targetCandidate = rawPayload?.analysis_intent?.target_candidate || rawPayload?.target_candidate;
    const hasTarget = rawPayload?.has_target ?? (targetCandidate ? Boolean(targetCandidate.detected) : undefined);

    // Check for missing target
    if (hasTarget === false || rawPayload.target_column === null) {
        const issueKey = analysisIntent === "exploratory" ? "missing_target_exploratory" : "missing_target";
        validationIssues.push({
            key: issueKey,
            ...VALIDATION_ISSUES[issueKey],
        });
    }

    // Check for time coverage
    if (!rawPayload.has_time_field) {
        validationIssues.push({
            key: 'missing_time_coverage',
            ...VALIDATION_ISSUES.missing_time_coverage,
        });
    }

    // Check row count
    if (rawPayload.row_count < 100) {
        validationIssues.push({
            key: 'insufficient_rows',
            ...VALIDATION_ISSUES.insufficient_rows,
        });
    }

    // Check for blocked agents
    const blockedAgents = rawPayload.task_contract?.blocked_agents || [];

    if (blockedAgents.includes('regression')) {
        governanceBlocks.push({
            key: 'agent_regression_disabled',
            ...GOVERNANCE_BLOCKS.agent_regression_disabled,
        });
    }

    if (blockedAgents.includes('fabricator')) {
        governanceBlocks.push({
            key: 'agent_fabricator_disabled',
            ...GOVERNANCE_BLOCKS.agent_fabricator_disabled,
        });
    }

    if (blockedAgents.includes('overseer')) {
        governanceBlocks.push({
            key: 'segmentation_disabled',
            ...GOVERNANCE_BLOCKS.segmentation_disabled,
        });
    }

    return { validationIssues, governanceBlocks };
}
