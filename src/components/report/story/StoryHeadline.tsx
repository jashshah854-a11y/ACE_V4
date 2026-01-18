import { StoryViewData } from "@/lib/reportViewModel";
import { Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { ConfidenceBadge, ConfidenceLevel } from "@/components/trust/ConfidenceBadge";

interface StoryHeadlineProps {
    data: StoryViewData;
    onHighlight?: () => void;
}

const NUMBER_PATTERN = /(\d[\d.,]*(?:%|x|M|K)?)/gi;

export function StoryHeadline({ data, onHighlight }: StoryHeadlineProps) {
    const emphasize = (text: string): ReactNode => {
        if (!onHighlight) return text;
        const segments = text.split(NUMBER_PATTERN);
        return segments.map((segment, idx) => {
            if (!segment) return null;
            const isNumber = idx % 2 === 1;
            if (!isNumber) return <span key={`seg-${idx}`}>{segment}</span>;
            return (
                <button
                    key={`num-${idx}`}
                    type="button"
                    onClick={onHighlight}
                    className="text-action underline decoration-dotted decoration-transparent hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--action-color)]"
                >
                    {segment}
                </button>
            );
        });
    };

    return (
        <div className="mb-6 relative">
            <div className="flex items-center gap-2 mb-3 text-xs font-mono tracking-wider text-muted-foreground uppercase opacity-70">
                <span>{data.meta.date}</span>
                <span>·</span>
                <span>Run {data.meta.runId}</span>
                <div className="ml-2">
                    <ConfidenceBadge
                        level={data.meta.confidence > 0.8 ? 'high' : data.meta.confidence > 0.5 ? 'medium' : 'low'}
                        score={data.meta.confidence}
                        showLabel={true}
                        details={{
                            dataCoverage: `Data quality ${Math.round(data.meta.dataQuality * 100)}%`,
                            validationStatus: data.meta.confidence > 0.6 ? "Passed core checks" : "Borderline checks",
                            sampleSufficiency: data.meta.runId ? `Run: ${data.meta.runId}` : undefined,
                        }}
                    />
                </div>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
                {emphasize(data.headline)}
            </h1>
            <p className="text-lg text-muted-foreground font-serif leading-relaxed max-w-4xl border-l-4 border-teal-500 pl-4 my-4">
                {emphasize(data.subheadline)}
            </p>
            {data.executiveBrief.length > 0 && (
                <div className="bg-muted/30 border border-border/50 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2 text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wide text-[10px]">
                        <Sparkles className="w-3 h-3" />
                        Executive Brief
                    </div>
                    <ul className="space-y-2">
                        {data.executiveBrief.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm md:text-base text-slate-700 dark:text-slate-300">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-teal-500 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
