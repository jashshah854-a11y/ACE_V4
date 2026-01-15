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
        whyItMatters: 'Without a target, we cannot build predictive models or generate strategic recommendations.',
        howToFix: 'Add a column that represents the outcome you want to predict (e.g., "churned", "revenue", "converted").',
    },

    missing_time_coverage: {
        severity: 'warning',
        title: 'No temporal data found',
        description: 'The dataset does not include date or time columns.',
        whyItMatters: 'Time-based insights like trends, seasonality, and forecasts are unavailable.',
        howToFix: 'Add a date or timestamp column to enable trend analysis.',
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
        title: 'Clustering unavailable',
        description: 'Behavioral segmentation has been disabled for this run.',
        whyItMatters: 'You will not see customer segments or personas.',
        howToFix: 'Enable clustering in the task contract if needed.',
    },

    outcome_modeling_disabled: {
        severity: 'warning',
        title: 'Predictive modeling blocked',
        description: 'Outcome modeling has been disabled due to data constraints.',
        whyItMatters: 'You will not see predictions or risk scores.',
        howToFix: 'Add a target column and ensure sufficient data quality.',
    },

    strategy_lab_disabled: {
        severity: 'info',
        title: 'Strategy Lab unavailable',
        description: 'Persona generation and strategy recommendations are disabled.',
        whyItMatters: 'You will not see actionable strategies or personas.',
        howToFix: 'Enable the fabricator agent in the task contract.',
    },

    agent_regression_disabled: {
        severity: 'warning',
        title: 'Regression agent blocked',
        description: 'The regression agent was suppressed by governance rules.',
        whyItMatters: 'Predictive insights are unavailable.',
        howToFix: 'Review governance settings or improve data quality.',
    },

    agent_fabricator_disabled: {
        severity: 'info',
        title: 'Fabricator agent blocked',
        description: 'The fabricator agent was suppressed by governance rules.',
        whyItMatters: 'Persona and strategy generation is unavailable.',
        howToFix: 'Review governance settings or enable the agent.',
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

    // Check for missing target
    if (!rawPayload.has_target || rawPayload.target_column === null) {
        validationIssues.push({
            key: 'missing_target',
            ...VALIDATION_ISSUES.missing_target,
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
