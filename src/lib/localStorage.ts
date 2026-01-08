/**
 * Utility functions for localStorage persistence
 */

export interface RecentReport {
    runId: string;
    timestamp: string;
    title?: string;
    filename?: string;
    createdAt?: string;
}

const STORAGE_KEY = 'ace_recent_reports';
const MAX_RECENT = 10;

/**
 * Generate a meaningful report title from filename and timestamp
 */
export function generateReportTitle(filename?: string, timestamp?: string): string {
    if (filename) {
        // Remove extension and clean up
        const cleanName = filename
            .replace(/\.(csv|json|xlsx|xls|parquet)$/i, '')
            .replace(/[_-]/g, ' ')
            .trim();
        return `${cleanName} Analysis`;
    }

    if (timestamp) {
        const date = new Date(timestamp);
        const formatted = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        return `Report - ${formatted}`;
    }

    return 'Analysis Report';
}

/**
 * Save a report to recent reports list
 */
export function saveRecentReport(runId: string, title?: string, filename?: string): void {
    try {
        const recent = getRecentReports();

        // Don't add duplicates
        const exists = recent.find(r => r.runId === runId);
        if (exists) return;

        const timestamp = new Date().toISOString();
        const generatedTitle = title || generateReportTitle(filename, timestamp);

        const newReport: RecentReport = {
            runId,
            timestamp,
            title: generatedTitle,
            filename,
            createdAt: new Date(timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })
        };

        recent.unshift(newReport);

        // Keep only the most recent N reports
        const trimmed = recent.slice(0, MAX_RECENT);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.warn('Failed to save recent report:', error);
    }
}

/**
 * Get all recent reports
 */
export function getRecentReports(): RecentReport[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        try {
            const reports = JSON.parse(stored);
            return Array.isArray(reports) ? reports : [];
        } catch (e) {
            console.error('Failed to parse stored reports:', e);
            return [];
        }
    } catch (error) {
        console.warn('Failed to load recent reports:', error);
        return [];
    }
}

/**
 * Clear all recent reports
 */
export function clearRecentReports(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to clear recent reports:', error);
    }
}

/**
 * Remove a specific report from recents
 */
export function removeRecentReport(runId: string): void {
    try {
        const recent = getRecentReports();
        const filtered = recent.filter(r => r.runId !== runId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.warn('Failed to remove recent report:', error);
    }
}

/**
 * Validate a run ID by checking if it exists on the backend
 */
export async function validateRunId(runId: string, apiBase: string): Promise<boolean> {
    try {
        // Enforce Singular Protocol
        const response = await fetch(`${apiBase}/run/${runId}/status`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Clean invalid run IDs from recent reports
 * This helps prevent the app from getting stuck on non-existent runs
 */
export async function validateAndCleanRecentReports(apiBase: string): Promise<void> {
    try {
        const recent = getRecentReports();
        if (recent.length === 0) return;

        // Validate each run ID
        const validationResults = await Promise.all(
            recent.map(async (report) => ({
                report,
                isValid: await validateRunId(report.runId, apiBase)
            }))
        );

        // Filter out invalid runs
        const validReports = validationResults
            .filter(({ isValid }) => isValid)
            .map(({ report }) => report);

        // Only update if we removed some invalid runs
        if (validReports.length !== recent.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validReports));
            console.log(`Cleaned ${recent.length - validReports.length} invalid run(s) from recent reports`);
        }
    } catch (error) {
        console.warn('Failed to validate recent reports:', error);
    }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}
