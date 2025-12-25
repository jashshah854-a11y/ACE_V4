import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Target,
  PieChart,
} from "lucide-react";

interface ValueMetrics {
  total_value: number;
  avg_value: number;
  median_value: number;
  top_10_percent_value: number;
  value_concentration: number;
}

interface CLVProxy {
  avg_value_per_record: number;
  estimated_total_value: number;
  high_value_threshold: number;
  high_value_count: number;
}

interface SegmentValue {
  segment: string;
  total_value: number;
  avg_value: number;
  size: number;
  value_per_member: number;
  value_contribution_pct: number;
}

interface ChurnRisk {
  at_risk_count: number;
  at_risk_percentage: number;
  avg_activity: number;
  low_activity_threshold: number;
}

interface BusinessIntelligenceProps {
  valueMetrics?: ValueMetrics;
  clvProxy?: CLVProxy;
  segmentValue?: SegmentValue[];
  churnRisk?: ChurnRisk;
  insights?: string[];
  evidence?: {
    value_column?: string;
    segment_value_column?: string;
    churn_activity_column?: string;
  };
}

export function BusinessIntelligenceDashboard({
  valueMetrics,
  clvProxy,
  segmentValue,
  churnRisk,
  insights,
  evidence,
}: BusinessIntelligenceProps) {
  if (!valueMetrics && !clvProxy && !segmentValue && !churnRisk) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            Business Intelligence
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Value analysis and business metrics
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {insights && insights.length > 0 && (
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 space-y-2">
              {insights.map((insight, idx) => (
                <p key={idx} className="text-sm text-blue-900 font-medium">
                  {insight}
                </p>
              ))}
            </div>
          )}

          {valueMetrics && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Value Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard
                  label="Total Value"
                  value={formatCurrency(valueMetrics.total_value)}
                  icon={<DollarSign className="h-5 w-5 text-green-600" />}
                  bgColor="bg-green-50"
                  textColor="text-green-900"
                />
                <MetricCard
                  label="Average Value"
                  value={formatCurrency(valueMetrics.avg_value)}
                  icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                  bgColor="bg-blue-50"
                  textColor="text-blue-900"
                />
                <MetricCard
                  label="Median Value"
                  value={formatCurrency(valueMetrics.median_value)}
                  icon={<PieChart className="h-5 w-5 text-purple-600" />}
                  bgColor="bg-purple-50"
                  textColor="text-purple-900"
                />
                <MetricCard
                  label="Top 10% Threshold"
                  value={formatCurrency(valueMetrics.top_10_percent_value)}
                  icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
                  bgColor="bg-amber-50"
                  textColor="text-amber-900"
                />
                <MetricCard
                  label="Value Concentration"
                  value={valueMetrics.value_concentration.toFixed(3)}
                  subtitle="Gini coefficient"
                  icon={<PieChart className="h-5 w-5 text-slate-600" />}
                  bgColor="bg-slate-50"
                  textColor="text-slate-900"
                />
              </div>
            </div>
          )}

          {clvProxy && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customer Lifetime Value
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MetricCard
                  label="Avg Value per Customer"
                  value={formatCurrency(clvProxy.avg_value_per_record)}
                  bgColor="bg-indigo-50"
                  textColor="text-indigo-900"
                />
                <MetricCard
                  label="High-Value Customers"
                  value={formatNumber(clvProxy.high_value_count)}
                  subtitle={`Threshold: ${formatCurrency(clvProxy.high_value_threshold)}`}
                  bgColor="bg-emerald-50"
                  textColor="text-emerald-900"
                />
              </div>
            </div>
          )}

          {segmentValue && segmentValue.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Segment Value Contribution
              </h4>
              <div className="space-y-2">
                {segmentValue.slice(0, 5).map((segment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-shadow"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-medium">
                          {segment.segment}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(segment.size)} members
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Avg: {formatCurrency(segment.avg_value)} per member
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {segment.value_contribution_pct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(segment.total_value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {churnRisk && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Churn Risk Analysis
              </h4>
              {churnRisk.at_risk_percentage > 25 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">
                      {formatNumber(churnRisk.at_risk_count)} records (
                      {churnRisk.at_risk_percentage.toFixed(1)}%) show low activity
                    </span>
                    <br />
                    These customers may be at risk of churn and require attention.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <MetricCard
                    label="At-Risk Count"
                    value={formatNumber(churnRisk.at_risk_count)}
                    subtitle={`${churnRisk.at_risk_percentage.toFixed(1)}% of total`}
                    bgColor="bg-yellow-50"
                    textColor="text-yellow-900"
                  />
                  <MetricCard
                    label="Avg Activity"
                    value={churnRisk.avg_activity.toFixed(2)}
                    bgColor="bg-slate-50"
                    textColor="text-slate-900"
                  />
                  <MetricCard
                    label="Low Activity Threshold"
                    value={churnRisk.low_activity_threshold.toFixed(2)}
                    bgColor="bg-slate-50"
                    textColor="text-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {(evidence?.value_column || evidence?.segment_value_column || evidence?.churn_activity_column) && (
            <div className="border rounded-lg p-3 bg-white/70 text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">Evidence (source columns)</div>
              {evidence?.value_column && <div>Value column: <code>{evidence.value_column}</code></div>}
              {evidence?.segment_value_column && <div>Segment value column: <code>{evidence.segment_value_column}</code></div>}
              {evidence?.churn_activity_column && <div>Churn/activity column: <code>{evidence.churn_activity_column}</code></div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  bgColor?: string;
  textColor?: string;
}

function MetricCard({
  label,
  value,
  subtitle,
  icon,
  bgColor = "bg-slate-50",
  textColor = "text-slate-900",
}: MetricCardProps) {
  return (
    <div className={`p-4 ${bgColor} rounded-lg border border-slate-200`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && <div>{icon}</div>}
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
