import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api-client';

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
  const [data, setData] = useState<EnhancedAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setData(null);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/runs/${runId}/enhanced-analytics`);

        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            return;
          }
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        try {
          const analyticsData = await response.json();
          setData(analyticsData);
        } catch (parseError) {
          console.error('Failed to parse enhanced analytics JSON:', parseError);
          setData(null);
        }
      } catch (err) {
        console.warn('Enhanced analytics not available:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [runId]);

  return { data, loading, error };
}
