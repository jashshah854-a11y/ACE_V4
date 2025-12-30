import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, LucideIcon, Sparkles } from "lucide-react";
import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TechnicalSectionProps {
    title: string;
    icon?: LucideIcon;
    children: ReactNode;
    defaultOpen?: boolean;
    badge?: string;
    className?: string;
    onInspectEvidence?: () => void;
}

export function TechnicalSection({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    badge,
    className,
    onInspectEvidence
}: TechnicalSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Card className={cn("border bg-card shadow-sm overflow-hidden", className)}>
            <div
                className="flex items-center justify-between p-4 bg-muted/30 border-b cursor-pointer select-none transition-colors hover:bg-muted/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="w-5 h-5 text-primary/80" />}
                    <h3 className="font-semibold text-foreground tracking-tight">{title}</h3>
                    {badge && (
                        <Badge variant="secondary" className="text-xs font-normal">
                            {badge}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onInspectEvidence && isOpen && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 hidden md:flex"
                            onClick={(e) => {
                                e.stopPropagation();
                                onInspectEvidence();
                            }}
                        >
                            <Sparkles className="w-3 h-3" />
                            Evidence
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {isOpen && (
                <CardContent className="p-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        {children}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
