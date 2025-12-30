// Derived from processed data, decoupled from ReportDataResult to avoid circular deps
export interface ReportInputData {
    primaryQuestion?: string;
    decisionSummary?: string;
    confidenceValue?: number;
    safeMode: boolean;
    limitationsMode: boolean;
    sections?: { id: string; title: string; content: string }[];
    evidenceSections?: { id: string; title: string }[];
}

import { getGuidance, parseDiagnostics, parseGuardrailsText } from './getGuidance';

export interface ReportViewModel {
    header: {
        title: string;
        signal: {
            strength: "high" | "moderate" | "low";
            bars: 1 | 2 | 3;
            color: string;
            label: string;
            confidenceScore: number;
        };
        safeMode: boolean;
        limitationsMode: boolean;
        limitationsReason: string | null;
    };
    metadata: {
        runId: string | null;
        timestamp: string | null;
        generatedBy: string | null;
    };
    meta: {
        title: string;
    };
    navigation: {
        id: string;
        label: string;
    }[];
    traceability: {
        textSegments: { text: string; evidenceId: string }[];
    };
    validationErrors: {
        rawErrors: string[];
        guidanceEntries: import('./guidanceMap').GuidanceEntry[];
    };
    brief: {
        headline: string;
        keyFinding: string;
        decision: string;
        status: "success" | "limited" | "error";
        accentColor: "teal" | "amber" | "red";
    };
}

export function transformAPIResponse(data: ReportInputData): ReportViewModel {
    // 1. Map primary_type to human-readable headers
    let title = "Analysis Report";
    if (data.primaryQuestion) {
        title = data.primaryQuestion;
    } else if (data.decisionSummary) {
        title = "Market Intelligence Analysis";
    }

    // 2. Extract Global Confidence
    // Check for "Spark" card global_confidence or fall back to computed value
    let confidenceScore = data.confidenceValue ?? 0;

    // Attempt to extract specific Spark confidence if available in sections
    const sparkSection = data.sections?.find(s => s.title.toLowerCase().includes("spark"));
    if (sparkSection) {
        const sparkMatch = sparkSection.content.match(/global_confidence[:\s]+([\d.]+)/i);
        if (sparkMatch) {
            confidenceScore = parseFloat(sparkMatch[1]);
        }
    }

    let signalStrength: "high" | "moderate" | "low" = "low";
    let bars: 1 | 2 | 3 = 1;
    let color = "text-muted-foreground";
    let label = "Low Confidence";

    if (confidenceScore >= 0.8 || confidenceScore >= 80) {
        signalStrength = "high";
        bars = 3;
        color = "text-teal-500";
        label = "High Confidence";
    } else if (confidenceScore >= 0.5 || confidenceScore >= 50) {
        signalStrength = "moderate";
        bars = 2;
        color = "text-amber-500";
        label = "Moderate Confidence";
    }

    // 3. Mode Status & Reasons
    let safeMode = data.safeMode;
    // Check validation-guardrails for safe_mode_status
    const validationSection = data.sections?.find(s => s.id.includes("validation-guardrails"));
    if (validationSection) {
        const statusMatch = validationSection.content.match(/safe_mode_status[:\s]+(true|false)/i);
        if (statusMatch) {
            safeMode = statusMatch[1].toLowerCase() === "true";
        }
    }

    const limitationsMode = data.limitationsMode;
    let limitationsReason: string | null = null;

    // Extract limitations reason from confidence-governance
    const governanceSection = data.sections?.find(s => s.id.includes("confidence-governance"));
    if (governanceSection) {
        const reasonMatch = governanceSection.content.match(/limitations_reason[:\s]+(.+)/i);
        if (reasonMatch) {
            limitationsReason = reasonMatch[1].trim();
        } else {
            // Fallback: look for "Blocker" or "Reason" lines
            const validLines = governanceSection.content.split('\n').filter(l => l.includes("Reason:") || l.includes("Blocker:"));
            if (validLines.length > 0) {
                limitationsReason = validLines[0].split(':')[1].trim();
            }
        }
    }

    // 4. Traceability Segments
    // Map key phrases in executive-summary to evidence IDs
    const textSegments: { text: string; evidenceId: string }[] = [];
    const execSummary = data.sections?.find(s => s.id.includes("executive-summary"));

    if (execSummary) {
        // Define key phrases to look for
        const phraseMap: Record<string, string> = {
            "behavioral segments": "behavioral-clusters",
            "behavioral clusters": "behavioral-clusters",
            "anomalies": "anomalies",
            "predicted outcomes": "outcome-modeling",
            "validation gaps": "validation-guardrails",
            "confidence score": "confidence-governance"
        };

        Object.entries(phraseMap).forEach(([phrase, evidenceId]) => {
            if (execSummary.content.toLowerCase().includes(phrase)) {
                // Find exact casing in text if possible, or just use the phrase as matches are case-insensitive usually for linking
                // straightforward approach: find the phrase in content
                const regex = new RegExp(phrase, 'i');
                const match = execSummary.content.match(regex);
                if (match) {
                    textSegments.push({
                        text: match[0], // Store the exact matched text
                        evidenceId: evidenceId
                    });
                }
            }
        });
    }

    // Navigation (Table of Contents)
    const navigation = (data.evidenceSections || []).map((section) => ({
        id: section.id,
        label: section.title,
    }));

    // Primary Title Mapping
    // Check for "data-type-identification" card content for explicit type
    // Fallback to "Executive Pulse" only if no better title found
    let primaryTitle = "Executive Pulse";
    const typeSection = data.sections?.find(s => s.id.includes("data-type-identification"));

    if (typeSection) {
        const typeMatch = typeSection.content.match(/primary_type[:\s]+([\w_]+)/i);
        if (typeMatch) {
            const rawType = typeMatch[1].toLowerCase();
            if (rawType === "marketing_performance") primaryTitle = "Marketing Performance Analysis";
            else if (rawType === "time_series_trend") primaryTitle = "Trend & Seasonality Report";
            else primaryTitle = rawType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
    } else if (data.primaryQuestion) {
        // If we have a clear primary question, it might be a better title than generic
        // but typically "Executive Pulse" is the brand.
        // The spec asks for "Marketing Performance Analysis" explicitly.
    }

    // 5. Extract Validation Errors
    const rawErrors: string[] = [];

    // Check limitations-diagnostics section
    const limitationsSection = data.sections?.find(s => s.id.includes("limitations-diagnostics"));
    if (limitationsSection && limitationsSection.content) {
        try {
            const diagnosticsData = JSON.parse(limitationsSection.content);
            const diagnosticErrors = parseDiagnostics(diagnosticsData);
            rawErrors.push(...diagnosticErrors);
        } catch (e) {
            // If JSON parsing fails, try to extract errors from text content
            const textErrors = parseGuardrailsText(limitationsSection.content);
            rawErrors.push(...textErrors);
        }
    }

    // Check validation-guardrails section
    if (validationSection) {
        const guardrailErrors = parseGuardrailsText(validationSection.content);
        rawErrors.push(...guardrailErrors);
    }

    // Parse errors into guidance entries
    const guidanceEntries = getGuidance(rawErrors);

    // 6. Extract Brief Data (TL;DR)
    // Headline ("What")
    let briefHeadline = primaryTitle;
    const briefTypeSection = data.sections?.find(s => s.id.includes("data-type-identification"));
    if (briefTypeSection) {
        const trendSection = data.sections?.find(s => s.id.includes("trend") || s.title.toLowerCase().includes("trend"));
        let trend: string | null = null;

        if (trendSection) {
            const content = trendSection.content.toLowerCase();
            if (content.includes("growing") || content.includes("increase")) trend = "growing";
            else if (content.includes("stable") || content.includes("steady")) trend = "stable";
            else if (content.includes("declining") || content.includes("decrease")) trend = "declining";
        }

        const typeMatch = briefTypeSection.content.match(/primary_type[:\s]+([\w_]+)/i);
        if (typeMatch) {
            const rawType = typeMatch[1].toLowerCase();
            if (rawType === "marketing_performance") {
                briefHeadline = trend ? `Marketing Performance is ${trend.charAt(0).toUpperCase() + trend.slice(1)}` : "Marketing Performance Snapshot";
            } else if (rawType === "time_series_trend") {
                briefHeadline = trend ? `${trend.charAt(0).toUpperCase() + trend.slice(1)} Trend Detected` : "Time Series Analysis";
            }
        }
    }

    // Override headline in Safe Mode
    if (safeMode) {
        briefHeadline = "Analysis Limited: Data Constraints Detected";
    }

    // Key Finding ("So What")
    let briefKeyFinding = "Analysis complete. Review full report for insights.";
    const briefExecSummary = data.sections?.find(s => s.id.includes("executive-summary"));

    if (safeMode && guidanceEntries.length > 0) {
        // In Safe Mode, show the technical blocker
        briefKeyFinding = guidanceEntries[0].explanation;
    } else if (briefExecSummary) {
        // Extract first quantitative statement
        const quantPattern = /[^.!?]*\d+[%\d\s]*[^.!?]*[.!?]/g;
        const matches = briefExecSummary.content.match(quantPattern);
        if (matches && matches.length > 0) {
            briefKeyFinding = matches[0].trim();
        } else {
            // Fallback to first sentence
            const firstSentence = execSummary.content.split(/[.!?]/)[0];
            if (firstSentence && firstSentence.length > 10) {
                briefKeyFinding = firstSentence.trim() + ".";
            }
        }
    }

    // Truncate if too long
    if (briefKeyFinding.length > 150) {
        briefKeyFinding = briefKeyFinding.substring(0, 147) + "...";
    }

    // Decision ("Now What")
    let briefDecision = "Review full report for recommendations.";

    if (safeMode && guidanceEntries.length > 0) {
        // In Safe Mode, link to remediation
        briefDecision = "Click to view data requirements →";
    } else {
        // Extract from strategies or recommendations
        const strategiesSection = data.sections?.find(s =>
            s.id.includes("strategies") ||
            s.id.includes("recommendations") ||
            s.id.includes("personas")
        );

        if (strategiesSection) {
            const lines = strategiesSection.content.split('\n');
            const firstRec = lines.find(line =>
                line.toLowerCase().includes("recommend") ||
                line.toLowerCase().includes("focus") ||
                line.toLowerCase().includes("prioritize") ||
                line.toLowerCase().includes("target")
            );

            if (firstRec && firstRec.length > 10) {
                // Clean up markdown/bullet points
                briefDecision = firstRec.replace(/^[-*•]\s*/, '').trim();
            }
        }
    }

    // Truncate decision if too long
    if (briefDecision.length > 120) {
        briefDecision = briefDecision.substring(0, 117) + "...";
    }

    // Status and Accent Color
    let briefStatus: "success" | "limited" | "error" = "success";
    let briefAccentColor: "teal" | "amber" | "red" = "teal";

    if (safeMode && guidanceEntries.length > 0) {
        briefStatus = "limited";
        briefAccentColor = "amber";
    } else if (confidenceScore >= 0.8 || confidenceScore >= 80) {
        briefStatus = "success";
        briefAccentColor = "teal";
    } else if (confidenceScore >= 0.5 || confidenceScore >= 50) {
        briefStatus = "limited";
        briefAccentColor = "amber";
    } else {
        briefStatus = "error";
        briefAccentColor = "red";
    }

    return {
        header: {
            title, // Legacy title field
            signal: {
                strength: signalStrength,
                bars,
                color,
                label,
                confidenceScore,
            },
            safeMode,
            limitationsMode,
            limitationsReason,
        },
        meta: {
            title: primaryTitle,
        },
        metadata: {
            runId: null,
            timestamp: null,
            generatedBy: null,
        },
        navigation,
        traceability: {
            textSegments
        },
        validationErrors: {
            rawErrors,
            guidanceEntries
        },
        brief: {
            headline: briefHeadline,
            keyFinding: briefKeyFinding,
            decision: briefDecision,
            status: briefStatus,
            accentColor: briefAccentColor
        }
    };
}

// Helper to filter suppressed sections
export function filterSuppressedSections(sections: any[]) {
    return sections.filter(section => {
        const content = section.content?.toLowerCase() || "";
        if (content.includes("suppressed due to confidence")) return false;
        if (content.includes("suppressed due to validation")) return false;
        if (content.trim().length === 0) return false;
        return true;
    });
}
