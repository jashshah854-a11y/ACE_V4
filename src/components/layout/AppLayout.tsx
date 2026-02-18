import { Link, useLocation } from "react-router-dom";
import { Upload, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { AceLogo } from "@/components/ui/AceLogo";

const NAV_ITEMS = [
  { to: "/", label: "Upload", icon: Upload },
  { to: "/history", label: "History", icon: History },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 shrink-0">
              <AceLogo size="sm" mode="icon" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight leading-none text-foreground">
                ACE
              </span>
              <span className="text-[10px] text-muted-foreground leading-none tracking-widest uppercase mt-0.5">
                Automated Curiosity Engine
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <AceLogo size="sm" mode="icon" />
            <span>ACE v4 — Automated Curiosity Engine</span>
          </div>
          <span>20-Agent AI Pipeline</span>
        </div>
      </footer>
    </div>
  );
}
