import { Link, useLocation } from "react-router-dom";
import { Activity, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecentReports } from "@/lib/localStorage";

export const Navbar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const lastRunId = getRecentReports()[0]?.runId;
  const reportsHref = lastRunId ? `/reports?run=${lastRunId}` : "/reports";
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg gradient-meridian flex items-center justify-center shadow-lg glow-primary">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">Meridian</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:block">
              Data Intelligence
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-1">
          <Link 
            to="/" 
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              isActive("/") 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Upload
          </Link>
          <Link 
            to={reportsHref}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
              isActive("/reports") 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <FileText className="w-4 h-4" />
            Reports
          </Link>
        </div>
      </div>
    </nav>
  );
};
