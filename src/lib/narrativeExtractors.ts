import { sanitizeDisplayText, extractSections, type ReportSection } from "./reportParser";
import {
    translateConfidence,
    translateModelFit,
    translateOverallVerdict,
} from "./verdictTranslator";

export interface ExecutiveBriefData {
    purpose: string;
    keyFindings: string[];
    confidenceVerdict: string;
    recommendedAction: string;
}

export interface ConclusionData {
    shouldUseFor: string[];
    shouldNotUseFor: string[];
    nextStep: string;
}

/**
 * Extract or generate Executive Brief data from report markdown
 * 
 * Attempts to extract from existing content, generates intelligent defaults if missing
 */
export function extractExecutiveBrief(content: string): ExecutiveBriefData {
    const sections = extractSections(content);

    // Extract or generate purpose
    const summarySection = sections.find(s =>
        s.title.toLowerCase().includes("executive") ||
        s.title.toLowerCase().includes("summary")
    );

    let purpose = "Analysis of customer behavior patterns and segments";
    if (summarySection) {
        // Extract first sentence as purpose
        const firstSentence = summarySection.content.split(/[.!?]/)[0]?.trim();
        if (firstSentence && firstSentence.length > 20) {
            purpose = sanitizeDisplayText(firstSentence);
        }
    }

    // Extract key findings
    const keyFindings: string[] = [];

    // Look for bullet points or numbered lists in summary
    if (summarySection) {
        const bulletMatches = summarySection.content.match(/^[-*]\s*(.+)$/gm);
        if (bulletMatches) {
            bulletMatches.slice(0, 3).forEach(bullet => {
                const finding = bullet.replace(/^[-*]\s*/, '').trim();
                if (finding.length > 20) {
                    keyFindings.push(sanitizeDisplayText(finding));
                }
            });
        }
    }

    // Fallback: Extract from cluster/persona/model sections
    if (keyFindings.length === 0) {
        // Check if clusters exist
        const clusterSection = sections.find(s =>
            s.title.toLowerCase().includes("cluster") ||
            s.title.toLowerCase().includes("segment")
        );
        if (clusterSection) {
            const kMatch = clusterSection.content.match(/\*\*k:\*\*\s*(\d+)/i);
            if (kMatch) {
                keyFindings.push(`${kMatch[1]} distinct customer segments identified with clear behavioral differences`);
            }
        }

        // Check if personas exist
        const personaMatches = content.match(/###\s+(.+?)(?:\n|$)/g);
        if (personaMatches && personaMatches.length > 0) {
            keyFindings.push(`${personaMatches.length} detailed persona profiles created based on spending and engagement patterns`);
        }

        // Check model performance
        const r2Match = content.match(/R²[:\s]+([-\d.]+)/i);
        if (r2Match) {
            const r2 = parseFloat(r2Match[1]);
            if (r2 >= 0.5) {
                keyFindings.push("Predictive model shows strong ability to forecast customer behavior");
            } else if (r2 >= 0) {
                keyFindings.push("Predictive insights available but should be validated before use");
            } else {
                keyFindings.push("Current dataset is not suitable for prediction modeling");
            }
        }
    }

    // Ensure we have exactly 3 findings
    while (keyFindings.length < 3) {
        if (keyFindings.length === 0) {
            keyFindings.push("Customer segmentation analysis complete with distinct behavioral groups");
        } else if (keyFindings.length === 1) {
            keyFindings.push("Data quality is sufficient for strategic decision-making");
        } else {
            keyFindings.push("Recommended to monitor segment evolution over time for trend analysis");
        }
    }

    // Generate confidence verdict
    let confidenceVerdict = "Moderate confidence - findings are directional and actionable with validation";

    // Try to extract Silhouette score for confidence
    const silhouetteMatch = content.match(/Silhouette\s*(?:Score|Coefficient)?[:\s]+([\d.]+)/i);
    if (silhouetteMatch) {
        const score = parseFloat(silhouetteMatch[1]);
        confidenceVerdict = translateConfidence(score);
    } else {
        // Try R² as fallback
        const r2Match = content.match(/R²[:\s]+([-\d.]+)/i);
        if (r2Match) {
            const r2 = parseFloat(r2Match[1]);
            if (r2 >= 0.5) {
                confidenceVerdict = "High confidence - model shows strong predictive power and segments are distinct";
            } else if (r2 < 0) {
                confidenceVerdict = "Low confidence - current analysis has limitations that must be addressed";
            }
        }
    }

    // Generate recommended action
    let recommendedAction = "Review segment profiles and develop targeted strategies for each group";

    // Look for existing recommendations
    const recommendSection = sections.find(s =>
        s.title.toLowerCase().includes("recommend") ||
        s.title.toLowerCase().includes("next") ||
        s.title.toLowerCase().includes("action")
    );

    if (recommendSection) {
        const firstAction = recommendSection.content
            .split(/[.!?]/)
            .find(s => s.trim().length > 30);
        if (firstAction) {
            recommendedAction = sanitizeDisplayText(firstAction.trim());
        }
    } else {
        // Generate based on content
        const hasHighSpenders = content.toLowerCase().includes("high spend") ||
            content.toLowerCase().includes("premium");
        const hasAtRisk = content.toLowerCase().includes("at risk") ||
            content.toLowerCase().includes("churning");

        if (hasHighSpenders) {
            recommendedAction = "Prioritize retention campaigns for high-value segments and test personalized offers";
        } else if (hasAtRisk) {
            recommendedAction = "Develop intervention strategies for at-risk customers before they churn";
        }
    }

    return {
        purpose,
        keyFindings: keyFindings.slice(0, 3),
        confidenceVerdict,
        recommendedAction,
    };
}

/**
 * Extract or generate Conclusion data from report markdown
 * 
 * Defines decision boundaries and next steps
 */
export function extractConclusion(content: string): ConclusionData {
    const sections = extractSections(content);

    const shouldUseFor: string[] = [];
    const shouldNotUseFor: string[] = [];

    // Detect what the analysis includes
    const hasSegmentation = content.toLowerCase().includes("cluster") ||
        content.toLowerCase().includes("segment");
    const hasPrediction = content.toLowerCase().includes("model") &&
        content.toLowerCase().includes("r²");
    const hasAnomalies = content.toLowerCase().includes("anomal");

    // Build "Should Use For" list
    if (hasSegmentation) {
        shouldUseFor.push("Segmenting customers into distinct groups for targeted marketing");
        shouldUseFor.push("Understanding behavioral patterns and preferences across customer base");
    }

    if (hasPrediction) {
        const r2Match = content.match(/R²[:\s]+([-\d.]+)/i);
        if (r2Match) {
            const r2 = parseFloat(r2Match[1]);
            if (r2 >= 0.5) {
                shouldUseFor.push("Making directional predictions about customer behavior trends");
            }
        }
    }

    if (hasAnomalies) {
        shouldUseFor.push("Identifying unusual patterns that may require investigation");
    }

    // Always include general strategic use
    if (shouldUseFor.length === 0) {
        shouldUseFor.push("Understanding high-level customer behavior patterns");
        shouldUseFor.push("Informing strategic discussions about customer segments");
    } else {
        shouldUseFor.push("Informing strategic planning and resource allocation decisions");
    }

    // Build "Should NOT Use For" list
    const r2Match = content.match(/R²[:\s]+([-\d.]+)/i);
    if (r2Match) {
        const r2 = parseFloat(r2Match[1]);
        if (r2 < 0.5) {
            shouldNotUseFor.push("Making precise predictions about individual customer purchases");
            shouldNotUseFor.push("Automated decision-making without human review and validation");
        }
        if (r2 < 0.3) {
            shouldNotUseFor.push("Forecasting specific revenue or conversion rates");
        }
    }

    // Check for data quality issues
    const qualityMatch = content.match(/(?:data(?:set)?\\s*quality)[:\\s]*(\\d+(?:\\.\\d+)?)/i);
    if (qualityMatch) {
        const quality = parseFloat(qualityMatch[1]);
        const normalized = quality > 1 ? quality / 100 : quality;
        if (normalized < 0.8) {
            shouldNotUseFor.push("High-stakes decisions without validating data quality first");
        }
    }

    // Always include general cautions
    shouldNotUseFor.push("Making irreversible decisions without testing assumptions first");
    shouldNotUseFor.push("Replacing domain expertise - this analysis should inform, not replace, judgment");

    // Generate next step
    let nextStep = "Review segment characteristics with business stakeholders and identify quick wins";

    // Look for existing next steps
    const recommendSection = sections.find(s =>
        s.title.toLowerCase().includes("recommend") ||
        s.title.toLowerCase().includes("next")
    );

    if (recommendSection) {
        const sentences = recommendSection.content.split(/[.!?]/);
        const actionSentence = sentences.find(s =>
            s.toLowerCase().includes("should") ||
            s.toLowerCase().includes("recommend") ||
            s.length > 40
        );
        if (actionSentence) {
            nextStep = sanitizeDisplayText(actionSentence.trim());
        }
    } else {
        // Generate based on findings
        if (hasSegmentation) {
            nextStep = "Run a pilot campaign targeting the highest-value segment and measure response rates";
        }
        if (r2Match && parseFloat(r2Match[1]) >= 0.5) {
            nextStep = "Validate predictive model with hold-out test set, then deploy in controlled pilot";
        }
    }

    return {
        shouldUseFor: shouldUseFor.slice(0, 4),
        shouldNotUseFor: shouldNotUseFor.slice(0, 3),
        nextStep,
    };
}
