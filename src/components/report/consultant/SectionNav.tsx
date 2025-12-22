import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Section {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: Section[];
  variant?: "sidebar" | "dots";
  className?: string;
}

export function SectionNav({ sections, variant = "sidebar", className }: SectionNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");

  useEffect(() => {
    const observer = new IntersectionObserver(
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
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Dots variant (original right-side style)
  if (variant === "dots") {
    return (
      <nav className={cn("fixed right-8 top-1/2 -translate-y-1/2 z-30 hidden xl:flex flex-col gap-2", className)}>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className="group flex items-center gap-3 text-right"
          >
            <span
              className={cn(
                "text-xs font-medium transition-all duration-300 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0",
                activeSection === section.id
                  ? "text-copper-600 opacity-100 translate-x-0"
                  : "text-muted-foreground"
              )}
            >
              {section.label}
            </span>
            <motion.div
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                activeSection === section.id
                  ? "bg-copper-400 scale-125"
                  : "bg-border group-hover:bg-muted-foreground"
              )}
              layoutId="activeSection"
            />
          </button>
        ))}
      </nav>
    );
  }

  // Sidebar variant (new left-side style)
  return (
    <nav className={cn("space-y-1", className)}>
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
  );
}
