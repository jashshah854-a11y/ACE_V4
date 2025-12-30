import { StoryViewData } from "@/lib/ReportViewModel";
import { Sparkles } from "lucide-react";

interface StoryHeadlineProps {
    data: StoryViewData;
}

export function StoryHeadline({ data }: StoryHeadlineProps) {
    return (
        <div className="mb-12 relative">
            {/* Date / ID Tag */}
            <div className="flex items-center gap-2 mb-4 text-xs font-mono tracking-wider text-muted-foreground uppercase opacity-70">
                <span>{data.meta.date}</span>
                <span>•</span>
                <span>Run {data.meta.runId}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight mb-6">
                {data.headline}
            </h1>

            {/* Subheadline / Lede */}
            <p className="text-xl md:text-2xl text-muted-foreground font-serif leading-relaxed max-w-4xl border-l-4 border-teal-500 pl-6 my-8">
                {data.subheadline}
            </p>

            {/* Executive Brief Box */}
            {data.executiveBrief.length > 0 && (
                <div className="bg-muted/30 border border-border/50 rounded-xl p-6 md:p-8 mt-8">
                    <div className="flex items-center gap-2 mb-4 text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wide text-xs">
                        <Sparkles className="w-4 h-4" />
                        Executive Brief
                    </div>
                    <ul className="space-y-3">
                        {data.executiveBrief.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-base md:text-lg text-slate-700 dark:text-slate-300">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
