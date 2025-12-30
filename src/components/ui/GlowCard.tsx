import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    borderWidth?: number;
    spotlightColor?: string;
}

export function GlowCard({
    children,
    className,
    borderWidth = 1,
    spotlightColor = "rgba(20, 184, 166, 0.15)", // Teal tint
    ...props
}: GlowCardProps) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div
            className={cn("group relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden", className)}
            onMouseMove={handleMouseMove}
            {...props}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
                }}
            />
            <div className="relative h-full">{children}</div>
        </div>
    );
}
