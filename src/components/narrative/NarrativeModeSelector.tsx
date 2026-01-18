
import { cn } from "@/lib/utils";
import { useNarrative, NarrativeMode } from "./NarrativeContext";
import { User, Activity, Code2 } from "lucide-react";

export function NarrativeModeSelector({ className }: { className?: string }) {
    const { mode, setMode } = useNarrative();

    const options: { id: NarrativeMode; label: string; icon: any; desc: string }[] = [
        {
            id: 'executive',
            label: 'Executive',
            icon: User,
            desc: 'High-level conclusions & implications'
        },
        {
            id: 'analyst',
            label: 'Analyst',
            icon: Activity,
            desc: 'Reasoning, drivers & comparisons'
        },
        {
            id: 'expert',
            label: 'Expert',
            icon: Code2,
            desc: 'Assumptions, code & validation'
        }
    ];

    return (
        <div className={cn("flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50", className)}>
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => setMode(opt.id)}
                    title={opt.desc}
                    className={cn(
                        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                        mode === opt.id
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <opt.icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>

                    {/* Active Indicator Dot */}
                    {mode === opt.id && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_4px_primary]" />
                    )}
                </button>
            ))}
        </div>
    );
}
