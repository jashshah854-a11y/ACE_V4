import { motion } from "framer-motion";

interface StaggeredListProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } },
};

export function StaggeredList({ children, className, delay = 0 }: StaggeredListProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Helper to wrap items
export function StaggeredItem({ children, className }: { children: React.ReactNode, className?: string }) {
    return <motion.div variants={itemVariants} className={className}>{children}</motion.div>;
}
