import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReportBadgeProps {
    text: string;
    className?: string;
}

export function ReportBadge({ text, className }: ReportBadgeProps) {
    const variant = getVariant(text);

    return (
        <Badge
            variant={variant}
            className={cn("font-medium", className)}
        >
            {text}
        </Badge>
    );
}

function getVariant(text: string): "default" | "secondary" | "destructive" | "outline" {
    const lowerText = text.toLowerCase();

    // Success/High/Good variants
    if (/(high|excellent|good|success|strong|optimal)/i.test(lowerText)) {
        return "default"; // Usually green in most themes
    }

    // Warning/Moderate variants
    if (/(moderate|medium|warning|caution)/i.test(lowerText)) {
        return "secondary"; // Usually yellow/orange
    }

    // Error/Low/Poor variants
    if (/(low|poor|error|failed|weak|critical)/i.test(lowerText)) {
        return "destructive"; // Usually red
    }

    return "outline";
}

/**
 * Replaces status keywords in text with styled badges
 */
export function enhanceTextWithBadges(text: string): React.ReactNode {
    const statusPattern = /\b(high|excellent|good|moderate|low|poor|warning|error|failed|success|strong|weak|optimal|critical)\b/gi;

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    const matches = Array.from(text.matchAll(statusPattern));

    matches.forEach((match, index) => {
        if (match.index !== undefined) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }

            // Add the badge
            parts.push(
                <ReportBadge
                    key={`badge-${index}`}
                    text={match[0]}
                    className="mx-1"
                />
            );

            lastIndex = match.index + match[0].length;
        }
    });

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}
