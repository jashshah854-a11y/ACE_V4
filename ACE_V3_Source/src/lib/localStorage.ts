/**
 * Utility functions for localStorage persistence
 */

export interface RecentReport {
    runId: string;
    timestamp: string;
    title?: string;
}

const STORAGE_KEY = 'ace_recent_reports';
const MAX_RECENT = 10;

/**
 * Save a report to recent reports list
 */
export function saveRecentReport(runId: string, title?: string): void {
    try {
        const recent = getRecentReports();

        // Don't add duplicates
        const exists = recent.find(r => r.runId === runId);
        if (exists) return;

        const newReport: RecentReport = {
            runId,
            timestamp: new Date().toISOString(),
            title: title || `Report ${runId.substring(0, 8)}`,
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

        const reports = JSON.parse(stored);
        return Array.isArray(reports) ? reports : [];
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
