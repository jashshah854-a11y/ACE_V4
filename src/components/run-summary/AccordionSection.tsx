/**
 * Accordion Section Component
 * 
 * Collapsible section for technical details.
 * All sections collapsed by default except validation on failed runs.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Issue } from '@/types/RunSummaryViewModel';

interface AccordionSectionProps {
    title: string;
    issueCount?: number;
    summary?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export function AccordionSection({
    title,
    issueCount,
    summary,
    defaultOpen = false,
    children,
}: AccordionSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Header (always visible) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {isOpen ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{title}</span>
                    {issueCount !== undefined && issueCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {issueCount}
                        </Badge>
                    )}
                </div>

                {/* Summary (when collapsed) */}
                {!isOpen && summary && (
                    <span className="text-sm text-muted-foreground truncate ml-4">
                        {summary}
                    </span>
                )}
            </button>

            {/* Content (expandable) */}
            {isOpen && (
                <div className="p-4 bg-background">
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * Issue List Component
 * 
 * Renders a list of validation or governance issues.
 */

interface IssueListProps {
    issues: Issue[];
}

export function IssueList({ issues }: IssueListProps) {
    if (issues.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No issues detected
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {issues.map((issue) => (
                <div key={issue.key} className="border-l-2 border-primary pl-4">
                    {/* Title + Severity */}
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className={`w-4 h-4 ${issue.severity === 'critical' ? 'text-destructive' :
                                issue.severity === 'warning' ? 'text-yellow-500' :
                                    'text-blue-500'
                            }`} />
                        <h4 className="font-medium text-sm text-foreground">
                            {issue.title}
                        </h4>
                        <Badge variant={
                            issue.severity === 'critical' ? 'destructive' :
                                issue.severity === 'warning' ? 'secondary' :
                                    'default'
                        } className="text-xs">
                            {issue.severity}
                        </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-2">
                        {issue.description}
                    </p>

                    {/* Why it matters */}
                    <p className="text-sm text-foreground mb-2">
                        <span className="font-medium">Impact:</span> {issue.whyItMatters}
                    </p>

                    {/* How to fix */}
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Fix:</span> {issue.howToFix}
                    </p>
                </div>
            ))}
        </div>
    );
}
