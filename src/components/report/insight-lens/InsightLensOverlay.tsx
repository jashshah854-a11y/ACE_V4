import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  triggerRect?: DOMRect | null;
  children: React.ReactNode;
}

export function InsightLensOverlay({ isOpen, onClose, triggerRect, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const rippleOrigin = triggerRect
    ? { x: triggerRect.left + triggerRect.width / 2, y: triggerRect.top + triggerRect.height / 2 }
    : { x: typeof window !== "undefined" ? window.innerWidth / 2 : 500, y: typeof window !== "undefined" ? window.innerHeight / 2 : 400 };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Thought Ripple backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <motion.div
              className="absolute rounded-full bg-teal-500/10"
              style={{ left: rippleOrigin.x, top: rippleOrigin.y, x: "-50%", y: "-50%" }}
              initial={{ width: 0, height: 0, opacity: 0.6 }}
              animate={{ width: "300vmax", height: "300vmax", opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          </motion.div>

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="relative z-10 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col
              bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                hover:bg-secondary transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
