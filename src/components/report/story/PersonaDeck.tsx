import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Persona {
    id: string;
    label: string;
    description: string;
    size?: string | number; // e.g. "24%" or count
    value?: string; // e.g. "High Value"
}

interface PersonaDeckProps {
    personas: Persona[];
    className?: string;
}

export function PersonaDeck({ personas, className }: PersonaDeckProps) {
    if (!personas || personas.length === 0) return null;

    return (
        <div className={cn("space-y-4 mb-10", className)}>
            <div className="flex items-center gap-2 px-1">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Key Segments Identified
                </h3>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 px-4 -mx-4 snap-x snap-mandatory no-scrollbar mask-gradient-right">
                {personas.map((p, idx) => (
                    <Card
                        key={p.id || idx}
                        className="snap-center shrink-0 w-[280px] md:w-[320px] p-5 border-l-4 border-l-teal-500 shadow-sm hover:shadow-md transition-shadow bg-card/80 backdrop-blur-sm"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <Badge variant="secondary" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20">
                                Segment {idx + 1}
                            </Badge>
                            {p.size && (
                                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {p.size}
                                </span>
                            )}
                        </div>

                        <h4 className="font-serif text-xl font-bold text-foreground mb-2">
                            {p.label}
                        </h4>

                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {p.description}
                        </p>

                        {p.value && (
                            <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="w-3 h-3" />
                                <span>{p.value}</span>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
