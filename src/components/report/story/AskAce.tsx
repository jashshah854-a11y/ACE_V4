import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isThinking?: boolean;
}

export function AskAce() {
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

        // Mock AI response delay
        setTimeout(() => {
            const responses = [
                "Based on the data, the highest risk segment is the 'New Acquisitions' group due to low retention.",
                "I found a strong correlation between marketing spend and churn in Q3. You might want to optimize that channel.",
                "The data quality score is 92%, which is excellent. No major anomalies were detected in the primary fields.",
                "Recommendation: Focus on the 'High Value' segment. They show a 15% growth potential if targeted correctly."
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: randomResponse
            };

            setMessages(prev => [...prev, aiMsg]);
            setIsThinking(false);
        }, 1500);
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
