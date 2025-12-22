import { ReactNode, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileDown, Share2, Printer, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Section {
  id: string;
  label: string;
}

interface ExecutiveReportLayoutProps {
  title?: string;
  subtitle?: string;
  sections: Section[];
  children: ReactNode;
  onExportPDF?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  rightRail?: ReactNode;
  className?: string;
}

export function ExecutiveReportLayout({
  title = "Executive Report",
  subtitle,
  sections,
  children,
  onExportPDF,
  onShare,
  onPrint,
  rightRail,
  className
}: ExecutiveReportLayoutProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");
  const [scrollProgress, setScrollProgress] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection observer for active section
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-border z-50">
        <motion.div
          className="h-full bg-copper-400"
          initial={{ width: 0 }}
          animate={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onPrint && (
              <Button variant="ghost" size="sm" onClick={onPrint} className="gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            )}
            {onShare && (
              <Button variant="ghost" size="sm" onClick={onShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            {onExportPDF && (
              <Button variant="default" size="sm" onClick={onExportPDF} className="gap-2">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-[1800px] mx-auto flex">
        {/* Left Sidebar - Navigation */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-border">
          <nav className="sticky top-20 p-6 space-y-1">
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <div className="w-8 h-0.5 bg-copper-400" />
                Contents
              </h3>
            </div>
            
            {sections.map((section, index) => (
              <motion.button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-sm transition-all duration-200 flex items-center gap-2 group",
                  activeSection === section.id
                    ? "bg-copper-50 text-copper-600 font-medium border-l-2 border-copper-400 -ml-0.5 pl-2.5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <ChevronRight 
                  className={cn(
                    "h-3 w-3 transition-transform",
                    activeSection === section.id ? "rotate-90 text-copper-400" : "opacity-0 group-hover:opacity-50"
                  )} 
                />
                {section.label}
              </motion.button>
            ))}
          </nav>
        </aside>

        {/* Center Content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-8">
          {children}
        </main>

        {/* Right Intelligence Rail */}
        {rightRail && (
          <aside className="hidden xl:block w-96 shrink-0 border-l border-border">
            <div className="sticky top-20 p-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
              {rightRail}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
