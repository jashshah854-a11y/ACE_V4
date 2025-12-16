import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { ReportSection } from "@/lib/reportParser";
import { cn } from "@/lib/utils";

interface ReportAccordionProps {
    sections: ReportSection[];
    className?: string;
}

export function ReportAccordion({ sections, className }: ReportAccordionProps) {
    if (sections.length === 0) {
        return null;
    }

    // Group sections by level 2 headers (main sections)
    const mainSections = sections.filter((s) => s.level === 2);

    if (mainSections.length === 0) {
        // If no h2 headers, render all sections in accordion
        return (
            <Accordion type="multiple" className={className}>
                {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="text-left">
                            {section.title}
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                                >
                                    {section.content}
                                </ReactMarkdown>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }

    return (
        <Accordion type="multiple" className={cn("space-y-2", className)} defaultValue={[mainSections[0]?.id]}>
            {mainSections.map((section) => (
                <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border rounded-lg px-4"
                >
                    <AccordionTrigger className="text-left hover:no-underline">
                        <span className="text-lg font-semibold">{section.title}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <article className="prose prose-slate dark:prose-invert max-w-none pt-4">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, rehypeHighlight]}
                                components={{
                                    table: ({ node, ...props }) => (
                                        <div className="overflow-x-auto my-6 rounded-lg border">
                                            <table className="w-full" {...props} />
                                        </div>
                                    ),
                                }}
                            >
                                {section.content}
                            </ReactMarkdown>
                        </article>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
