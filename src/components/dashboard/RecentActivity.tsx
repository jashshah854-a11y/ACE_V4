import { CheckCircle, Database, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "clean" | "report" | "scan" | "fix";
  title: string;
  description: string;
  timestamp: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "fix",
    title: "Auto-fixed 234 duplicate records",
    description: "Merged duplicate entries in customers table",
    timestamp: "10 min ago",
  },
  {
    id: "2",
    type: "report",
    title: "Weekly Quality Report Generated",
    description: "Comprehensive analysis of all data sources",
    timestamp: "1 hour ago",
  },
  {
    id: "3",
    type: "scan",
    title: "Full Database Scan Completed",
    description: "Analyzed 2.3M records across 45 tables",
    timestamp: "3 hours ago",
  },
  {
    id: "4",
    type: "clean",
    title: "Data Normalization Complete",
    description: "Standardized phone number formats",
    timestamp: "5 hours ago",
  },
  {
    id: "5",
    type: "fix",
    title: "Resolved orphaned references",
    description: "Fixed 89 broken foreign key relationships",
    timestamp: "8 hours ago",
  },
];

const typeConfig: Record<Activity["type"], { icon: typeof CheckCircle; color: string; bg: string }> = {
  clean: { icon: Database, color: "text-primary", bg: "bg-primary/10" },
  report: { icon: FileText, color: "text-accent", bg: "bg-accent/10" },
  scan: { icon: Zap, color: "text-warning", bg: "bg-warning/10" },
  fix: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
};

export function RecentActivity() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Latest autonomous operations
        </p>
      </div>

      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

          {/* Activities */}
          <div className="space-y-4">
            {activities.map((activity) => {
              const ActivityIcon = typeConfig[activity.type].icon;
              
              return (
                <div key={activity.id} className="relative flex gap-4">
                  <div className={cn(
                    "relative z-10 p-2 rounded-full shrink-0",
                    typeConfig[activity.type].bg
                  )}>
                    <ActivityIcon className={cn(
                      "h-4 w-4",
                      typeConfig[activity.type].color
                    )} />
                  </div>
                  
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
