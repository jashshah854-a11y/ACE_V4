import { Copy, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface SectionQuickActionsProps {
    sectionId: string;
    sectionContent: string;
    sectionTitle: string;
}

export function SectionQuickActions({
    sectionId,
    sectionContent,
    sectionTitle,
}: SectionQuickActionsProps) {
    const handleCopySection = async () => {
        try {
            await navigator.clipboard.writeText(sectionContent);
            toast.success("Section copied to clipboard!");
        } catch (error) {
            toast.error("Failed to copy section");
        }
    };

    const handleExportAsImage = async () => {
        try {
            const element = document.getElementById(sectionId);
            if (!element) {
                toast.error("Section not found");
                return;
            }

            const canvas = await html2canvas(element, {
                backgroundColor: "#ffffff",
                scale: 2,
            });

            canvas.toBlob((blob) => {
                if (!blob) {
                    toast.error("Failed to generate image");
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${sectionTitle.replace(/\s+/g, "_").toLowerCase()}.png`;
                link.click();
                URL.revokeObjectURL(url);

                toast.success("Image downloaded!");
            });
        } catch (error) {
            toast.error("Failed to export as image");
        }
    };

    const handleCopyInsightsSummary = async () => {
        // Extract first 2-3 sentences as summary
        const sentences = sectionContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const summary = sentences.slice(0, 3).join(". ") + ".";

        try {
            await navigator.clipboard.writeText(`${sectionTitle}\n\n${summary}`);
            toast.success("Insights summary copied!");
        } catch (error) {
            toast.error("Failed to copy summary");
        }
    };

    return (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySection}
                className="h-7 px-2"
                title="Copy section"
            >
                <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleExportAsImage}
                className="h-7 px-2"
                title="Export as image"
            >
                <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyInsightsSummary}
                className="h-7 px-2"
                title="Copy insights summary"
            >
                <FileText className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
