import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AceLogoProps {
  className?: string;
  mode?: "icon" | "full";
  size?: "sm" | "md" | "lg" | "xl";
}

export function AceLogo({ className, mode = "full", size = "md" }: AceLogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
    xl: "h-16",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  return (
    <div className={cn("flex items-center gap-3 font-sans", className)}>
      <div className={cn("relative aspect-square flex items-center justify-center", sizeClasses[size])}>
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="ace-orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <radialGradient id="ace-core-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="60%" stopColor="#2dd4bf" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.7" />
            </radialGradient>
            <filter id="ace-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="ace-dot-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Orbit ring 1 — horizontal */}
          <ellipse
            cx="50" cy="50" rx="42" ry="16"
            fill="none"
            stroke="url(#ace-orbit-grad)"
            strokeWidth="1.5"
            opacity="0.55"
          />
          {/* Orbit ring 2 — rotated 60° */}
          <ellipse
            cx="50" cy="50" rx="42" ry="16"
            fill="none"
            stroke="url(#ace-orbit-grad)"
            strokeWidth="1.5"
            opacity="0.55"
            transform="rotate(60 50 50)"
          />
          {/* Orbit ring 3 — rotated -60° */}
          <ellipse
            cx="50" cy="50" rx="42" ry="16"
            fill="none"
            stroke="url(#ace-orbit-grad)"
            strokeWidth="1.5"
            opacity="0.55"
            transform="rotate(-60 50 50)"
          />

          {/* Orbiting dot 1 — travels ring 1 clockwise */}
          <motion.g
            style={{ transformOrigin: "50px 50px" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          >
            <circle cx="92" cy="50" r="5" fill="#2dd4bf" filter="url(#ace-dot-glow)" />
          </motion.g>

          {/* Orbiting dot 2 — travels ring 2 counter-clockwise, slower */}
          <motion.g
            style={{ transformOrigin: "50px 50px" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          >
            <g transform="rotate(60 50 50)">
              <circle cx="92" cy="50" r="4" fill="#0891b2" filter="url(#ace-dot-glow)" />
            </g>
          </motion.g>

          {/* Orbiting dot 3 — travels ring 3 clockwise, different speed */}
          <motion.g
            style={{ transformOrigin: "50px 50px" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear", delay: -3 }}
          >
            <g transform="rotate(-60 50 50)">
              <circle cx="92" cy="50" r="4.5" fill="#14b8a6" filter="url(#ace-dot-glow)" />
            </g>
          </motion.g>

          {/* Center core — pulses */}
          <motion.circle
            cx="50" cy="50" r="10"
            fill="url(#ace-core-grad)"
            filter="url(#ace-glow)"
            animate={{ r: [10, 12, 10], opacity: [1, 0.85, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {mode === "full" && (
        <div className="flex flex-col justify-center">
          <h1 className={cn("font-bold tracking-tight leading-none text-slate-900 dark:text-slate-100", textSizes[size])}>
            ACE
          </h1>
          {size !== "sm" && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest pl-0.5">
              Automated Curiosity Engine
            </span>
          )}
        </div>
      )}
    </div>
  );
}
