import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ConfettiExplosion({ onComplete }: { onComplete?: () => void }) {
    const [pieces, setPieces] = useState<number[]>([]);

    useEffect(() => {
        // Generate 50 particles
        setPieces(Array.from({ length: 50 }, (_, i) => i));
        const timer = setTimeout(() => onComplete?.(), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden flex items-center justify-center">
            {pieces.map((i) => (
                <ConfettiPiece key={i} />
            ))}
        </div>
    );
}

const ConfettiPiece = () => {
    const angle = Math.random() * 360;
    const velocity = 200 + Math.random() * 300;
    const rotate = Math.random() * 360;
    colors: ["#14b8a6", "#10b981", "#3b82f6", "#f43f5e", "#fbbf24"];
    const color = ["#14b8a6", "#10b981", "#3b82f6", "#f43f5e", "#fbbf24"][Math.floor(Math.random() * 5)];

    return (
        <motion.div
            initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
            animate={{
                x: Math.cos((angle * Math.PI) / 180) * velocity,
                y: Math.sin((angle * Math.PI) / 180) * velocity,
                scale: [1, 1, 0],
                rotate: rotate + 720,
                opacity: [1, 1, 0],
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-2 h-2 rounded-sm"
            style={{ backgroundColor: color }}
        />
    );
};
