import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowRight, LucideIcon } from "lucide-react";

interface ActionableEmptyStateProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
    requirements?: string[];
}

export function ActionableEmptyState({
    title,
    description,
    icon: Icon = AlertCircle,
    actionLabel,
    onAction,
    requirements
}: ActionableEmptyStateProps) {
    return (
        <Card className="p-8 flex flex-col items-center justify-center text-center border-dashed bg-muted/30">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                {description}
            </p>

            {requirements && requirements.length > 0 && (
                <div className="bg-background border rounded-md p-4 mb-6 w-full max-w-sm text-left">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Requirements
                    </div>
                    <ul className="space-y-1.5">
                        {requirements.map((req, i) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-foreground/80">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                {req}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {actionLabel && onAction && (
                <Button variant="outline" onClick={onAction} className="gap-2">
                    {actionLabel}
                    <ArrowRight className="h-4 w-4" />
                </Button>
            )}
        </Card>
    );
}
