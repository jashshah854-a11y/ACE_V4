import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface KeyboardShortcutsOptions {
    onNextSection?: () => void;
    onPreviousSection?: () => void;
    onExpandAll?: () => void;
    onCollapseAll?: () => void;
    onFocusSearch?: () => void;
    onScrollToTop?: () => void;
    onScrollToBottom?: () => void;
    onShowHelp?: () => void;
}

/**
 * Custom hook for keyboard shortcuts in report viewer
 * Supports common navigation patterns for power users
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
    const gKeyPressed = useRef(false);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            // Handle 'G' key for goto commands
            if (e.key.toLowerCase() === "g") {
                gKeyPressed.current = true;
                setTimeout(() => {
                    gKeyPressed.current = false;
                }, 1000);
                return;
            }

            // Goto commands (G + T for top, G + B for bottom)
            if (gKeyPressed.current) {
                if (e.key.toLowerCase() === "t" && options.onScrollToTop) {
                    e.preventDefault();
                    options.onScrollToTop();
                    gKeyPressed.current = false;
                    toast.info("Scrolled to top");
                    return;
                }
                if (e.key.toLowerCase() === "b" && options.onScrollToBottom) {
                    e.preventDefault();
                    options.onScrollToBottom();
                    gKeyPressed.current = false;
                    toast.info("Scrolled to bottom");
                    return;
                }
            }

            // Single key shortcuts
            switch (e.key.toLowerCase()) {
                case "j":
                    e.preventDefault();
                    options.onNextSection?.();
                    break;

                case "k":
                    e.preventDefault();
                    options.onPreviousSection?.();
                    break;

                case "e":
                    e.preventDefault();
                    options.onExpandAll?.();
                    toast.success("Expanded all sections");
                    break;

                case "c":
                    e.preventDefault();
                    options.onCollapseAll?.();
                    toast.success("Collapsed all sections");
                    break;

                case "/":
                    e.preventDefault();
                    options.onFocusSearch?.();
                    break;

                case "?":
                    e.preventDefault();
                    options.onShowHelp?.();
                    break;

                case "escape":
                    // Clear search or close modals
                    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                    if (searchInput) {
                        searchInput.value = "";
                        searchInput.blur();
                    }
                    break;
            }
        },
        [options]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Get list of keyboard shortcuts for help dialog
 */
export const KEYBOARD_SHORTCUTS = [
    { key: "J", description: "Next section" },
    { key: "K", description: "Previous section" },
    { key: "E", description: "Expand all sections" },
    { key: "C", description: "Collapse all sections" },
    { key: "/", description: "Focus search" },
    { key: "Esc", description: "Clear search / Close modals" },
    { key: "G then T", description: "Go to top" },
    { key: "G then B", description: "Go to bottom" },
    { key: "?", description: "Show this help" },
];
