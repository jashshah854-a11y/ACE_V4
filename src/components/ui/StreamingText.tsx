import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface StreamingTextProps {
    text: string;
    speed?: number;
    className?: string;
    onComplete?: () => void;
}

export function StreamingText({ text, speed = 15, className, onComplete }: StreamingTextProps) {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let index = 0;
        setDisplayedText("");
        setIsComplete(false);

        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayedText((prev) => prev + text.charAt(index));
                index++;
            } else {
                clearInterval(interval);
                setIsComplete(true);
                onComplete?.();
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    return (
        <span className={className}>
            {displayedText}
            {!isComplete && (
                <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-[2px] h-[1em] bg-teal-500 ml-1 align-middle"
                />
            )}
        </span>
    );
}
