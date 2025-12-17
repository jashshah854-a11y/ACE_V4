import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileStickyHeaderProps {
    title: string;
    metric?: {
        label: string;
        value: string | number;
    };
    onMenuClick: () => void;
}

export function MobileStickyHeader({
    title,
    metric,
    onMenuClick,
}: MobileStickyHeaderProps) {
    return (
        <div className="lg:hidden sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMenuClick}
                        className="shrink-0"
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-semibold truncate">{title}</h1>
                        {metric && (
                            <p className="text-xs text-muted-foreground truncate">
                                {metric.label}: <span className="font-medium">{metric.value}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
