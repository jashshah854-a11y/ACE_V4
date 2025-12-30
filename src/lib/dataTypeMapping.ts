/**
 * Data Type Mapping & Natural Language Translator
 * Maps technical data types to human-readable names and suggested actions
 */

export interface DataTypeMapping {
    friendlyName: string;
    focusArea: string;
    starterChips: string[];
    requiredColumns?: string[];
}

/**
 * Primary Type Mappings
 */
export const PRIMARY_TYPE_MAP: Record<string, DataTypeMapping> = {
    marketing_performance: {
        friendlyName: "Marketing Performance",
        focusArea: "campaign effectiveness and ROI",
        starterChips: [
            "Optimize marketing budget allocation",
            "Identify high-performing campaigns",
            "Reduce customer acquisition cost",
            "Improve campaign ROI"
        ],
        requiredColumns: ["Revenue", "Campaign", "Cost"]
    },
    time_series_trend: {
        friendlyName: "Historical Trend",
        focusArea: "patterns over time",
        starterChips: [
            "Forecast future performance",
            "Identify seasonal patterns",
            "Detect anomalies in trends",
            "Predict upcoming changes"
        ],
        requiredColumns: ["Date", "DatePosted", "Timestamp"]
    },
    customer_churn: {
        friendlyName: "Customer Retention",
        focusArea: "customer retention and churn prevention",
        starterChips: [
            "Identify at-risk customers",
            "Reduce churn rate",
            "Improve customer lifetime value",
            "Target retention campaigns"
        ],
        requiredColumns: ["Churn", "Status", "Active"]
    },
    sales_pipeline: {
        friendlyName: "Sales Performance",
        focusArea: "sales conversion and pipeline health",
        starterChips: [
            "Optimize sales funnel",
            "Improve conversion rates",
            "Identify bottlenecks",
            "Forecast revenue"
        ],
        requiredColumns: ["Deal", "Stage", "Revenue"]
    },
    product_analytics: {
        friendlyName: "Product Usage",
        focusArea: "user behavior and feature adoption",
        starterChips: [
            "Improve feature engagement",
            "Identify power user patterns",
            "Reduce feature abandonment",
            "Optimize user onboarding"
        ],
        requiredColumns: ["Feature", "UserId", "Event"]
    }
};

/**
 * Key Column to Focus Area Mapping
 */
export const COLUMN_FOCUS_MAP: Record<string, string> = {
    Revenue: "financial outcomes",
    Cost: "cost optimization",
    Churn: "retention analysis",
    Conversion: "conversion optimization",
    Engagement: "user engagement",
    Satisfaction: "customer satisfaction",
    NPS: "customer loyalty",
    Lifetime: "customer lifetime value"
};

/**
 * Get friendly name for a primary type
 */
export function getFriendlyName(primaryType: string): string {
    const normalized = primaryType.toLowerCase().replace(/-/g, "_");
    const mapping = PRIMARY_TYPE_MAP[normalized];

    if (mapping) return mapping.friendlyName;

    // Fallback: Format the raw type
    return primaryType
        .split(/[_-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Get focus area from key columns
 */
export function getFocusArea(keyColumns: string[]): string {
    for (const column of keyColumns) {
        const focus = COLUMN_FOCUS_MAP[column];
        if (focus) return focus;
    }

    // Default focus
    return "data insights and patterns";
}

/**
 * Get starter chips for a data type
 */
export function getStarterChips(primaryType: string, keyColumns: string[]): string[] {
    const normalized = primaryType.toLowerCase().replace(/-/g, "_");
    const mapping = PRIMARY_TYPE_MAP[normalized];

    if (mapping) return mapping.starterChips;

    // Generic fallback
    return [
        "Identify key patterns",
        "Discover actionable insights",
        "Optimize performance",
        "Reduce inefficiencies"
    ];
}

/**
 * Detect gaps between user intent and data reality
 */
export interface GapDetection {
    hasGap: boolean;
    gapType?: 'missing_time' | 'missing_target' | 'insufficient_quality';
    message?: string;
    canProceed: boolean;
}

export function detectIntentGaps(
    userIntent: string,
    profileData: {
        timeCoverage?: 'valid' | 'issue';
        keyColumns: string[];
        qualityScore: number;
        validationMode: 'full' | 'limitations';
    }
): GapDetection {
    const intent = userIntent.toLowerCase();

    // Check for forecast/prediction without time data
    if ((intent.includes('forecast') || intent.includes('predict') || intent.includes('future'))
        && profileData.timeCoverage === 'issue') {
        return {
            hasGap: true,
            gapType: 'missing_time',
            message: "You asked for a Forecast, but I don't see a valid Date column in this file. I can run the analysis, but it will be limited to Descriptive Trends only.",
            canProceed: true
        };
    }

    // Check for optimization without clear target
    if (intent.includes('optimize') && !profileData.keyColumns.some(col =>
        ['Revenue', 'Cost', 'Conversion', 'Churn'].includes(col)
    )) {
        return {
            hasGap: true,
            gapType: 'missing_target',
            message: "You mentioned optimization, but I don't see clear outcome columns (like Revenue or Conversion). I'll do my best to identify patterns.",
            canProceed: true
        };
    }

    // Check for quality issues
    if (profileData.qualityScore < 0.5 && profileData.validationMode === 'limitations') {
        return {
            hasGap: true,
            gapType: 'insufficient_quality',
            message: "This dataset has quality issues. Predictive modeling will be disabled. You'll receive descriptive statistics only.",
            canProceed: true
        };
    }

    return { hasGap: false, canProceed: true };
}
