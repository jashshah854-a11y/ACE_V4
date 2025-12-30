import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Download, Copy, Check } from "lucide-react";
import { StoryViewData } from "@/lib/ReportViewModel";

interface StoryControlBarProps {
    data: StoryViewData;
}

export function StoryControlBar({ data }: StoryControlBarProps) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [copied, setCopied] = useState(false);

    // --- Voice Logic (Web Speech API) ---
    const speak = () => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance();
            // Construct a read-friendly text
            const text = `${data.headline}. ${data.subheadline}. Executive Overview: ${data.executiveBrief.join(". ")}.`;
            utterance.text = text;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onend = () => setIsSpeaking(false);
            utterance.onstart = () => setIsSpeaking(true);

            window.speechSynthesis.cancel(); // Stop any previous
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    const toggleVoice = () => {
        if (isSpeaking) {
            stopSpeaking();
        } else {
            speak();
        }
    };

    // --- Copy Brief Logic ---
    const copyBrief = () => {
        const briefText = `
**${data.headline}**
${data.subheadline}

*Executive Brief:*
${data.executiveBrief.map(b => `- ${b}`).join('\n')}
    `.trim();

        navigator.clipboard.writeText(briefText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Clean up speech on unmount
    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return (
        <div className="flex items-center gap-2 mb-6 animate-fade-in-up">
            <Button
                variant="outline"
                size="sm"
                onClick={toggleVoice}
                className="gap-2 text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400"
            >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isSpeaking ? "Stop Reading" : "Read Aloud"}
            </Button>

            <div className="h-4 w-px bg-border/50 mx-2" />

            <Button
                variant="ghost"
                size="sm"
                onClick={copyBrief}
                className="gap-2 text-muted-foreground hover:text-foreground"
            >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied Brief" : "Copy Brief"}
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
                className="gap-2 text-muted-foreground hover:text-foreground"
            >
                <Download className="w-4 h-4" />
                Print PDF
            </Button>
        </div>
    );
}
