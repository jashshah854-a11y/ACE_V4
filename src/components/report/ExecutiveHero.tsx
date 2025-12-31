import { motion } from "framer-motion";
import { Sparkles, Calendar, ShieldCheck, ArrowRight, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExecutiveHeroProps {
    headline: string;
    subheadline?: string;
    date?: string;
    confidenceScore?: number;
    authorName?: string;
    children?: React.ReactNode;
}

export function ExecutiveHero({ headline, subheadline, date, confidenceScore = 0, authorName = "ACE System", children }: ExecutiveHeroProps) {

    // Dynamic greeting based on time of day (mocked for now, or real if we want)
    const greeting = "Analysis Report";

    return (
        <div className="relative w-full mb-16 pt-12 pb-8 px-1 border-b border-border/40">
            <div className="flex flex-col gap-6 max-w-5xl">
                {/* Meta Row */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        <span className="text-primary">{greeting}</span>
                        {date && (
                            <>
                                <span className="text-border mx-1">•</span>
                                <span>{date}</span>
                            </>
                        )}
                    </div>
                    {/* Action Toolbar via Children */}
                    {children && <div className="hidden sm:block">{children}</div>}
                </div>

                {/* Massive Editorial Headline */}
                <h1 className="text-5xl md:text-7xl font-sans font-semibold text-primary tracking-tighter leading-[1.05]">
                    {headline}
                </h1>

                {/* Subheadline / Lead */}
                <p className="text-xl md:text-2xl text-secondary-foreground leading-relaxed max-w-3xl font-light tracking-tight text-opacity-80">
                    {subheadline}
                </p>

                {/* Confidence Badge (Minimal) */}
                {confidenceScore > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-sm font-medium text-accent">
                            System Confidence: {confidenceScore}%
                        </span>
                    </div>
                )}

                {/* Mobile Toolbar (visible only on small screens) */}
                {children && <div className="sm:hidden mt-4">{children}</div>}
            </div>
        </div>
    );
}
