/**
 * Strict TypeScript interfaces for Enhanced Analytics
 * 
 * Replaces `any` types in reportParser.ts to prevent type-confusion crashes
 * during Phase IV integration.
 */

export interface ValueMetrics {
    total_value: number;
    avg_value: number;
    median_value: number;
    top_10_percent_value: number;
    value_concentration: number;
}

export interface CLVProxy {
    avg_value_per_record: number;
    high_value_threshold: number;
    high_value_count: number;
}

export interface SegmentValue {
    segment: string;
    total_value: number;
    avg_value: number;
    size: number;
    value_contribution_pct: number;
}

export interface ChurnRisk {
    at_risk_count: number;
    at_risk_percentage: number;
    avg_activity: number;
    low_activity_threshold: number;
}

export interface BusinessIntelligence {
    available: boolean;
    value_metrics?: ValueMetrics;
    clv_proxy?: CLVProxy;
    segment_value?: SegmentValue[];
    churn_risk?: ChurnRisk;
    evidence?: {
        value_column?: string;
        churn_activity_column?: string;
    };
    insights?: string[];
}

export interface CorrelationPair {
    feature1: string;
    feature2: string;
    pearson: number;
    spearman?: number;
    strength: 'very_strong' | 'strong' | 'moderate' | 'weak';
    direction: 'positive' | 'negative';
}

export interface CorrelationAnalysis {
    available: boolean;
    total_correlations: number;
    strong_correlations: CorrelationPair[];
    insights?: string[];
}

export interface DistributionData {
    distribution_type: 'normal' | 'skewed' | 'uniform' | 'bimodal';
    skewness: number;
    kurtosis: number;
    outlier_percentage: number;
    mean: number;
    median: number;
    std: number;
}

export interface DistributionAnalysis {
    available: boolean;
    distributions: Record<string, DistributionData>;
    insights?: string[];
}

export interface QualityMetrics {
    available: boolean;
    overall_completeness: number;
    total_records: number;
    total_features: number;
    numeric_features: number;
    categorical_features: number;
    insights?: string[];
}

export interface FeatureImportanceItem {
    rank: number;
    feature: string;
    importance: number;
}

export interface FeatureImportance {
    available: boolean;
    target: string;
    task_type: 'regression' | 'classification';
    cv_score_mean: number;
    feature_importance: FeatureImportanceItem[];
    insights?: string[];
}

/**
 * Complete Enhanced Analytics structure from backend
 */
export interface EnhancedAnalyticsData {
    business_intelligence?: BusinessIntelligence;
    correlation_analysis?: CorrelationAnalysis;
    distribution_analysis?: DistributionAnalysis;
    quality_metrics?: QualityMetrics;
    feature_importance?: FeatureImportance;
}

/**
 * Type guard to check if enhanced analytics is valid
 */
export function isValidEnhancedAnalytics(data: unknown): data is EnhancedAnalyticsData {
    if (!data || typeof data !== 'object') return false;

    const analytics = data as EnhancedAnalyticsData;

    // At least one analysis type should be available
    return !!(
        analytics.business_intelligence?.available ||
        analytics.correlation_analysis?.available ||
        analytics.distribution_analysis?.available ||
        analytics.quality_metrics?.available ||
        analytics.feature_importance?.available
    );
}
