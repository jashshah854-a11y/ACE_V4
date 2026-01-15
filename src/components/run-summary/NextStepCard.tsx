/**
 * Next Step Card Component
 * 
 * Displays primary recommendation and action checklist.
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import type { RunSummaryViewModel } from '@/types/RunSummaryViewModel';

interface NextStepCardProps {
    viewModel: RunSummaryViewModel;
}

export function NextStepCard({ viewModel }: NextStepCardProps) {
    const { run, actions, limitations } = viewModel;

    // Primary action
    const primaryAction = {
        label: 'Fix Dataset Issues',
        description: 'Review and resolve data quality problems',
        icon: AlertTriangle,
        variant: 'default' as const,
    };

    // Secondary actions
    const secondaryActions = actions.secondary.map((action) => {
        switch (action) {
            case 'viewValidation':
                return {
                    label: 'View Validation Details',
                    enabled: true,
                    reason: null,
                };
            case 'openLab':
                return {
                    label: 'Open Strategy Lab',
                    enabled: run.mode === 'normal',
                    reason: run.mode !== 'normal' ? 'Fix data issues first' : null,
                };
            case 'viewEvidence':
                return {
                    label: 'View Evidence Console',
                    enabled: run.mode !== 'failed',
                    reason: run.mode === 'failed' ? 'Run must complete successfully' : null,
                };
            default:
                return null;
        }
    }).filter(Boolean);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Primary CTA */}
                <div>
                    <Button className="w-full" size="lg">
                        <primaryAction.icon className="w-4 h-4 mr-2" />
                        {primaryAction.label}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                        {primaryAction.description}
                    </p>
                </div>

                {/* Secondary Actions */}
                {secondaryActions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Available Actions</p>
                        {secondaryActions.map((action, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm text-foreground">{action.label}</span>
                                {action.enabled ? (
                                    <Button variant="ghost" size="sm">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground" title={action.reason || undefined}>
                                        {action.reason}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Practical Impact */}
                {limitations.practicalImpact && (
                    <div className="p-3 bg-muted/50 rounded">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Impact:</span> {limitations.practicalImpact}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
