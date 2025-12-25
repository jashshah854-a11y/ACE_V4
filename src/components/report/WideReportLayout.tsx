import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WideReportLayoutProps {
    hero?: ReactNode;
    mainContent: ReactNode;
    intelligenceRail: ReactNode;
    className?: string;
}

/**
 * Wide two-zone layout for premium report viewing
 * Left/Center: Primary narrative and analysis
 * Right: Sticky intelligence rail with context
 */
export function WideReportLayout({
    hero,
    mainContent,
    intelligenceRail,
    className
}: WideReportLayoutProps) {
    return (
        <div className={cn("w-full", className)}>
            {/* Full-Width Hero Section */}
            {hero && (
                <div className="w-full mb-8">
                    {hero}
                </div>
            )}

            {/* Two-Zone Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8 max-w-[1600px] mx-auto">
                {/* Left/Center Zone - Primary Content */}
                <div className="min-w-0">
                    {mainContent}
                </div>

                {/* Right Intelligence Rail - Sticky */}
                <div className="hidden lg:block">
                    <div className="sticky top-24 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
                        {intelligenceRail}
                    </div>
                </div>
            </div>
        </div>
    );
}
