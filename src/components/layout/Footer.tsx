import { BarChart3 } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-8 px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-meridian flex items-center justify-center shadow-sm">
              <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-navy-900">Meridian</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Meridian · Intelligent Data Analysis Platform
          </p>
        </div>
      </div>
    </footer>
  );
};
