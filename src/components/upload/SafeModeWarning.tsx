
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SafeModeWarningProps {
    onAccept: () => void;
    onCancel: () => void;
    qualityScore: number;
}

export function SafeModeWarning({ onAccept, onCancel, qualityScore }: SafeModeWarningProps) {
    return (
        <div className="space-y-6">
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-50/10 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
                    Proceeding with Safe Mode
                </AlertTitle>
                <AlertDescription className="text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                    <p className="mb-3 font-medium">
                        Data integrity score is {(qualityScore * 100).toFixed(0)}% (Marginal).
                    </p>
                    <p className="mb-4">
                        To prevent hallucinations, the engine will operate in restricted mode:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mb-4 text-sm">
                        <li>Predictive models disabled (forecasting, churn)</li>
                        <li>Persona segmentation disabled</li>
                        <li>Only validated descriptive insights will be shown</li>
                    </ul>
                </AlertDescription>
            </Alert>

            <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                    Cancel & Fix Data
                </Button>
                <Button
                    onClick={onAccept}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
                >
                    Accept & Continue
                </Button>
            </div>
        </div>
    );
}
