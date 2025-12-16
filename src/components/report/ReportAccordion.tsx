import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { ReportSection, sanitizeDisplayText } from "@/lib/reportParser";
import { cn } from "@/lib/utils";
import {
  FileText,
  BarChart3,
  Users,
  AlertTriangle,
  Target,
  TrendingUp,
  Settings,
  Database,
  Shield,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
} from "lucide-react";

interface ReportAccordionProps {
  sections: ReportSection[];
  className?: string;
}

// Map section titles to icons and colors
const getSectionMeta = (title: string): { icon: typeof FileText; color: string; bgColor: string } => {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes("executive") || titleLower.includes("summary")) {
    return { icon: FileText, color: "text-primary", bgColor: "bg-primary/10" };
  }
  if (titleLower.includes("cluster") || titleLower.includes("segment") || titleLower.includes("behavioral")) {
    return { icon: Layers, color: "text-info", bgColor: "bg-info/10" };
  }
  if (titleLower.includes("persona") || titleLower.includes("strateg")) {
    return { icon: Users, color: "text-accent", bgColor: "bg-accent/10" };
  }
  if (titleLower.includes("anomal") || titleLower.includes("detection") || titleLower.includes("alert")) {
    return { icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/10" };
  }
  if (titleLower.includes("model") || titleLower.includes("regression") || titleLower.includes("outcome")) {
    return { icon: TrendingUp, color: "text-success", bgColor: "bg-success/10" };
  }
  if (titleLower.includes("quality") || titleLower.includes("validation")) {
    return { icon: Shield, color: "text-info", bgColor: "bg-info/10" };
  }
  if (titleLower.includes("insight") || titleLower.includes("recommendation")) {
    return { icon: Lightbulb, color: "text-warning", bgColor: "bg-warning/10" };
  }
  if (titleLower.includes("metadata") || titleLower.includes("run")) {
    return { icon: Settings, color: "text-muted-foreground", bgColor: "bg-muted" };
  }
  if (titleLower.includes("data") || titleLower.includes("record")) {
    return { icon: Database, color: "text-primary", bgColor: "bg-primary/10" };
  }
  
  return { icon: Activity, color: "text-primary", bgColor: "bg-primary/10" };
};

export function ReportAccordion({ sections, className }: ReportAccordionProps) {
  const [expandAll, setExpandAll] = useState(false);
  
  if (sections.length === 0) {
    return null;
  }

  // Filter to main sections (h2 level) or fallback to all
  const mainSections = sections.filter((s) => s.level === 2);
  const displaySections = mainSections.length > 0 ? mainSections : sections;
  
  const allIds = displaySections.map(s => s.id);

  const handleExpandAll = () => {
    setExpandAll(!expandAll);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {displaySections.length} sections
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExpandAll}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {expandAll ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Collapse All
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Expand All
            </>
          )}
        </Button>
      </div>

      <Accordion
        type="multiple"
        value={expandAll ? allIds : undefined}
        defaultValue={displaySections.length > 0 ? [displaySections[0].id] : []}
        className="space-y-3"
      >
        {displaySections.map((section, index) => {
          const { icon: Icon, color, bgColor } = getSectionMeta(section.title);
          
          return (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border border-border/50 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-4 text-left w-full">
                  <div className={cn("p-2.5 rounded-lg shrink-0 transition-transform group-hover:scale-105", bgColor)}>
                    <Icon className={cn("h-5 w-5", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate pr-4">
                      {sanitizeDisplayText(section.title)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Section {index + 1} of {displaySections.length}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-5 pb-5">
                <div className="pt-2 border-t border-border/30">
                  <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-li:text-foreground/80 prose-table:text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeHighlight]}
                      components={{
                        // Sanitize text content in paragraphs and headings
                        h3: ({ node, children, ...props }) => (
                          <h3 className="text-lg font-semibold mt-6 mb-3 text-foreground flex items-center gap-2" {...props}>
                            {typeof children === 'string' ? sanitizeDisplayText(children) : children}
                          </h3>
                        ),
                        h4: ({ node, children, ...props }) => (
                          <h4 className="text-base font-medium mt-4 mb-2 text-foreground" {...props}>
                            {typeof children === 'string' ? sanitizeDisplayText(children) : children}
                          </h4>
                        ),
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-4 rounded-lg border border-border/50 bg-muted/20">
                            <table className="w-full text-sm" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="bg-muted/50 border-b border-border/50" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className="px-4 py-2.5 text-left font-semibold text-foreground" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="px-4 py-2.5 border-b border-border/30" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="space-y-1.5 my-3" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="flex items-start gap-2 text-foreground/80" {...props}>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                            <span>{(props as any).children}</span>
                          </li>
                        ),
                        p: ({ node, ...props }) => (
                          <p className="my-2.5 leading-relaxed text-foreground/80" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-foreground" {...props} />
                        ),
                        code: ({ node, className, children, ...props }) => {
                          const isInline = !className;
                          if (isInline) {
                            return (
                              <code className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-sm" {...props}>
                                {children}
                              </code>
                            );
                          }
                          return (
                            <code className={cn("block p-4 rounded-lg bg-muted/50 font-mono text-sm overflow-x-auto", className)} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </article>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
