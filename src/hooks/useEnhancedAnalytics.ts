import { useRemoteArtifact } from '@/hooks/useRemoteArtifact';

interface EnhancedAnalytics {
  correlation_analysis?: {
    available: boolean;
    strong_correlations?: any[];
    insights?: string[];
  };
  distribution_analysis?: {
    available: boolean;
    distributions?: Record<string, any>;
    insights?: string[];
  };
  business_intelligence?: {
    available: boolean;
    value_metrics?: any;
    clv_proxy?: any;
    segment_value?: any[];
    churn_risk?: any;
    insights?: string[];
  };
  feature_importance?: {
    available: boolean;
    feature_importance?: any[];
    target?: string;
    insights?: string[];
  };
  quality_metrics?: {
    available: boolean;
    overall_completeness?: number;
    total_records?: number;
    insights?: string[];
  };
}

export function useEnhancedAnalytics(runId?: string) {
  // Pass relative path "enhanced-analytics"; useRemoteArtifact prepends /runs/{runId}/
  const { data, loading, error } = useRemoteArtifact<EnhancedAnalytics>(runId, "enhanced-analytics");
  return { data, loading, error };
}
