
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from 'lucide-react';
import { Story, StoryPoint, ToneProfile } from '@/types/StoryTypes';
import { ToneSelector } from './ToneSelector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// Placeholder import - in real implementation this would map to actual chart components
import { LineChart, BarChart, CircleDot } from 'lucide-react';

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
            }, 5000); // 5 seconds per slide
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentPointIndex, story.points.length]);

    // Reset to first slide when story changes (e.g. tone switch), unless just refreshing
    useEffect(() => {
        // Optional: decide if we want to reset or keep position. 
        // For now, let's keep position to allow seamless tone switching
    }, [story.run_id, story.tone]);

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

    const renderVisualPlaceholder = (visual: any) => {
        // This uses Lucide icons as placeholders for actual Recharts components
        // In a full implementation, you'd map visual.type to <RechartsComponent />
        const Icon = visual.type === 'line_chart' ? LineChart :
            visual.type === 'bar_chart' ? BarChart : CircleDot;

        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                <Icon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-sm font-medium">Visualization: {visual.type}</p>
                <p className="text-xs opacity-75">{visual.config.title}</p>
            </div>
        );
    };

    return (
        <div className={cn("flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden", className)}>
            {/* Header / Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {story.title}
                    </h2>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                        {currentPointIndex + 1} / {story.points.length}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Updating story...
                        </div>
                    )}
                    <ToneSelector currentTone={story.tone} onToneChange={onToneChange} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPoint.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex flex-col md:flex-row"
                    >
                        {/* Left: Narrative */}
                        <div className="w-full md:w-1/3 p-8 flex flex-col justify-center bg-gray-50/30 border-r border-gray-100 overflow-y-auto">
                            <div className="space-y-6">
                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-2xl font-bold text-gray-900 leading-tight"
                                >
                                    {currentPoint.headline}
                                </motion.h3>

                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-lg text-gray-600 leading-relaxed"
                                >
                                    {currentPoint.narrative}
                                </motion.p>

                                {currentPoint.evidence.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="pt-4 border-t border-gray-200/50"
                                    >
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                            Key Evidence
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {currentPoint.evidence.map((ev, i) => (
                                                <span key={i} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600">
                                                    {ev.description}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Right: Visual */}
                        <div className="w-full md:w-2/3 p-8 bg-white">
                            {renderVisualPlaceholder(currentPoint.visual)}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer / Navigation */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    {/* Progress Bar */}
                    <div className="flex-1 mr-8 relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrev}
                            disabled={currentPointIndex === 0}
                            className="h-9 w-9"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={cn("h-9 w-9", isPlaying && "bg-blue-50 border-blue-200 text-blue-600")}
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNext}
                            disabled={currentPointIndex === story.points.length - 1}
                            className="h-9 w-9"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
