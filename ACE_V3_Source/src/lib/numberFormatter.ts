/**
 * Number formatting utilities for professional display
 * Transforms raw values into human-readable formats
 */

export const numberFormatter = {
    /**
     * Format decimal with 2 places: 0.542536 → 0.54
     */
    decimal: (n: number, places: number = 2): string => {
        return n.toFixed(places);
    },

    /**
     * Format integer with commas: 4850 → 4,850
     */
    integer: (n: number): string => {
        return Math.round(n).toLocaleString();
    },

    /**
     * Format as percentage: 0.85 → 85%
     */
    percentage: (n: number, places: number = 1): string => {
        return `${(n * 100).toFixed(places)}%`;
    },

    /**
     * Format percentage from 0-100 scale: 85 → 85.0%
     */
    percentageValue: (n: number, places: number = 1): string => {
        return `${n.toFixed(places)}%`;
    },

    /**
     * Format with context: 500, 10000 → "500 (5.0% of dataset)"
     */
    contextual: (value: number, total: number): string => {
        const pct = ((value / total) * 100).toFixed(1);
        return `${value.toLocaleString()} (${pct}% of dataset)`;
    },

    /**
     * Format timestamp: ISO string → "12/15/2024, 9:30 PM"
     */
    timestamp: (ts: string | Date): string => {
        const date = typeof ts === 'string' ? new Date(ts) : ts;
        return date.toLocaleString();
    },

    /**
     * Format large numbers with K/M suffix: 15000 → "15K"
     */
    compact: (n: number): string => {
        if (n >= 1000000) {
            return `${(n / 1000000).toFixed(1)}M`;
        }
        if (n >= 1000) {
            return `${(n / 1000).toFixed(1)}K`;
        }
        return n.toString();
    },

    /**
     * Smart format - chooses best format based on value
     */
    smart: (n: number): string => {
        if (n >= 1000) {
            return numberFormatter.compact(n);
        }
        if (n % 1 !== 0) {
            return numberFormatter.decimal(n);
        }
        return n.toString();
    }
};

/**
 * Format metric value with appropriate suffix
 */
export function formatMetric(value: number | undefined, type: 'integer' | 'decimal' | 'percentage' = 'integer'): string {
    if (value === undefined || value === null) return '-';

    switch (type) {
        case 'integer':
            return numberFormatter.integer(value);
        case 'decimal':
            return numberFormatter.decimal(value);
        case 'percentage':
            return numberFormatter.percentageValue(value);
        default:
            return value.toString();
    }
}
