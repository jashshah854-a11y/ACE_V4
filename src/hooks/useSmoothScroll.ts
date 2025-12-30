/**
 * useSmoothScroll Hook
 * 
 * Provides smooth scrolling functionality to section anchors.
 */

export function useSmoothScroll() {
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }
    };

    return { scrollToSection };
}

/**
 * Format brief text for clipboard
 */
export function formatBriefText(brief: {
    headline: string;
    keyFinding: string;
    decision: string;
    confidenceScore: number;
}): string {
    const timestamp = new Date().toLocaleString();

    return `📊 ${brief.headline}

🔍 Finding: ${brief.keyFinding}
⚡ Action: ${brief.decision}

Confidence: ${Math.round(brief.confidenceScore)}% | Generated: ${timestamp}`;
}
