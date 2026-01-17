import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AceLogo } from "@/components/ui/AceLogo";
import { Sparkles, FileText, Upload, Beaker } from "lucide-react";
import { useTaskContext } from "@/context/TaskContext";

export const Navbar = () => {
  const location = useLocation();
  const { primaryQuestion, successCriteria } = useTaskContext();

  const isPulse = location.pathname.includes("/report");
  const isUpload = location.pathname === "/" || location.pathname === "/upload";
  const isReports = location.pathname.includes("/reports") || location.pathname.includes("/pipeline");
  const isSafeMode = false; // logic placeholder

  const reportsHref = "/reports";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container flex flex-col gap-2 px-4 py-3 group">
        <div className="flex h-12 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <AceLogo size="md" />
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                location.pathname === "/"
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Upload className="w-4 h-4" />
              New Mission
            </Link>

            <Link
              to={location.pathname.includes("/report/") ? location.pathname.replace("/report/", "/lab/") : "/lab"}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                location.pathname.includes("/lab")
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Beaker className="w-4 h-4" />
              Lab
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
            <Link
              to="/about"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                location.pathname.includes("/about")
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:hover:bg-muted/50"
              )}
            >
              <Sparkles className="w-4 h-4" />
              About
            </Link>

            {/* Logo Mark (Right Side) removed as requested */}
          </div>
        </div>

        {(primaryQuestion || successCriteria) && (
          <div className="text-xs text-muted-foreground truncate flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {primaryQuestion && (
              <span className="truncate" title={primaryQuestion}>
                <span className="font-semibold text-foreground mr-1">Primary Decision:</span>
                {primaryQuestion}
              </span>
            )}
            {successCriteria && (
              <span className="truncate text-emerald-700 dark:text-emerald-300" title={successCriteria}>
                <span className="font-semibold text-foreground mr-1">Success Signal:</span>
                {successCriteria}
              </span>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};


