import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface UploadSuccessPanelProps {
    runId: string;
    onViewReport: () => void;
    estimatedTime?: string;
    status?: "processing" | "complete" | "error";
}

export function UploadSuccessPanel({
    runId,
    onViewReport,
    estimatedTime = "2-3 minutes",
    status = "processing",
}: UploadSuccessPanelProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyRunId = async () => {
        try {
            await navigator.clipboard.writeText(runId);
            setCopied(true);
            toast.success("Run ID copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error("Failed to copy Run ID");
        }
    };

    const statusConfig = {
        processing: {
            icon: Clock,
            text: "Processing...",
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950/20",
        },
        complete: {
            icon: CheckCircle,
            text: "Complete",
            color: "text-green-600",
            bgColor: "bg-green-50 dark:bg-green-950/20",
        },
        error: {
            icon: ExternalLink,
            text: "Error",
            color: "text-red-600",
            bgColor: "bg-red-50 dark:bg-red-950/20",
        },
    };

    const StatusIcon = statusConfig[status].icon;

    return (
        <Card className="border-l-4 border-l-green-500">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Upload Successful!
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your analysis has been queued and will be ready soon.
                        </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig[status].bgColor}`}>
                        <StatusIcon className={`h-4 w-4 ${statusConfig[status].color}`} />
                        <span className={`text-sm font-medium ${statusConfig[status].color}`}>
                            {statusConfig[status].text}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Run ID Section */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Run ID</label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                            {runId}
                        </code>
                        <Button
                            onClick={handleCopyRunId}
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Save this ID to access your report later
                    </p>
                </div>

                {/* Estimated Time */}
                {status === "processing" && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                            Estimated completion: <span className="font-medium">{estimatedTime}</span>
                        </span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <Button onClick={onViewReport} className="flex-1" size="lg">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Report
                    </Button>
                    {status === "complete" && (
                        <Button variant="outline" onClick={handleCopyRunId} size="lg">
                            Share
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
