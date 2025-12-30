import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalAlertProps {
    type?: "safe-mode" | "error" | "info";
    message: string;
    details?: string[];
    className?: string;
}

export function GlobalAlert({ type = "safe-mode", message, details, className }: GlobalAlertProps) {
    const isSafeMode = type === "safe-mode";

    return (
        <div
            className={cn(
                "rounded-lg border p-4 mb-6 transition-all",
                isSafeMode
                    ? "bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-400"
                    : "bg-destructive/10 border-destructive/20 text-destructive",
                className
            )}
        >
            <div className="flex items-start gap-3">
                {isSafeMode ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
                ) : (
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                    <p className="font-medium text-sm leading-6">{message}</p>
                    {details && details.length > 0 && (
                        <ul className="list-disc pl-4 space-y-1 mt-1">
                            {details.map((detail, idx) => (
                                <li key={idx} className="text-xs opacity-90">
                                    {detail}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
