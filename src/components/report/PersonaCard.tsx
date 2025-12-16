import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { numberFormatter } from "@/lib/numberFormatter";
import { motion } from "framer-motion";

interface PersonaStrategy {
    title: string;
    steps: string[];
}

interface PersonaCardProps {
    name: string;
    description: string;
    size: number;
    percentage?: number;
    gradient: string; // Tailwind gradient class
    icon?: string; // Emoji or icon
    strategy?: PersonaStrategy;
    index?: number; // For stagger animation
}

/**
 * Rich persona card with gradient, avatar, and collapsible strategy
 */
export function PersonaCard({
    name,
    description,
    size,
    percentage,
    gradient,
    icon = "👤",
    strategy,
    index = 0
}: PersonaCardProps) {
    const handleCopy = () => {
        const text = `${name}\n${description}\nSize: ${numberFormatter.integer(size)}${percentage ? ` (${numberFormatter.percentageValue(percentage)})` : ''}`;
        navigator.clipboard.writeText(text);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
        >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {/* Gradient Header */}
                <div className={cn("h-2", gradient)} />

                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                                gradient.replace('bg-gradient-to-r', 'bg-gradient-to-br'),
                                "bg-opacity-20 backdrop-blur"
                            )}>
                                <span>{icon}</span>
                            </div>

                            {/* Name & Description */}
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg mb-1">{name}</CardTitle>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {description}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={handleCopy}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Size Badge */}
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono">
                            {numberFormatter.integer(size)}
                            {percentage && ` • ${numberFormatter.percentageValue(percentage)}`}
                        </Badge>
                    </div>

                    {/* Strategy Accordion */}
                    {strategy && (
                        <Accordion type="single" collapsible>
                            <AccordionItem value="strategy" className="border-0">
                                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                                    {strategy.title}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 pl-2">
                                        {strategy.steps.map((step, idx) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-xs text-primary">{idx + 1}</span>
                                                </div>
                                                <span className="flex-1">{step}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-4">
                                        <Button size="sm" className="flex-1">
                                            Apply Strategy
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            Export
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

/**
 * Preset gradients for persona types
 */
export const PERSONA_GRADIENTS = [
    "bg-gradient-to-r from-violet-500 to-purple-500",
    "bg-gradient-to-r from-blue-500 to-cyan-500",
    "bg-gradient-to-r from-emerald-500 to-teal-500",
    "bg-gradient-to-r from-orange-500 to-red-500",
    "bg-gradient-to-r from-pink-500 to-rose-500",
    "bg-gradient-to-r from-indigo-500 to-blue-500"
] as const;
