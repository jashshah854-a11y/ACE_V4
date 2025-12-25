import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    position?: "left" | "right";
}

export function MobileDrawer({
    open,
    onClose,
    children,
    title = "Navigation",
    position = "left",
}: MobileDrawerProps) {
    // Close on escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    // Prevent body scroll when drawer is open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 z-50 h-full w-[85vw] max-w-sm bg-background transition-transform duration-300 ease-in-out shadow-lg",
                    position === "left" ? "left-0" : "right-0",
                    open
                        ? "translate-x-0"
                        : position === "left"
                            ? "-translate-x-full"
                            : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-2 hover:bg-muted transition-colors"
                        aria-label="Close drawer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto h-[calc(100vh-4rem)] p-4">
                    {children}
                </div>
            </div>
        </>
    );
}
