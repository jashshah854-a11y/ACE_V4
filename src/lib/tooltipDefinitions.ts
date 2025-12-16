/**
 * Tooltip definitions for technical terms
 * Plain language explanations for non-technical users
 */

export interface TooltipDefinition {
    term: string;
    explanation: string;
    example?: string;
}

export const TECHNICAL_TOOLTIPS: Record<string, TooltipDefinition> = {
    silhouette_score: {
        term: "Silhouette Score",
        explanation: "Measures how well-separated your data groups are. Higher means clearer distinctions between groups.",
        example: "0.7+ is excellent, 0.5-0.7 is good, below 0.5 needs review"
    },

    r_squared: {
        term: "R² (R-Squared)",
        explanation: "Percentage of outcome variation explained by the model. Shows prediction reliability.",
        example: "70%+ means the model can predict well, below 30% means unreliable predictions"
    },

    rmse: {
        term: "RMSE (Root Mean Square Error)",
        explanation: "Average size of prediction mistakes. Lower is better.",
        example: "If predicting sales of $1000, RMSE of $50 means typical error is ±$50"
    },

    mae: {
        term: "MAE (Mean Absolute Error)",
        explanation: "Typical size of prediction errors. More intuitive than RMSE.",
        example: "MAE of 10 means predictions are typically off by 10 units"
    },

    cluster: {
        term: "Cluster",
        explanation: "A group of similar data points discovered by AI. Members share common characteristics.",
        example: "Customer Cluster 1 might be 'high-value frequent buyers'"
    },

    anomaly: {
        term: "Anomaly",
        explanation: "Data point that doesn't fit normal patterns. Could indicate errors, outliers, or special cases.",
        example: "A $10,000 transaction when typical is $50"
    },

    persona: {
        term: "Persona",
        explanation: "A behavioral archetype representing a group with similar characteristics and patterns.",
        example: "'Power Users' who engage daily vs 'Casual Users' who visit monthly"
    },

    confidence: {
        term: "Confidence Level",
        explanation: "How certain the analysis is about its findings. Higher means more reliable.",
        example: "90%+ confidence means very reliable, below 60% needs caution"
    },

    data_quality: {
        term: "Data Quality Score",
        explanation: "Overall health of your dataset: completeness, consistency, and validity.",
        example: "90%+ is excellent, 70-90% is good, below 70% needs improvement"
    },

    feature_importance: {
        term: "Feature Importance",
        explanation: "Which data fields matter most for predictions. Helps focus on what drives outcomes.",
        example: "'Account Age' might be 40% of what predicts customer retention"
    }
};

/**
 * Get tooltip for a technical term
 */
export function getTooltip(term: string): TooltipDefinition | undefined {
    const normalized = term.toLowerCase().replace(/\s+/g, '_');
    return TECHNICAL_TOOLTIPS[normalized];
}

/**
 * Check if a term has a tooltip definition
 */
export function hasTooltip(term: string): boolean {
    return getTooltip(term) !== undefined;
}
