import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ReportSearchProps {
    content: string;
    onMatchClick?: (matchIndex: number) => void;
}

export function ReportSearch({ content, onMatchClick }: ReportSearchProps) {
    const [query, setQuery] = useState("");
    const [currentMatch, setCurrentMatch] = useState(0);

    const matches = useMemo(() => {
        if (!query || query.length < 2) return [];

        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const found: { index: number; text: string }[] = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            found.push({
                index: match.index,
                text: match[0],
            });
        }

        return found;
    }, [content, query]);

    const handleNext = () => {
        if (matches.length === 0) return;
        const nextIndex = (currentMatch + 1) % matches.length;
        setCurrentMatch(nextIndex);
        onMatchClick?.(nextIndex);
    };

    const handlePrevious = () => {
        if (matches.length === 0) return;
        const prevIndex = (currentMatch - 1 + matches.length) % matches.length;
        setCurrentMatch(prevIndex);
        onMatchClick?.(prevIndex);
    };

    return (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
                type="text"
                placeholder="Search within report..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentMatch(0);
                }}
                className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {matches.length > 0 && (
                <>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {currentMatch + 1} of {matches.length}
                    </span>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePrevious}
                            className="h-7 w-7 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNext}
                            className="h-7 w-7 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
