import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CorrelationData {
  feature1: string;
  feature2: string;
  pearson: number;
  spearman: number;
  strength: string;
  direction: string;
}

interface CorrelationHeatmapProps {
  correlations: CorrelationData[];
  insights?: string[];
}

export function CorrelationHeatmap({ correlations, insights }: CorrelationHeatmapProps) {
  if (!correlations || correlations.length === 0) {
    return null;
  }

  const getStrengthColor = (strength: string) => {
    switch (strength.toLowerCase()) {
      case "very_strong":
      case "very strong":
        return "bg-blue-600 text-white";
      case "strong":
        return "bg-blue-500 text-white";
      case "moderate":
        return "bg-blue-400 text-white";
      default:
        return "bg-slate-300 text-slate-700";
    }
  };

  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.8) return "text-blue-700 font-bold";
    if (absValue >= 0.6) return "text-blue-600 font-semibold";
    if (absValue >= 0.4) return "text-blue-500";
    return "text-slate-600";
  };

  const DirectionIcon = ({ direction }: { direction: string }) => {
    if (direction === "positive") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (direction === "negative") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Statistical Correlations</CardTitle>
        <p className="text-sm text-muted-foreground">
          Discover relationships between features in your data
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights && insights.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            {insights.map((insight, idx) => (
              <p key={idx} className="text-sm text-blue-900">
                {insight}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {correlations.slice(0, 10).map((corr, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{corr.feature1}</span>
                  <DirectionIcon direction={corr.direction} />
                  <span className="font-medium text-sm">{corr.feature2}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStrengthColor(corr.strength)} variant="secondary">
                    {corr.strength.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {corr.direction} relationship
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold ${getCorrelationColor(corr.pearson)}`}>
                  {corr.pearson > 0 ? "+" : ""}{corr.pearson.toFixed(3)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Pearson r
                </div>
              </div>
            </div>
          ))}
        </div>

        {correlations.length > 10 && (
          <p className="text-sm text-center text-muted-foreground pt-2">
            Showing top 10 of {correlations.length} significant correlations
          </p>
        )}
      </CardContent>
    </Card>
  );
}
