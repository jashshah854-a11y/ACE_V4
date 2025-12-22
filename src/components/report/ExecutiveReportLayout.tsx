import { ReactNode, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileDown, Share2, Printer, ChevronRight, Menu, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Section {
  id: string;
  label: string;
}

interface ExecutiveReportLayoutProps {
  title?: string;
  subtitle?: string;
  date?: string;
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
  date,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate current date if not provided
  const reportDate = date || new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

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
      setMobileNavOpen(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-copper-400 to-teal-500"
          initial={{ width: 0 }}
          animate={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Left: Title and metadata */}
            <div className="flex items-center gap-4">
              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>
                )}
              </div>
              
              {/* Date badge */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-xs font-medium text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {reportDate}
              </div>
            </div>
            
            {/* Right: Action buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {onPrint && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onPrint} 
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Print</span>
                </Button>
              )}
              {onShare && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onShare} 
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Share</span>
                </Button>
              )}
              {onExportPDF && (
                <Button 
                  size="sm" 
                  onClick={onExportPDF} 
                  className="gap-2 bg-navy-900 hover:bg-navy-800 text-white"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Export PDF</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-16 z-30 lg:hidden bg-card border-b border-border shadow-lg"
          >
            <nav className="p-4 space-y-1 max-h-[60vh] overflow-y-auto">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-sm text-sm transition-all",
                    activeSection === section.id
                      ? "bg-copper-50 text-copper-600 font-medium border-l-2 border-copper-400"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="max-w-[1920px] mx-auto flex">
        {/* Left Sidebar - Navigation (Desktop only) */}
        <aside className="hidden lg:block w-60 shrink-0 border-r border-border bg-card/50">
          <nav className="sticky top-20 py-8 px-6 space-y-1">
            <div className="mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-copper-600 mb-2 flex items-center gap-3">
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
                  "w-full text-left px-4 py-2.5 text-sm rounded-sm transition-all duration-200 flex items-center gap-2 group relative",
                  activeSection === section.id
                    ? "bg-copper-50 text-copper-600 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {activeSection === section.id && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-copper-400 rounded-r"
                  />
                )}
                <ChevronRight 
                  className={cn(
                    "h-3 w-3 transition-all",
                    activeSection === section.id 
                      ? "rotate-90 text-copper-400" 
                      : "opacity-0 group-hover:opacity-50"
                  )} 
                />
                <span>{section.label}</span>
              </motion.button>
            ))}
          </nav>
        </aside>

        {/* Center Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>

        {/* Right Intelligence Rail (XL screens only) */}
        {rightRail && (
          <aside className="hidden xl:block w-80 2xl:w-96 shrink-0 border-l border-border bg-card/30">
            <div className="sticky top-20 p-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
              {rightRail}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
