import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const calculateProgress = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;

            const totalScrollable = documentHeight - windowHeight;
            const currentProgress = (scrollTop / totalScrollable) * 100;

            setProgress(Math.min(Math.max(currentProgress, 0), 100));
        };

        // Calculate on mount
        calculateProgress();

        // Update on scroll
        window.addEventListener("scroll", calculateProgress, { passive: true });
        window.addEventListener("resize", calculateProgress, { passive: true });

        return () => {
            window.removeEventListener("scroll", calculateProgress);
            window.removeEventListener("resize", calculateProgress);
        };
    }, []);

    return (
        <div className="fixed top-16 left-0 right-0 h-1 bg-muted/30 z-50">
            <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "easeOut" }}
            />
        </div>
    );
}

/**
 * Component to show reading progress badge
 */
export function ReadingProgressBadge() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const calculateProgress = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;

            const totalScrollable = documentHeight - windowHeight;
            const currentProgress = (scrollTop / totalScrollable) * 100;

            setProgress(Math.round(Math.min(Math.max(currentProgress, 0), 100)));
        };

        calculateProgress();
        window.addEventListener("scroll", calculateProgress, { passive: true });
        return () => window.removeEventListener("scroll", calculateProgress);
    }, []);

    if (progress === 0 || progress === 100) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-background/95 backdrop-blur border rounded-full px-4 py-2 shadow-lg">
                <span className="text-sm font-medium">
                    {progress}% read
                </span>
            </div>
        </div>
    );
}
