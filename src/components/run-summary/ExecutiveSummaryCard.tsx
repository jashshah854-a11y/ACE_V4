/**
 * Executive Summary Card
 * 
 * Displays the one-liner and up to 4 bullets.
 * Answers: "What does this mean for me?"
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { RunSummaryViewModel } from '@/types/RunSummaryViewModel';

interface ExecutiveSummaryCardProps {
    viewModel: RunSummaryViewModel;
}

export function ExecutiveSummaryCard({ viewModel }: ExecutiveSummaryCardProps) {
    const { executive } = viewModel;

    return (
        <Card>
            <CardHeader>
                <CardTitle>What This Means For You</CardTitle>
            </CardHeader>
            <CardContent>
                {/* One-liner (max 140 chars) */}
                <p className="text-base font-medium text-foreground mb-4">
                    {executive.oneLiner}
                </p>

                {/* Bullets (max 4) */}
                {executive.bullets.length > 0 && (
                    <ul className="space-y-2">
                        {executive.bullets.map((bullet, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-primary mt-1">•</span>
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
