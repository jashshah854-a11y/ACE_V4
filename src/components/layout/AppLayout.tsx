import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Upload, FileText } from "lucide-react";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="text-lg font-bold tracking-tight">
            ACE Analysis
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                location.pathname === "/" || location.pathname === "/upload"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Upload className="w-4 h-4" />
              New Analysis
            </Link>
            <Link
              to="/reports"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                location.pathname === "/reports"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <FileText className="w-4 h-4" />
              Reports
            </Link>
          </div>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
