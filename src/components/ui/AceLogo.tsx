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
          <style>{`
            .ace-dot-1 {
              transform-box: view-box;
              transform-origin: 50% 50%;
              animation: ace-orbit-cw 4s linear infinite;
            }
            .ace-dot-2 {
              transform-box: view-box;
              transform-origin: 50% 50%;
              animation: ace-orbit-ccw 6s linear infinite;
            }
            .ace-dot-3 {
              transform-box: view-box;
              transform-origin: 50% 50%;
              animation: ace-orbit-cw 8s linear infinite;
              animation-delay: -3s;
            }
            .ace-core {
              transform-box: fill-box;
              transform-origin: center;
              animation: ace-core-pulse 2.5s ease-in-out infinite;
            }
            @keyframes ace-orbit-cw {
              to { transform: rotate(360deg); }
            }
            @keyframes ace-orbit-ccw {
              to { transform: rotate(-360deg); }
            }
            @keyframes ace-core-pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
          `}</style>

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
          <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="url(#ace-orbit-grad)" strokeWidth="1.5" opacity="0.55" />
          {/* Orbit ring 2 — rotated 60° */}
          <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="url(#ace-orbit-grad)" strokeWidth="1.5" opacity="0.55" transform="rotate(60 50 50)" />
          {/* Orbit ring 3 — rotated -60° */}
          <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="url(#ace-orbit-grad)" strokeWidth="1.5" opacity="0.55" transform="rotate(-60 50 50)" />

          {/* Orbiting dot 1 — ring 1, clockwise */}
          <g className="ace-dot-1">
            <circle cx="92" cy="50" r="5" fill="#2dd4bf" filter="url(#ace-dot-glow)" />
          </g>

          {/* Orbiting dot 2 — ring 2, counter-clockwise */}
          <g className="ace-dot-2">
            <g transform="rotate(60 50 50)">
              <circle cx="92" cy="50" r="4" fill="#0891b2" filter="url(#ace-dot-glow)" />
            </g>
          </g>

          {/* Orbiting dot 3 — ring 3, clockwise with offset */}
          <g className="ace-dot-3">
            <g transform="rotate(-60 50 50)">
              <circle cx="92" cy="50" r="4.5" fill="#14b8a6" filter="url(#ace-dot-glow)" />
            </g>
          </g>

          {/* Center core — pulses */}
          <circle className="ace-core" cx="50" cy="50" r="10" fill="url(#ace-core-grad)" filter="url(#ace-glow)" />
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
