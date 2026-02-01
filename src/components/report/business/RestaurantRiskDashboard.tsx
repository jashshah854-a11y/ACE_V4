import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, ShieldAlert } from "lucide-react";
import type { RestaurantRiskReport } from "@/types/reportTypes";

interface RestaurantRiskDashboardProps {
  data?: RestaurantRiskReport;
}

export function RestaurantRiskDashboard({ data }: RestaurantRiskDashboardProps) {
  if (!data || data.available !== true || !data.top_risk_restaurants?.length) {
    return null;
  }

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatDate = (value?: string) => {
    if (!value) return "n/a";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          Restaurant Risk Dashboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {data.definition}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-amber-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Restaurants at risk</p>
            <p className="text-2xl font-semibold text-slate-900">{data.restaurants_at_risk.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              out of {data.restaurants_total.toLocaleString()} ({formatPercent(data.at_risk_percentage)})
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">As of</p>
            <p className="text-2xl font-semibold text-slate-900">{formatDate(data.as_of)}</p>
            <p className="text-xs text-muted-foreground">Latest inspection date in scope</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Risk drivers</p>
            <p className="text-sm text-slate-700 mt-2">
              Critical violations in the most recent inspection trigger risk.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Highest-risk restaurants (latest inspection)
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-amber-100/60 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Restaurant</th>
                  <th className="px-3 py-2 text-left">Location</th>
                  <th className="px-3 py-2 text-left">Cuisine</th>
                  <th className="px-3 py-2 text-right">Criticals</th>
                  <th className="px-3 py-2 text-right">Score</th>
                  <th className="px-3 py-2 text-right">Grade</th>
                  <th className="px-3 py-2 text-right">Last inspection</th>
                </tr>
              </thead>
              <tbody>
                {data.top_risk_restaurants.map((row) => (
                  <tr key={row.restaurant_id} className="border-t border-amber-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">ID {row.restaurant_id}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-amber-600" />
                        <span>{row.boro || ""}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{row.address || ""}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.cuisine || "n/a"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Badge variant="destructive">{row.critical_count}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {typeof row.score === "number" ? row.score.toFixed(0) : "n/a"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {row.grade || "n/a"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {formatDate(row.last_inspection_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(data.risk_by_boro?.length || data.risk_by_cuisine?.length) && (
          <div className="grid gap-4 md:grid-cols-2">
            {data.risk_by_boro?.length ? (
              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-700">Risk by borough</div>
                <div className="mt-3 space-y-2">
                  {data.risk_by_boro.map((item) => (
                    <div key={item.boro} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.boro}</span>
                      <span className="text-slate-900">
                        {item.at_risk_count}/{item.total_restaurants} ({formatPercent(item.at_risk_percentage)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {data.risk_by_cuisine?.length ? (
              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-700">Risk by cuisine (top)</div>
                <div className="mt-3 space-y-2">
                  {data.risk_by_cuisine.map((item) => (
                    <div key={item.cuisine} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.cuisine}</span>
                      <span className="text-slate-900">
                        {item.at_risk_count}/{item.total_restaurants} ({formatPercent(item.at_risk_percentage)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
