/**
 * Guidance Parser Utility
 * 
 * Extracts technical error strings from API responses and translates them
 * into user-friendly guidance using the GUIDANCE_MAP dictionary.
 */

import { GUIDANCE_MAP, FALLBACK_GUIDANCE, GuidanceEntry } from './guidanceMap';

/**
 * Parse raw error strings and return structured guidance entries
 * 
 * @param rawErrors - Array of raw error strings from API (e.g., ["target_variable: issue", "variance: low"])
 * @returns Array of GuidanceEntry objects with actionable advice
 * 
 * @example
 * const errors = ["target_variable: issue", "variance: low"];
 * const guidance = getGuidance(errors);
 * // Returns: [{ issue: "Missing Target Variable", ... }, { issue: "Low Data Variability", ... }]
 */
export function getGuidance(rawErrors: string | string[]): GuidanceEntry[] {
    // Normalize input to array
    const errorsArray = Array.isArray(rawErrors) ? rawErrors : [rawErrors];

    // Filter empty strings
    const validErrors = errorsArray.filter(err => err && err.trim().length > 0);

    if (validErrors.length === 0) {
        return [];
    }

    const guidanceEntries: GuidanceEntry[] = [];
    const seenIssues = new Set<string>(); // Prevent duplicates

    for (const errorString of validErrors) {
        // Try exact match first, then partial match, finally fallback
        const entry = GUIDANCE_MAP[errorString] ?? findPartialMatch(errorString) ?? FALLBACK_GUIDANCE;

        // Avoid duplicate guidance entries
        if (!seenIssues.has(entry.issue)) {
            guidanceEntries.push(entry);
            seenIssues.add(entry.issue);
        }
    }

    // Sort by severity: critical first, then warning, then info
    return guidanceEntries.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
}

/**
 * Try to find a partial match when exact key doesn't exist
 * Handles variations like "target_variable: missing" vs "target_variable: issue"
 */
function findPartialMatch(errorString: string): GuidanceEntry | null {
    const normalizedError = errorString.toLowerCase().trim();

    // Extract base error type (e.g., "target_variable", "variance")
    const parts = normalizedError.split(/[:\s]+/);
    const baseType = parts[0];

    // Check if any GUIDANCE_MAP key starts with this base type
    for (const [key, entry] of Object.entries(GUIDANCE_MAP)) {
        if (key.toLowerCase().startsWith(baseType)) {
            return entry;
        }
    }

    // Check for common keywords
    if (normalizedError.includes('missing') || normalizedError.includes('target')) {
        return GUIDANCE_MAP["target_variable: issue"];
    }

    if (normalizedError.includes('variance') || normalizedError.includes('variation')) {
        return GUIDANCE_MAP["variance: issue"];
    }

    if (normalizedError.includes('blocked_agents') || normalizedError.includes('regression')) {
        return GUIDANCE_MAP["blocked_agents: regression"];
    }

    return null;
}

/**
 * Parse limitations-diagnostics object from API response
 * Extracts error keys and converts to array of error strings
 * 
 * @example
 * const diagnostics = { target_variable: "issue", variance: "low" };
 * const errors = parseDiagnostics(diagnostics);
 * // Returns: ["target_variable: issue", "variance: low"]
 */
export function parseDiagnostics(diagnostics: Record<string, any>): string[] {
    if (!diagnostics || typeof diagnostics !== 'object') {
        return [];
    }

    const errors: string[] = [];

    for (const [key, value] of Object.entries(diagnostics)) {
        if (value && typeof value === 'string') {
            errors.push(`${key}: ${value}`);
        } else if (value === true) {
            errors.push(key);
        }
    }

    return errors;
}

/**
 * Parse validation-guardrails content string
 * Extracts error patterns from text like "Blocked Agents: regression, target_variable: issue"
 */
export function parseGuardrailsText(content: string): string[] {
    if (!content || typeof content !== 'string') {
        return [];
    }

    const errors: string[] = [];

    // Match patterns like "target_variable: issue" or "variance: low"
    const errorPattern = /(\w+):\s*(\w+)/g;
    let match;

    while ((match = errorPattern.exec(content)) !== null) {
        errors.push(`${match[1]}: ${match[2]}`);
    }

    // Also check for "Blocked Agents:" line
    if (content.includes('Blocked Agents:')) {
        const blockedMatch = content.match(/Blocked Agents:\s*(\w+)/i);
        if (blockedMatch) {
            errors.push(`blocked_agents: ${blockedMatch[1]}`);
        }
    }

    return errors;
}
