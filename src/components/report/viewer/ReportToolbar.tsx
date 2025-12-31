import { Button } from "@/components/ui/button";
import { Download, Share2, Presentation, Link, Copy } from "lucide-react";
import { PDFExporter, copyToClipboard } from "@/components/report/PDFExporter";
import { useToast } from "@/hooks/use-toast";

interface ReportToolbarProps {
  reportId: string;
  hasExecutiveBrief: boolean;
}

export function ReportToolbar({ reportId, hasExecutiveBrief }: ReportToolbarProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    // In a real app, this would be a real deep link
    const url = window.location.href;
    const success = await copyToClipboard(url);
    if (success) {
      toast({ title: "Link copied to clipboard", description: "Share this analysis with your team." });
    }
  };

  const handleSlideMode = () => {
    // Current MVP: Just toast, later: Full screen mode
    toast({ title: "Presentation Mode", description: "Press F11 for full screen experience." });
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleShare} className="hidden sm:flex gap-1.5 text-muted-foreground">
        <Link className="h-4 w-4" />
        Share
      </Button>

      {/* Slide Mode Trigger */}
      <Button variant="outline" size="sm" onClick={handleSlideMode} className="gap-1.5">
        <Presentation className="h-4 w-4" />
        Present
      </Button>

      {/* PDF Export Action */}
      <PDFExporter contentId="ace-report-content" filename={`ACE-Report-${reportId}.pdf`} />
    </div>
  );
}
