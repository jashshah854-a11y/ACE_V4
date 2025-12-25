import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PDFExporterProps {
    contentId: string; // ID of the HTML element to export
    filename?: string;
}

export function PDFExporter({ contentId, filename = "ace-report.pdf" }: PDFExporterProps) {
    const handleExport = async () => {
        try {
            const element = document.getElementById(contentId);
            if (!element) {
                console.error("Element not found:", contentId);
                return;
            }

            // Show loading state
            const button = document.activeElement as HTMLButtonElement;
            if (button) {
                button.disabled = true;
                button.textContent = "Generating PDF...";
            }

            // Capture the content as canvas
            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL("image/png");

            // Calculate PDF dimensions
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Create PDF
            const pdf = new jsPDF({
                orientation: imgHeight > imgWidth ? "portrait" : "landscape",
                unit: "mm",
                format: "a4",
            });

            // Add branding header
            pdf.setFontSize(18);
            pdf.text("ACE Analytics Report", 10, 15);
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 22);

            // Add content
            pdf.addImage(imgData, "PNG", 0, 30, imgWidth, Math.min(imgHeight, pageHeight - 30));

            // If content is longer than one page, add more pages
            let heightLeft = imgHeight - (pageHeight - 30);
            let position = 0;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Save the PDF
            pdf.save(filename);

            // Reset button state
            if (button) {
                button.disabled = false;
                button.textContent = "Download PDF";
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    return (
        <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="gap-2"
        >
            <Download className="h-4 w-4" />
            Download PDF
        </Button>
    );
}

/**
 * Export report content as markdown file
 */
export function downloadMarkdown(content: string, filename = "ace-report.md") {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Copy formatted text to clipboard
 */
export async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        return false;
    }
}
