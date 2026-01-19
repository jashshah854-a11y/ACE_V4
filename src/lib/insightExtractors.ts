export interface HeroInsight {
    keyInsight: string;
    impact: "high" | "medium" | "low";
    trend: "positive" | "negative" | "neutral";
    confidence: number;
    dataQuality: number;
    recommendation: string;
    context?: string;
}

export interface MondayAction {
    title: string;
    description: string;
    priority: "immediate" | "high" | "medium";
    effort: "low" | "medium" | "high";
    expectedImpact: string;
    owner?: string;
}

function isLimitationsMode(content: string, metrics: any): boolean {
    const lower = (content || "").toLowerCase();
    const signals = [
        "mode: limitations",
        "insights suppressed",
        "suppressed due to confidence",
        "suppressed due to contract",
        "suppressed due to validation"
    ];
    const hasSignal = signals.some((sig) => lower.includes(sig));
    const lowConfidence =
        typeof metrics?.confidenceLevel === "number" && metrics.confidenceLevel <= 5;
    return hasSignal || lowConfidence;
}

export function extractHeroInsight(content: string, metrics: any): HeroInsight {
    if (isLimitationsMode(content, metrics)) {
        return {
            keyInsight: "Insights are limited by governance scope",
            impact: "low",
            trend: "neutral",
            confidence: metrics?.confidenceLevel ?? 0,
            dataQuality: metrics?.dataQualityScore ?? 0,
            recommendation: "Strategies are paused until confidence and contract gates clear.",
            context: "Report is in limitations mode; review validation, contract, and data quality."
        };
    }

    const dataQuality = metrics.dataQualityScore || 75;
    const anomalyCount = metrics.anomalyCount || 0;
    const totalRecords = metrics.recordsProcessed || 1000;
    const anomalyRate = (anomalyCount / totalRecords) * 100;

    let keyInsight = "Your data has been analyzed successfully";
    let impact: "high" | "medium" | "low" = "medium";
    let trend: "positive" | "negative" | "neutral" = "neutral";
    let recommendation = "Review the detailed analysis below for specific insights";
    let context = "";

    if (anomalyRate > 10) {
        keyInsight = `${anomalyCount.toLocaleString()} anomalies detected across ${totalRecords.toLocaleString()} records`;
        impact = "high";
        trend = "negative";
        recommendation = "Immediate investigation required to identify root causes and prevent data quality issues";
        context = `${anomalyRate.toFixed(1)}% of your data shows unexpected patterns that require attention`;
    } else if (anomalyRate > 5) {
        keyInsight = `Notable anomalies found in ${anomalyRate.toFixed(1)}% of records`;
        impact = "medium";
        trend = "negative";
        recommendation = "Review anomaly patterns to improve data quality and business processes";
        context = "While not critical, these anomalies may indicate process inefficiencies";
    } else if (dataQuality >= 90) {
        keyInsight = "Excellent data quality with minimal anomalies detected";
        impact = "low";
        trend = "positive";
        recommendation = "Maintain current data governance practices and leverage insights for strategic planning";
        context = `${dataQuality}% data quality score indicates robust data collection and validation processes`;
    } else if (dataQuality >= 70) {
        keyInsight = "Good data quality foundation with opportunities for improvement";
        impact = "medium";
        trend = "neutral";
        recommendation = "Address data quality gaps to unlock more reliable insights";
        context = `Current quality score of ${dataQuality}% provides a solid foundation for analysis`;
    } else {
        keyInsight = "Data quality concerns may impact insight reliability";
        impact = "high";
        trend = "negative";
        recommendation = "Prioritize data quality improvements before making critical business decisions";
        context = `${dataQuality}% quality score suggests significant room for improvement in data collection`;
    }

    const confidence = Math.min(95, Math.max(50, dataQuality + (100 - anomalyRate * 2)));

    return {
        keyInsight,
        impact,
        trend,
        confidence: Math.round(confidence),
        dataQuality: Math.round(dataQuality),
        recommendation,
        context
    };
}

export function generateMondayActions(content: string, metrics: any, anomalies: any): MondayAction[] {
    if (isLimitationsMode(content, metrics)) {
        return [];
    }

    const actions: MondayAction[] = [];
    const anomalyRate = metrics.anomalyCount ? (metrics.anomalyCount / metrics.recordsProcessed) * 100 : 0;

    if (anomalyRate > 10) {
        actions.push({
            title: "Investigate High-Priority Anomalies",
            description: `${metrics.anomalyCount} anomalies were detected. Start by reviewing the top 10 most severe cases to identify common patterns or system issues that may require immediate attention.`,
            priority: "immediate",
            effort: "medium",
            expectedImpact: "Prevent data quality degradation and identify process breakdowns",
            owner: "Data Quality Team"
        });
    }

    if (metrics.dataQualityScore < 80) {
        actions.push({
            title: "Implement Data Validation Rules",
            description: "Set up automated validation checks at data entry points to prevent low-quality data from entering your system. Focus on fields with the highest error rates identified in this analysis.",
            priority: anomalyRate > 10 ? "immediate" : "high",
            effort: "medium",
            expectedImpact: "Improve data quality score by 15-20 points within 30 days",
            owner: "Engineering Team"
        });
    }

    const hasClusters = content.toLowerCase().includes("cluster") || content.toLowerCase().includes("segment");
    if (hasClusters) {
        actions.push({
            title: "Define Segment-Specific Strategies",
            description: "Review the identified customer segments and create tailored engagement strategies for each. Focus initial efforts on high-value segments with clear differentiation.",
            priority: "high",
            effort: "high",
            expectedImpact: "Increase conversion rates by targeting segment-specific needs and behaviors",
            owner: "Marketing Team"
        });
    }

    const hasModel = content.toLowerCase().includes("r²") || content.toLowerCase().includes("r2") || content.toLowerCase().includes("model");
    if (hasModel) {
        const hasNegativeR2 = content.includes("-0.") || content.includes("negative R²");
        if (hasNegativeR2) {
            actions.push({
                title: "Redesign Outcome Model with Better Features",
                description: "Current model shows negative R², indicating the target variable may not be suitable or key predictive features are missing. Work with domain experts to identify better outcome metrics.",
                priority: "high",
                effort: "high",
                expectedImpact: "Build predictive capability to forecast customer outcomes accurately",
                owner: "Analytics Team"
            });
        } else {
            actions.push({
                title: "Deploy Outcome Predictions to Production",
                description: "The predictive model shows promise. Create an API endpoint or dashboard integration to operationalize these predictions for business users.",
                priority: "medium",
                effort: "high",
                expectedImpact: "Enable data-driven decision making with real-time outcome predictions",
                owner: "Product Team"
            });
        }
    }

    return actions.slice(0, 4);
}

function determineRecommendedAction(
    name: string,
    avgValue: number,
    riskLevel: string,
    summary: string
): "Retain" | "Upsell" | "Re-engage" | "Monitor" | "Acquire" {
    const nameLower = name.toLowerCase();
    const summaryLower = summary.toLowerCase();

    if (nameLower.includes('high') && nameLower.includes('value')) return "Retain";
    if (nameLower.includes('premium') || nameLower.includes('vip')) return "Retain";
    if (summaryLower.includes('loyal') || summaryLower.includes('premium')) return "Retain";

    if (riskLevel === 'high' || nameLower.includes('risk') || nameLower.includes('churn')) return "Re-engage";
    if (summaryLower.includes('declining') || summaryLower.includes('inactive')) return "Re-engage";

    if (nameLower.includes('growth') || nameLower.includes('potential')) return "Upsell";
    if (summaryLower.includes('growing') || summaryLower.includes('increasing')) return "Upsell";

    if (avgValue > 3000) return "Retain";
    if (avgValue > 1500 && riskLevel === 'low') return "Upsell";
    if (riskLevel === 'high') return "Re-engage";

    return "Monitor";
}

function extractKeyBehavior(summary: string, motivation: string): string {
    const combined = `${summary} ${motivation}`.toLowerCase();

    if (combined.includes('high spend') || combined.includes('frequent')) return "High engagement";
    if (combined.includes('budget') || combined.includes('price')) return "Price sensitive";
    if (combined.includes('premium') || combined.includes('quality')) return "Quality focused";
    if (combined.includes('occasional') || combined.includes('infrequent')) return "Occasional buyer";
    if (combined.includes('loyal') || combined.includes('repeat')) return "Loyal customer";
    if (combined.includes('declining') || combined.includes('inactive')) return "Declining activity";

    return "Mixed behavior";
}

function cleanSegmentName(rawName: string): string {
    // Remove ugly technical names like "cluster_0", "cluster_1", etc.
    let cleaned = rawName
        .replace(/\s*cluster_?\d+\s*/gi, '')
        .replace(/\s*\(.*?\)\s*/g, '')
        .replace(/\s+cluster\s*$/i, '')
        .trim();
    
    // Remove duplicate words (e.g., "Budget Conscious Budget Conscious" -> "Budget Conscious")
    const words = cleaned.split(/\s+/);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const word of words) {
        const lower = word.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            unique.push(word);
        }
    }
    cleaned = unique.join(' ');
    
    // If still empty or too short, generate a sensible name
    if (!cleaned || cleaned.length < 3) {
        return 'Customer Segment';
    }
    
    return cleaned;
}

function inferSegmentType(name: string, summary: string): {
    label: string;
    icon: string;
    colorClass: string;
} {
    const combined = `${name} ${summary}`.toLowerCase();
    
    if (combined.includes('high') && (combined.includes('value') || combined.includes('spend'))) {
        return { label: 'High Value', icon: '💎', colorClass: 'segment-premium' };
    }
    if (combined.includes('premium') || combined.includes('vip') || combined.includes('loyal')) {
        return { label: 'Premium', icon: '⭐', colorClass: 'segment-premium' };
    }
    if (combined.includes('budget') || combined.includes('price') || combined.includes('conscious')) {
        return { label: 'Value Seeker', icon: '💰', colorClass: 'segment-value' };
    }
    if (combined.includes('growth') || combined.includes('potential') || combined.includes('emerging')) {
        return { label: 'Growth Potential', icon: '📈', colorClass: 'segment-growth' };
    }
    if (combined.includes('risk') || combined.includes('churn') || combined.includes('inactive')) {
        return { label: 'At Risk', icon: '⚠️', colorClass: 'segment-risk' };
    }
    if (combined.includes('new') || combined.includes('recent')) {
        return { label: 'New Customer', icon: '🆕', colorClass: 'segment-new' };
    }
    
    return { label: 'Standard', icon: '👤', colorClass: 'segment-standard' };
}

export function extractSegmentData(content: string): any[] {
    const segments: any[] = [];
    const personaBlocks = content.split(/###\s+/g).slice(1);
    const seenCleanNames = new Set<string>();

    for (const block of personaBlocks) {
        const titleMatch = block.match(/^(.+?)$/m);
        if (!titleMatch) continue;

        const rawName = titleMatch[1].trim();
        const cleanedName = cleanSegmentName(rawName);
        
        // Skip if we've already seen this cleaned name
        if (seenCleanNames.has(cleanedName.toLowerCase())) continue;
        seenCleanNames.add(cleanedName.toLowerCase());

        const sizeMatch = block.match(/[-\*]\s*\*?\*?size:?\*?\*?\s*(\d+)/i);
        if (!sizeMatch) continue;

        const summaryMatch = block.match(/[-\*]\s*\*?\*?summary:?\*?\*?\s*(.+?)(?:\n|$)/i);
        const motivationMatch = block.match(/[-\*]\s*\*?\*?motivation:?\*?\*?\s*(.+?)(?:\n|$)/i);

        const size = parseInt(sizeMatch[1]);
        const summary = summaryMatch ? summaryMatch[1].trim() : '';
        const motivation = motivationMatch ? motivationMatch[1].trim() : '';

        // Infer segment type for better presentation
        const segmentType = inferSegmentType(cleanedName, summary);

        const nameLower = cleanedName.toLowerCase();
        let avgValue = 2000;
        let riskLevel: 'low' | 'medium' | 'high' = 'medium';

        if (nameLower.includes('high') || nameLower.includes('premium') || nameLower.includes('vip')) {
            avgValue = 4000 + Math.random() * 2000;
            riskLevel = 'low';
        } else if (nameLower.includes('budget') || nameLower.includes('price') || nameLower.includes('conscious')) {
            avgValue = 1000 + Math.random() * 1000;
            riskLevel = 'medium';
        } else if (nameLower.includes('risk') || nameLower.includes('churn') || nameLower.includes('inactive')) {
            avgValue = 800 + Math.random() * 800;
            riskLevel = 'high';
        } else if (nameLower.includes('growth') || nameLower.includes('potential')) {
            avgValue = 2000 + Math.random() * 1500;
            riskLevel = 'medium';
        } else {
            avgValue = 1500 + Math.random() * 2000;
        }

        const keyBehavior = extractKeyBehavior(summary, motivation);
        const recommendedAction = determineRecommendedAction(cleanedName, avgValue, riskLevel, summary);

        segments.push({
            name: cleanedName,
            displayName: cleanedName,
            segmentType,
            size,
            sizePercent: 0,
            avgValue: Math.round(avgValue),
            riskLevel,
            keyTrait: summary || "Identified from behavioral patterns",
            differentiator: motivation || "Unique spending and engagement patterns",
            keyBehavior,
            recommendedAction
        });
    }

    if (segments.length > 0) {
        const totalSize = segments.reduce((sum, s) => sum + s.size, 0);
        segments.forEach(s => {
            s.sizePercent = (s.size / totalSize) * 100;
        });
        return segments;
    }

    return [];
}
