import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ComparisonMode = "YoY" | "QoQ" | "MoM";

interface ComparisonToggleProps {
  value: ComparisonMode;
  onChange: (value: ComparisonMode) => void;
}

const options: { value: ComparisonMode; label: string }[] = [
  { value: "YoY", label: "Year over Year" },
  { value: "QoQ", label: "Quarter over Quarter" },
  { value: "MoM", label: "Month over Month" },
];

export function ComparisonToggle({ value, onChange }: ComparisonToggleProps) {
  return (
    <div className="inline-flex items-center bg-muted rounded-sm p-1 gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative px-4 py-2 text-xs font-medium transition-colors rounded-sm",
            value === option.value
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value === option.value && (
            <motion.div
              layoutId="comparison-toggle"
              className="absolute inset-0 bg-primary rounded-sm"
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{option.value}</span>
        </button>
      ))}
    </div>
  );
}
