import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";

interface DistributionData {
  [feature: string]: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    skewness: number;
    kurtosis: number;
    is_normal: boolean;
    distribution_type: string;
    outlier_count: number;
    outlier_percentage: number;
  };
}

interface DistributionChartsProps {
  distributions: DistributionData;
  insights?: string[];
}

export function DistributionCharts({ distributions, insights }: DistributionChartsProps) {
  if (!distributions || Object.keys(distributions).length === 0) {
    return null;
  }

  const getDistributionBadgeVariant = (type: string) => {
    switch (type) {
      case "normal":
        return "default";
      case "right_skewed":
      case "left_skewed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getDistributionLabel = (type: string) => {
    return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatNumber = (num: number) => {
    if (Math.abs(num) >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (Math.abs(num) >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    } else if (Math.abs(num) < 0.01 && num !== 0) {
      return num.toExponential(2);
    }
    return num.toFixed(2);
  };

  const entries = Object.entries(distributions);
  const interestingDistributions = entries.filter(
    ([_, data]) => data.outlier_percentage > 5 || Math.abs(data.skewness) > 1
  );

  const normalDistributions = entries.filter(([_, data]) => data.is_normal);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Distribution Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Statistical properties of {entries.length} numeric features
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights && insights.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
            {insights.map((insight, idx) => (
              <p key={idx} className="text-sm text-foreground">
                {insight}
              </p>
            ))}
          </div>
        )}

        <div className="grid gap-3">
          <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="font-medium text-foreground">Normal Distributions</span>
            </div>
            <span className="text-2xl font-bold text-emerald-500">
              {normalDistributions.length}
            </span>
          </div>

          {interestingDistributions.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-foreground">Features with Outliers</span>
              </div>
              <span className="text-2xl font-bold text-orange-500">
                {interestingDistributions.length}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground">Feature Statistics</h4>

          {entries.slice(0, 8).map(([feature, data]) => (
            <div
              key={feature}
              className="p-4 bg-muted/50 rounded-lg space-y-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h5 className="font-semibold text-sm text-foreground">{feature}</h5>
                  <Badge variant={getDistributionBadgeVariant(data.distribution_type)}>
                    {getDistributionLabel(data.distribution_type)}
                  </Badge>
                </div>
                {data.outlier_percentage > 10 && (
                  <Badge variant="destructive" className="text-xs">
                    {data.outlier_percentage.toFixed(1)}% outliers
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Mean</p>
                  <p className="font-semibold text-foreground">{formatNumber(data.mean)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Median</p>
                  <p className="font-semibold text-foreground">{formatNumber(data.median)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Std Dev</p>
                  <p className="font-semibold text-foreground">{formatNumber(data.std)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-muted-foreground text-xs">Range</p>
                  <p className="font-semibold text-xs text-foreground">
                    {formatNumber(data.min)} to {formatNumber(data.max)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Skewness</p>
                  <p className="font-semibold text-foreground">{data.skewness.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Kurtosis</p>
                  <p className="font-semibold text-foreground">{data.kurtosis.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {entries.length > 8 && (
          <p className="text-sm text-center text-muted-foreground pt-2">
            Showing 8 of {entries.length} features
          </p>
        )}
      </CardContent>
    </Card>
  );
}
