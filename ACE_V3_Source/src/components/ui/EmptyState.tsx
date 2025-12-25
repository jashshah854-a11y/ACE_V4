import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";

interface EmptyStateProps {
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    };
    illustration?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    title,
    description,
    action,
    illustration,
    className,
}: EmptyStateProps) {
    return (
        <Card className={className}>
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                {illustration || (
                    <div className="mb-6 rounded-full bg-muted p-6">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                )}

                <CardHeader className="text-center space-y-2 pb-4">
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <p className="text-muted-foreground max-w-md">{description}</p>
                </CardHeader>

                {action && (
                    <Button onClick={action.onClick} size="lg" className="mt-2">
                        {action.icon || <Upload className="h-4 w-4 mr-2" />}
                        {action.label}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
