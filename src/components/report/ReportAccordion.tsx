import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    FileText,
    BarChart3,
    Users,
    Target,
    Shield,
    Lightbulb
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface ReportSection {
    id: string;
    title: string;
    icon: LucideIcon;
    content: ReactNode;
    defaultOpen?: boolean;
    itemCount?: number;
}

interface ReportAccordionProps {
    sections: ReportSection[];
    className?: string;
}

/**
 * Collapsible accordion sections to reduce vertical scroll
 * and organize report content logically
 */
export function ReportAccordion({ sections, className }: ReportAccordionProps) {
    const defaultOpenSections = sections
        .filter(s => s.defaultOpen)
        .map(s => s.id);

    return (
        <Accordion
            type="multiple"
            defaultValue={defaultOpenSections}
            className={className}
        >
            {sections.map((section) => {
                const Icon = section.icon;

                return (
                    <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                                <Icon className="h-5 w-5 shrink-0 text-primary" />
                                <span className="font-semibold">{section.title}</span>
                                {section.itemCount !== undefined && (
                                    <Badge variant="secondary" className="ml-2">
                                        {section.itemCount}
                                    </Badge>
                                )}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="pt-4 pb-2 pl-8">
                                {section.content}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
}

// Preset icons for common report sections
export const SECTION_ICONS = {
    summary: FileText,
    quality: BarChart3,
    clusters: Users,
    outcomes: Target,
    anomalies: Shield,
    insights: Lightbulb,
} as const;
