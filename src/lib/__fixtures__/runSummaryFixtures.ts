/**
 * Run Summary Fixtures
 * 
 * Test data for all run states: normal, limitations, failed
 */

/**
 * Fixture 1: Normal Run
 * All insights allowed, no blocking issues
 */
export const normalRunFixture = {
    run_id: 'abc123def456',
    status: 'completed',
    created_at: '2026-01-15T12:00:00Z',
    confidence: 0.85,
    quality_score: 0.92,
    row_count: 5000,
    column_count: 12,
    has_time_field: true,
    has_target: true,
    target_column: 'churned',
    dataset_type: 'Customer Behavior',
    report_content: '# Analysis Report\n\nSituation: We are analyzing customer churn...',
    task_contract: {
        allowed_sections: ['insights', 'quality', 'bi'],
        blocked_agents: [],
    },
};

/**
 * Fixture 2: Limitations (Missing Target)
 * Valid run but outcome modeling disabled
 */
export const limitationsMissingTargetFixture = {
    run_id: 'xyz789abc123',
    status: 'completed',
    created_at: '2026-01-15T13:00:00Z',
    confidence: 0.55,
    quality_score: 0.78,
    row_count: 2500,
    column_count: 8,
    has_time_field: true,
    has_target: false,
    target_column: null,
    dataset_type: 'Observational Data',
    report_content: '# Analysis Report\n\nSituation: Dataset lacks outcome variable...',
    task_contract: {
        allowed_sections: ['insights', 'quality'],
        blocked_agents: ['regression', 'fabricator'],
    },
};

/**
 * Fixture 3: Limitations (Governance Blocked)
 * Valid run but agents disabled by governance
 */
export const limitationsGovernanceBlockedFixture = {
    run_id: 'def456ghi789',
    status: 'completed',
    created_at: '2026-01-15T14:00:00Z',
    confidence: 0.72,
    quality_score: 0.85,
    row_count: 10000,
    column_count: 15,
    has_time_field: true,
    has_target: true,
    target_column: 'revenue',
    dataset_type: 'Sales Data',
    report_content: '# Analysis Report\n\nSituation: Governance rules restrict advanced modeling...',
    task_contract: {
        allowed_sections: ['insights', 'quality', 'bi'],
        blocked_agents: ['fabricator', 'overseer'],
    },
};

/**
 * Fixture 4: Failed Run
 * Critical validation errors
 */
export const failedRunFixture = {
    run_id: 'failed123abc',
    status: 'failed',
    created_at: '2026-01-15T15:00:00Z',
    confidence: 0.15,
    quality_score: 0.32,
    row_count: 45,  // Too few rows
    column_count: 3,
    has_time_field: false,
    has_target: false,
    target_column: null,
    dataset_type: 'Unknown',
    report_content: '# Analysis Failed\n\nCritical errors detected...',
    task_contract: {
        allowed_sections: [],
        blocked_agents: ['regression', 'fabricator', 'overseer'],
    },
};
