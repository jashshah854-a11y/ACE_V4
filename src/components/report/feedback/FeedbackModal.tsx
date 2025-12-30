
import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSimulation } from "@/context/SimulationContext";

interface FeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetId: string;
    targetType: 'insight' | 'query_response';
}

export function FeedbackModal({ open, onOpenChange, targetId, targetType }: FeedbackModalProps) {
    const { submitFeedback } = useSimulation();
    const [correction, setCorrection] = useState("");

    const handleSubmit = () => {
        submitFeedback({
            target_id: targetId,
            target_type: targetType,
            rating: 'negative',
            correction,
        });
        onOpenChange(false);
        setCorrection("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Refine this Insight</DialogTitle>
                    <DialogDescription>
                        What looks incorrect? Your feedback helps calibrate the analyst model.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="correction">Additional Context</Label>
                        <Textarea
                            id="correction"
                            placeholder="e.g., 'This segment is actually loyal, not at-risk...'"
                            value={correction}
                            onChange={(e) => setCorrection(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit}>Submit Feedback</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
