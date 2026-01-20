import { Info } from "lucide-react";

/**
 * Phase 5 Guardrail 1: Transparency Disclosure
 * 
 * One-time banner shown before any decision tracking begins.
 * Restores user agency without adding friction.
 */

interface DecisionTrackingDisclosureProps {
    onAcknowledge: () => void;
}

export function DecisionTrackingDisclosure({ onAcknowledge }: DecisionTrackingDisclosureProps) {
    return (
        <div className="fixed bottom-4 right-4 max-w-md bg-card border border-border rounded-lg shadow-lg p-4 z-50">
            <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <p className="text-sm text-foreground">
                        <strong>ACE remembers your interactions</strong> to provide context in future reports.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        We track which insights you view and actions you explore. This helps us surface relevant patterns over time.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                        <button
                            onClick={onAcknowledge}
                            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Got it
                        </button>
                        <a
                            href="#"
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                            onClick={(e) => {
                                e.preventDefault();
                                // TODO: Link to privacy/data policy
                                alert("Learn more about ACE's contextual memory system");
                            }}
                        >
                            Learn more
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
