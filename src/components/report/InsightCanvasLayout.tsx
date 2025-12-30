import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InsightCanvasLayoutProps {
    navigation: ReactNode;
    mainContent: ReactNode;
    rightRail: ReactNode;
    isRightRailOpen?: boolean;
    className?: string;
}

/**
 * Insight Canvas 3-Zone Layout
 * Zone 1 (Left): Navigation Rail (Sticky)
 * Zone 2 (Center): Narrative "Library" (Scrollable)
 * Zone 3 (Right): Evidence "Lab" (Collapsible/Slide-out)
 */
export function InsightCanvasLayout({
    navigation,
    mainContent,
    rightRail,
    isRightRailOpen = false,
    className,
}: InsightCanvasLayoutProps) {
    return (
        <div className={cn("min-h-screen bg-background", className)}>
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out mx-auto max-w-[1920px]",
                    isRightRailOpen
                        ? "grid-cols-[240px_1fr_auto]" // Right rail expands automatically based on content width
                        : "grid-cols-[240px_1fr_auto]" // Right rail stays in grid but width is zeroed
                )}
            >
                {/* Zone 1: Navigation Rail - Sticky */}
                <aside className="sticky top-[60px] h-[calc(100vh-60px)] z-30 hidden md:block w-[240px]">
                    {navigation}
                </aside>

                {/* Zone 2: Main Content - Scrollable */}
                <main className="min-w-0 px-8 py-10">
                    <div className="mx-auto space-y-12 prose-narrative">
                        {mainContent}
                    </div>
                </main>

                {/* Zone 3: Right Rail - Collapsible */}
                <aside
                    className={cn(
                        "sticky top-[60px] h-[calc(100vh-60px)] border-l bg-muted/20 overflow-hidden transition-all duration-300",
                        isRightRailOpen ? "w-[400px] opacity-100" : "w-0 border-l-0 opacity-0"
                    )}
                >
                    <div className="h-full w-[400px] overflow-y-auto p-4">
                        {rightRail}
                    </div>
                </aside>
            </div>
        </div>
    );
}
