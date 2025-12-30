import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { DatasetProfile } from "@/hooks/useDatasetProfile";
import { getStarterChips, detectIntentGaps } from "@/lib/dataTypeMapping";

interface TaskContractInputProps {
    profile: DatasetProfile;
    onSubmit: (userIntent: string) => void;
    onBack?: () => void;
    className?: string;
}

/**
 * Task Contract Input Component
 * Captures user intent with smart suggestions and gap detection
 * Implements the "Consultant Pushback" when intent doesn't match data reality
 */
export function TaskContractInput({ profile, onSubmit, onBack, className }: TaskContractInputProps) {
    const [userIntent, setUserIntent] = useState("");
    const [selectedChip, setSelectedChip] = useState<string | null>(null);

    const starterChips = getStarterChips(profile.primary_type, profile.key_columns);

    // Real-time gap detection
    const gapDetection = userIntent.trim()
        ? detectIntentGaps(userIntent, {
            timeCoverage: profile.time_coverage,
            keyColumns: profile.key_columns,
            qualityScore: profile.quality_score,
            validationMode: profile.validation_mode
        })
        : { hasGap: false, canProceed: true };

    const handleChipClick = (chip: string) => {
        setSelectedChip(chip);
        setUserIntent(chip);
    };

    const handleSubmit = () => {
        if (!userIntent.trim()) return;
        onSubmit(userIntent.trim());
    };

    return (
        <div className={cn("max-w-3xl mx-auto space-y-6", className)}>
            <Card className="p-8">
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                            What decision does this analysis support?
                        </h3>
                        <p className="text-muted-foreground">
                            Help us focus on what matters most to you. This ensures we prioritize relevant insights.
                        </p>
                    </div>

                    {/* Starter Chips */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">
                            Quick starts (click to use)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {starterChips.map((chip) => (
                                <Badge
                                    key={chip}
                                    variant={selectedChip === chip ? "default" : "outline"}
                                    className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1.5"
                                    onClick={() => handleChipClick(chip)}
                                >
                                    {chip}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Intent Input */}
                    <div className="space-y-2">
                        <label htmlFor="user-intent" className="text-sm font-medium text-foreground">
                            Or describe your specific goal
                        </label>
                        <Textarea
                            id="user-intent"
                            value={userIntent}
                            onChange={(e) => setUserIntent(e.target.value)}
                            placeholder="e.g., 'I need to decide which marketing channels to invest in for Q1 2025, focusing on cost-per-acquisition...'"
                            className="min-h-[120px] font-sans resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            {userIntent.length} characters
                        </p>
                    </div>

                    {/* Gap Detection Alert */}
                    {gapDetection.hasGap && gapDetection.message && (
                        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold text-amber-900 dark:text-amber-400 text-sm">
                                        Consultant Note
                                    </p>
                                    <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                                        {gapDetection.message}
                                    </p>
                                    {gapDetection.canProceed && (
                                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 italic">
                                            You can still proceed, but expectations will be adjusted accordingly.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                        {onBack && (
                            <Button variant="ghost" onClick={onBack}>
                                ← Back
                            </Button>
                        )}
                        <Button
                            onClick={handleSubmit}
                            disabled={!userIntent.trim() || (gapDetection.hasGap && !gapDetection.canProceed)}
                            size="lg"
                            className="ml-auto px-8"
                        >
                            Run Analysis
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
