
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw, BarChart3, LineChart as LineChartIcon, Sparkles } from 'lucide-react';
import { Story, StoryPoint, ToneProfile, ChartType } from '@/types/StoryTypes';
import { ToneSelector } from './ToneSelector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StoryBarChart, StoryLineChart } from './StoryCharts';
import { PredictiveDriversChart } from '@/components/canvas/EvidenceCharts';

interface StoryCanvasProps {
    story: Story;
    onToneChange: (tone: ToneProfile) => void;
    isLoading?: boolean;
    className?: string;
}

export function StoryCanvas({ story, onToneChange, isLoading = false, className }: StoryCanvasProps) {
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const currentPoint = story.points[currentPointIndex];
    const progress = ((currentPointIndex + 1) / story.points.length) * 100;

    // Auto-play logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                if (currentPointIndex < story.points.length - 1) {
                    setCurrentPointIndex(prev => prev + 1);
                } else {
                    setIsPlaying(false); // Stop at end
                }
            }, 6000); // 6 seconds per slide for charts
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentPointIndex, story.points.length]);

    const handleNext = () => {
        if (currentPointIndex < story.points.length - 1) {
            setCurrentPointIndex(prev => prev + 1);
            setIsPlaying(false); // Pause on manual interaction
        }
    };

    const handlePrev = () => {
        if (currentPointIndex > 0) {
            setCurrentPointIndex(prev => prev - 1);
            setIsPlaying(false);
        }
    };

    const renderChart = (visual: StoryPoint['visual']) => {
        if (!visual) return null;

        const config = visual.config || {};
        const title = config.title;

        switch (visual.type) {
            case 'bar_chart':
                return (
                    <StoryBarChart
                        data={visual.data}
                        title={title}
                        color={config.colors?.[0]}
                    />
                );
            case 'line_chart':
                return (
                    <StoryLineChart
                        data={visual.data}
                        title={title}
                        color={config.colors?.[0]}
                    />
                );
            // Feature importance is a special chart type we might receive
            case 'feature_importance' as any:
                // Adapter for PredictiveDriversChart
                // Assuming 'visual.data' is an array of drivers
                return (
                    <PredictiveDriversChart
                        drivers={visual.data}
                        className="h-full"
                    />
                );
            default:
                // Fallback for unknown types
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border text-muted-foreground p-8">
                        <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium">Visual type: {visual.type}</p>
                        <p className="text-xs mt-1 max-w-xs text-center opacity-70">
                            {JSON.stringify(visual.data).slice(0, 100)}...
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className={cn("flex flex-col h-full bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden", className)}>
            {/* Header / Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground line-clamp-1">
                            {story.title}
                        </h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Insight {currentPointIndex + 1} of {story.points.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Refining...
                        </div>
                    )}
                    <ToneSelector currentTone={story.tone} onToneChange={onToneChange} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-card to-background">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPoint.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="absolute inset-0 flex flex-col md:flex-row"
                    >
                        {/* Left: Narrative */}
                        <div className="w-full md:w-[38%] p-8 flex flex-col justify-center border-r border-border/40 overflow-y-auto bg-card/30">
                            <div className="space-y-6 max-w-lg mx-auto md:mx-0">
                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-2xl font-serif text-foreground leading-snug"
                                >
                                    {currentPoint.headline}
                                </motion.h3>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="prose prose-sm dark:prose-invert text-muted-foreground leading-relaxed"
                                >
                                    <p>{currentPoint.narrative}</p>
                                </motion.div>

                                {currentPoint.evidence.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="pt-6 border-t border-border/40"
                                    >
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                            Supporting Signals
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {currentPoint.evidence.map((ev, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 text-[11px] bg-background border border-border rounded-md text-foreground/80 shadow-sm"
                                                    title={ev.description}
                                                >
                                                    {ev.description.length > 30 ? ev.description.slice(0, 30) + '...' : ev.description}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Right: Visual */}
                        <div className="w-full md:w-[62%] p-8 md:p-12 relative">
                            {/* Background Decorative Element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

                            <div className="h-full w-full bg-card/40 backdrop-blur-sm rounded-xl border border-white/10 p-4 shadow-sm">
                                {renderChart(currentPoint.visual)}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer / Navigation */}
            <div className="px-6 py-4 border-t border-border/40 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between max-w-5xl mx-auto w-full gap-8">
                    {/* Progress Bar */}
                    <div className="flex-1 relative h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrev}
                            disabled={currentPointIndex === 0}
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={cn(
                                "h-9 w-9 rounded-full transition-all border-primary/20 hover:border-primary",
                                isPlaying && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-md shadow-primary/20"
                            )}
                        >
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNext}
                            disabled={currentPointIndex === story.points.length - 1}
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
