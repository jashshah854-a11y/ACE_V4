import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ReportSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function ReportSection({ id, title, subtitle, children, className }: ReportSectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={cn("py-16 md:py-24 border-b border-border last:border-0", className)}
    >
      <div className="mb-10 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-navy-900 mb-3 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-muted-foreground font-light leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="w-full">{children}</div>
    </motion.section>
  );
}
