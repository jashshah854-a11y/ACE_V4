/**
 * GuidanceModal Component
 * 
 * Educational modal that translates technical validation errors into
 * user-friendly guidance with actionable remediation steps.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GuidanceEntry } from "@/lib/guidanceMap";
import * as LucideIcons from "lucide-react";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

interface GuidanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    guidanceEntries: GuidanceEntry[];
    onUploadNewDataset?: () => void;
}

export function GuidanceModal({
    isOpen,
    onClose,
    guidanceEntries,
    onUploadNewDataset
}: GuidanceModalProps) {

    // Get icon component from lucide-react based on icon name
    const getIcon = (iconName: string) => {
        // Handle emoji fallback
        if (!iconName || iconName.length <= 2) {
            return <AlertCircle className="h-5 w-5" />;
        }

        const IconComponent = (LucideIcons as any)[iconName];
        if (IconComponent) {
            return <IconComponent className="h-5 w-5" />;
        }
        return <AlertCircle className="h-5 w-5" />;
    };

    // Get severity icon for alert
    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "critical":
                return <AlertCircle className="h-4 w-4" />;
            case "warning":
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <Info className="h-4 w-4" />;
        }
    };

    // Get severity color classes
    const getSeverityClasses = (severity: string) => {
        switch (severity) {
            case "critical":
                return "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
            case "warning":
                return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
            default:
                return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-serif text-gray-900 dark:text-gray-100">
                        How to Unlock Predictive Modeling
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gary-400">
                        Resolve these data quality issues to enable advanced analytics and forecasting.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {guidanceEntries.length === 0 ? (
                        <Alert className="border-blue-200 bg-blue-50">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                No specific issues detected. If you're seeing this message in Safe Mode,
                                it may be due to confidence thresholds. Try switching to Exploratory mode.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        guidanceEntries.map((entry, index) => (
                            <Alert key={index} className={getSeverityClasses(entry.severity)}>
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 mt-1">
                                        {getIcon(entry.icon)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        {/* Issue Header */}
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-base">
                                                {entry.issue}
                                            </h3>
                                            <div className="flex items-center gap-1 text-xs opacity-70">
                                                {getSeverityIcon(entry.severity)}
                                                <span className="uppercase">{entry.severity}</span>
                                            </div>
                                        </div>

                                        {/* Why (Explanation) */}
                                        <div className="space-y-1">
                                            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                                                Why This Matters
                                            </div>
                                            <p className="text-sm leading-relaxed">
                                                {entry.explanation}
                                            </p>
                                        </div>

                                        {/* How to Fix */}
                                        <div className="space-y-1">
                                            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                                                How to Fix
                                            </div>
                                            <p className="text-sm leading-relaxed font-medium">
                                                {entry.fix}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Alert>
                        ))
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    {onUploadNewDataset && (
                        <Button onClick={onUploadNewDataset} className="bg-primary hover:bg-primary/90">
                            Upload New Dataset
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
