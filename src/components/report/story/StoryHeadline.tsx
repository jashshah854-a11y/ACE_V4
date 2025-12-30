import { StoryViewData } from "@/lib/reportViewModel";
import { Sparkles } from "lucide-react";

interface StoryHeadlineProps {
    data: StoryViewData;
}

export function StoryHeadline({ data }: StoryHeadlineProps) {
    return (
        <div className="mb-6 relative">
            {/* Date / ID Tag */}
            <div className="flex items-center gap-2 mb-3 text-xs font-mono tracking-wider text-muted-foreground uppercase opacity-70">
                <span>{data.meta.date}</span>
                <span>•</span>
                <span>Run {data.meta.runId}</span>
            </div>

            {/* Main Headline - Reduced Size by ~50% */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
                {data.headline}
            </h1>

            {/* Subheadline / Lede */}
            <p className="text-lg text-muted-foreground font-serif leading-relaxed max-w-4xl border-l-4 border-teal-500 pl-4 my-4">
                {data.subheadline}
            </p>

            {/* Executive Brief Box - Compact */}
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
