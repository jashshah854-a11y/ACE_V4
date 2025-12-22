import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: Section[];
}

export function SectionNav({ sections }: SectionNavProps) {
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

  return (
    <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-30 hidden xl:flex flex-col gap-2">
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
