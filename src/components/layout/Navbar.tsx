import { Link, useLocation } from "react-router-dom";
import { BarChart3, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecentReports } from "@/lib/localStorage";
import { useTaskContext } from "@/context/TaskContext";

export const Navbar = () => {
  const location = useLocation();
  const { primaryQuestion } = useTaskContext();

  const isPulse = location.pathname === "/" || location.pathname.startsWith("/report/summary");
  const isUpload = location.pathname.startsWith("/upload");
  const isReports = location.pathname.startsWith("/reports");

  const lastRunId = getRecentReports()[0]?.runId;
  const reportsHref = lastRunId ? `/reports?run=${lastRunId}` : "/reports";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container flex flex-col gap-2 px-4 py-3">
        <div className="flex h-12 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              {/* Logo mark with gradient */}
              <div className="w-10 h-10 rounded-xl gradient-meridian flex items-center justify-center shadow-lg glow-primary transition-transform duration-300 group-hover:scale-105">
                <BarChart3 className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              {/* Subtle accent dot */}
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-card" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-navy-900">Meridian</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-medium hidden sm:block">
                Data Intelligence
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Link
              to="/report/summary"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isPulse
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Pulse
            </Link>
            <Link
              to="/upload"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isUpload
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              Upload
            </Link>
            <Link
              to={reportsHref}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isReports
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <FileText className="w-4 h-4" />
              Reports
            </Link>
          </div>
        </div>

        <div className="text-xs text-muted-foreground truncate" title={primaryQuestion || "Awaiting task contract"}>
          <span className="font-semibold text-foreground mr-1">Primary Decision:</span>
          {primaryQuestion || "Awaiting task contract"}
        </div>
      </div>
    </nav>
  );
};
