import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    status?: "success" | "warning" | "error" | "info";
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function InsightCard({
    title,
    description,
    icon: Icon,
    status = "info",
    children,
    className,
    delay = 0,
}: InsightCardProps) {
    const statusColors = {
        success: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
        warning: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
        error: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
        info: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
    };

    const iconColors = {
        success: "text-green-600",
        warning: "text-yellow-600",
        error: "text-red-600",
        info: "text-blue-600",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay }}
        >
            <Card
                className={cn(
                    "border-l-4 transition-all duration-300",
                    "hover:shadow-lg hover:-translate-y-0.5",
                    statusColors[status],
                    className
                )}
            >
                <CardHeader>
                    <div className="flex items-start gap-3">
                        {Icon && (
                            <div className={cn("mt-1", iconColors[status])}>
                                <Icon className="h-5 w-5" />
                            </div>
                        )}
                        <div className="flex-1">
                            <CardTitle className="text-lg">{title}</CardTitle>
                            {description && (
                                <CardDescription className="mt-1">{description}</CardDescription>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>{children}</CardContent>
            </Card>
        </motion.div>
    );
}

interface TwoColumnInsightProps {
    leftContent: React.ReactNode;
    rightContent: React.ReactNode;
    className?: string;
}

export function TwoColumnInsight({
    leftContent,
    rightContent,
    className,
}: TwoColumnInsightProps) {
    return (
        <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
            <div>{leftContent}</div>
            <div>{rightContent}</div>
        </div>
    );
}
