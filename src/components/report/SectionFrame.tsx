import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RoleVisibility = "all" | "analyst_expert" | "expert_only";

export interface SectionFrameProps {
    id: string;
    title: string;
    subtitle?: string;
    roleVisibility?: RoleVisibility;
    primary: ReactNode;
    secondary?: ReactNode;
    emptyState?: ReactNode;
    className?: string;
}

/**
 * SectionFrame - Consistent layout wrapper for all report sections
 * 
 * Provides standardized structure with title, optional subtitle,
 * primary content area, and optional secondary content.
 * Supports role-based visibility gating.
 */
export function SectionFrame({
    id,
    title,
    subtitle,
    roleVisibility = "all",
    primary,
    secondary,
    emptyState,
    className,
}: SectionFrameProps) {
    // TODO: Check role visibility against current user role
    // For now, always show content
    const shouldShow = true;

    if (!shouldShow) {
        return null;
    }

    // If no primary content and emptyState provided, show empty state
    if (!primary && emptyState) {
        return (
            <section
                id={id}
                className={cn(
                    "rounded-3xl border border-border/40 bg-card p-6 shadow-sm",
                    className
                )}
            >
                <div className="mb-4">
                    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                    )}
                </div>
                {emptyState}
            </section>
        );
    }

    return (
        <section
            id={id}
            className={cn(
                "rounded-3xl border border-border/40 bg-card p-6 shadow-sm",
                className
            )}
        >
            {/* Section Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                {subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                )}
            </div>

            {/* Primary Content */}
            <div className="space-y-4">{primary}</div>

            {/* Secondary Content (analyst/expert detail) */}
            {secondary && (
                <div className="mt-6 border-t border-border/40 pt-6">
                    {secondary}
                </div>
            )}
        </section>
    );
}
