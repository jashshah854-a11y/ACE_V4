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
        <div className={cn("min-h-screen bg-background relative", className)}>
            {/* Mobile Backdrop for Right Rail */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden",
                    isRightRailOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => {
                    // This div effectively blocks interactions when rail is open on mobile
                    // Ideally we'd have a callback to close it here, but we'll rely on the rail's close button for now
                }}
            />

            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out mx-auto max-w-[1920px]",
                    // Mobile: Single column (Nav hidden, Rail absolute)
                    // Desktop: 3-column (Nav, Content, Rail)
                    "grid-cols-1 md:grid-cols-[240px_1fr]",
                    isRightRailOpen && "lg:grid-cols-[240px_1fr_auto]"
                )}
            >
                {/* Zone 1: Navigation Rail - Sticky (Desktop Only) */}
                <aside className="sticky top-[60px] h-[calc(100vh-60px)] z-30 hidden md:block w-[240px] border-r">
                    {navigation}
                </aside>

                {/* Zone 2: Main Content - Scrollable */}
                <main className="min-w-0 px-4 md:px-8 py-10 transition-all duration-300">
                    <div className="mx-auto space-y-12 prose-narrative">
                        {mainContent}
                    </div>
                </main>

                {/* Zone 3: Right Rail - Hybrid (Overlay on Mobile/Tablet, Collapsible Column on Desktop) */}
                <aside
                    className={cn(
                        "fixed lg:sticky top-[60px] h-[calc(100vh-60px)] bg-background/95 backdrop-blur-md lg:bg-muted/20 border-l z-50 overflow-hidden transition-all duration-300 shadow-2xl lg:shadow-none",
                        // Mobile/Tablet: Slide in from right (Fixed)
                        "right-0 w-[85vw] max-w-[400px]",
                        // Desktop: Flow in grid
                        "lg:w-[400px]",
                        // Open/Close states
                        isRightRailOpen
                            ? "translate-x-0 opacity-100"
                            : "translate-x-full opacity-0 lg:w-0 lg:border-l-0 lg:p-0"
                    )}
                >
                    <div className="h-full w-full overflow-y-auto p-4">
                        {rightRail}
                    </div>
                </aside>
            </div>
        </div>
    );
}
