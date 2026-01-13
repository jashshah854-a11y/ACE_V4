import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ReportDataResult } from "@/types/reportTypes";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isThinking?: boolean;
}

interface AskAceProps {
    reportData?: ReportDataResult;
}

export function AskAce({ reportData }: AskAceProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hi! I'm ACE. I've analyzed your data. Ask me anything about the risks, opportunities, or specific segments found in this report."
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const generateSmartResponse = (query: string, data?: ReportDataResult): string => {
        if (!data) return "I'm having trouble accessing the report data directly. Try asking again in a moment.";

        const lowerQ = query.toLowerCase();
        const analyzedRows = typeof data.metrics?.recordsProcessed === 'number'
            ? data.metrics.recordsProcessed.toLocaleString()
            : (typeof data.identityStats?.rows === 'number'
                ? data.identityStats.rows.toLocaleString()
                : 'the');

        // 1. High-level Summary
        if (lowerQ.includes("summary") || lowerQ.includes("overview") || lowerQ.includes("tell me about")) {
            return data.viewModel.subheadline ||
                data.runContext.mode ? `This is a ${data.runContext.mode} analysis focusing on ${data.primaryQuestion || "key trends"}.` :
                "I can see a comprehensive analysis here. What specific aspect would you like to know about?";
        }

        // 2. Risks & Anomalies
        if (lowerQ.includes("risk") || lowerQ.includes("bad") || lowerQ.includes("worry") || lowerQ.includes("anomaly")) {
            const risks = data.narrativeSummary?.risks || [];
            if (risks.length > 0) {
                return `I identified ${risks.length} key risks. The most critical one is: "${risks[0]}". Would you like to hear the others?`;
            }
            return "I didn't detect any major critical risks in this specific run, but always keep an eye on the data quality scores.";
        }

        // 3. Wins & Opportunities
        if (lowerQ.includes("win") || lowerQ.includes("good") || lowerQ.includes("opportunity") || lowerQ.includes("growth")) {
            const wins = data.narrativeSummary?.wins || [];
            if (wins.length > 0) {
                return `There are some bright spots! ${wins[0]}`;
            }
            return "The data shows stability, though no major 'breakout' wins were explicitly flagged in the summary.";
        }

        // 4. Data Quality / Reliability
        if (lowerQ.includes("quality") || lowerQ.includes("confidence") || lowerQ.includes("trust")) {
            const score = Math.round(data.metrics?.dataQualityScore ?? 0);
            return `The data quality score is ${score}%. ${score > 80 ? "This is excellent and reliable." : "Proceed with some caution."}`;
        }

        // 5. Segments / Personas
        if (lowerQ.includes("segment") || lowerQ.includes("who") || lowerQ.includes("persona")) {
            const count = data.personas?.length || 0;
            if (count > 0) {
                return `I found ${count} key segments. The top one is likely "${data.personas[0].label || 'Segment A'}".`;
            }
            return "No distinct customer personas were isolated in this specific analysis.";
        }

        // Fallback: Random heuristic or generic help
        const fallbacks = [
            "That's an interesting question. Based on the metrics, I recommend looking at the 'Narrative Insights' section for more detail.",
            "I'm focusing on the key drivers right now. Try asking about 'risks' or 'data quality'.",
            "I can help you interpret the Executive Brief. Would you like a summary?",
            `I've analyzed ${analyzedRows} rows of data. What specifically do you need to know?`
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsThinking(true);

        // Simulate network delay for realism
        setTimeout(() => {
            const responseText = generateSmartResponse(userMsg.content, reportData);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: responseText
            };

            setMessages(prev => [...prev, aiMsg]);
            setIsThinking(false);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-24 right-6 z-50 w-[380px] shadow-2xl"
                    >
                        <Card className="h-[500px] flex flex-col border-primary/20 bg-background/95 backdrop-blur-md">
                            {/* Header */}
                            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">Ask ACE</h3>
                                        <p className="text-[10px] text-muted-foreground">AI Data Assistant</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                <div className="space-y-4">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex gap-3 max-w-[85%]",
                                                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                                            )}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                            )}>
                                                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                            </div>
                                            <div className={cn(
                                                "p-3 rounded-lg text-sm",
                                                msg.role === "user"
                                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                                    : "bg-muted rounded-tl-none"
                                            )}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {isThinking && (
                                        <div className="flex gap-3 max-w-[85%]">
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                            <div className="bg-muted p-3 rounded-lg rounded-tl-none flex items-center gap-1.5 h-10">
                                                <motion.div
                                                    className="w-1.5 h-1.5 bg-foreground/40 rounded-full"
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                                />
                                                <motion.div
                                                    className="w-1.5 h-1.5 bg-foreground/40 rounded-full"
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                                />
                                                <motion.div
                                                    className="w-1.5 h-1.5 bg-foreground/40 rounded-full"
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Input */}
                            <div className="p-4 border-t bg-background/50">
                                <div className="relative">
                                    <Input
                                        placeholder="Ask about your data..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="pr-12"
                                    />
                                    <Button
                                        size="icon"
                                        className="absolute right-1 top-1 h-8 w-8"
                                        onClick={handleSend}
                                        disabled={!inputValue.trim()}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300",
                    isOpen ? "bg-muted text-foreground rotate-45" : "bg-primary text-primary-foreground"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </motion.button>
        </>
    );
}
