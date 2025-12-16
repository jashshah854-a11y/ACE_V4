import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface SectionDividerProps {
    icon: LucideIcon;
    title: string;
    className?: string;
}

/**
 * Visual section divider with semantic icon
 * Helps with scanning and structure reinforcement
 */
export function SectionDivider({ icon: Icon, title, className }: SectionDividerProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex items-center gap-4 my-8 ${className || ''}`}
        >
            {/* Left Line */}
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />

            {/* Icon + Title */}
            <div className="flex items-center gap-3 px-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold whitespace-nowrap">{title}</h3>
            </div>

            {/* Right Line */}
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
        </motion.div>
    );
}
