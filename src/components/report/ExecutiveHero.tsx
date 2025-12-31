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
}

export function ExecutiveHero({ headline, subheadline, date, confidenceScore = 0, authorName = "ACE System" }: ExecutiveHeroProps) {

    // Dynamic greeting based on time of day (mocked for now, or real if we want)
    const greeting = "Analysis Report";

    return (
        <div className="relative w-full mb-12 pt-8 pb-12 px-1">

            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-navy-900/5 rounded-full blur-3xl -z-10" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                {/* Main Content */}
                <div className="space-y-4 max-w-3xl">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-full px-3 py-1 bg-white/50 backdrop-blur border-teal-500/20 text-teal-600">
                            <Sparkles className="w-3 h-3 mr-1.5 inline" />
                            {greeting}
                        </Badge>
                        {date && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {date}
                            </span>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 leading-[1.1] tracking-tight">
                        {headline}
                    </h1>

                    <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl font-light">
                        {subheadline}
                    </p>
                </div>

                {/* Actions & Metrics */}
                <div className="flex flex-col items-end gap-4 min-w-[200px]">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-navy-900 rounded-full">
                            <Share2 className="w-5 h-5" />
                        </Button>
                        <Button variant="outline" className="rounded-full border-navy-100 bg-white/50 hover:bg-white text-navy-900 shadow-sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>

                    {/* Confidence "Pulse" - subtle indicator instead of big banner */}
                    {confidenceScore > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-100">
                            <div className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                            </div>
                            <span className="text-xs font-medium text-teal-700">
                                {confidenceScore}% Confidence
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-navy-100 to-transparent" />
        </div>
    );
}
