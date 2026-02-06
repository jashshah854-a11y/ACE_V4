import { Activity } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="container py-8 px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-meridian flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium">Meridian</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Meridian · Intelligent Data Analysis Platform
          </p>
        </div>
      </div>
    </footer>
  );
};
