import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Custom hook for deep linking to report sections
 * Syncs URL hash with currently visible section
 */
export function useDeepLinking(sections: { id: string; title: string }[]) {
    const location = useLocation();
    const navigate = useNavigate();

    // Auto-scroll to section on page load if hash present
    useEffect(() => {
        const hash = location.hash.slice(1); // Remove #
        if (hash) {
            setTimeout(() => {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });

                    // Expand accordion if section is inside one
                    const accordionTrigger = element.querySelector('[data-state="closed"]');
                    if (accordionTrigger) {
                        (accordionTrigger as HTMLElement).click();
                    }
                }
            }, 100);
        }
    }, [location.hash]);

    // Update URL hash as user scrolls through sections
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        const newHash = `#${entry.target.id}`;
                        if (location.hash !== newHash) {
                            navigate(newHash, { replace: true });
                        }
                    }
                });
            },
            {
                threshold: [0.5],
                rootMargin: "-20% 0% -35% 0%",
            }
        );

        // Observe all section elements
        sections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, [sections, location.hash, navigate]);

    return {
        currentHash: location.hash.slice(1),
        scrollToSection: (sectionId: string) => {
            navigate(`#${sectionId}`);
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        },
        copySectionLink: (sectionId: string) => {
            const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${sectionId}`;
            return url;
        },
    };
}
