/**
 * Extract or generate section summaries from report content
 */

export function getSectionSummary(sectionTitle: string, sectionContent: string): string {
    // Predefined summaries for common sections
    const summaries: Record<string, string> = {
        "behavioral clusters": "Analyzes behavioral groupings to understand how records cluster based on similarity.",
        "behavioral clustering": "Analyzes behavioral groupings to understand how records cluster based on similarity.",
        "anomaly detection": "Identifies unusual patterns and outliers that deviate from expected behavior.",
        "data quality": "Assesses the completeness, accuracy, and reliability of the dataset.",
        "quality assessment": "Assesses the completeness, accuracy, and reliability of the dataset.",
        "executive summary": "Provides a high-level overview of key findings and recommendations.",
        "earth hypothesis": "Tests hypotheses about relationships and dependencies in the data.",
        "outcome modeling": "Predicts likely outcomes based on historical patterns and current indicators.",
        "persona analysis": "Identifies distinct user or customer archetypes based on behavior patterns.",
        "recommendations": "Suggests specific actions based on analysis findings.",
        "methodology": "Explains the analytical approach and techniques used in this report.",
    };

    // Try to match section title
    const normalizedTitle = sectionTitle.toLowerCase();
    for (const [key, summary] of Object.entries(summaries)) {
        if (normalizedTitle.includes(key)) {
            return summary;
        }
    }

    // Fallback: Extract first sentence from content
    const firstSentence = sectionContent
        .split(/[.!?]+/)
        .filter(s => s.trim().length > 20)[0];

    if (firstSentence && firstSentence.length < 150) {
        return firstSentence.trim() + ".";
    }

    // Generic fallback
    return "Detailed analysis and findings for this section.";
}

/**
 * Generate reading time estimate for section
 */
export function estimateReadingTime(content: string): number {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200); // 200 WPM average
    return Math.max(1, minutes);
}
