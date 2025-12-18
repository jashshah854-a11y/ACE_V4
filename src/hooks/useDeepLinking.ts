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
        const hash = location.hash.slice(1);
        if (!hash) return;

        const scrollToHash = () => {
            try {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });

                    try {
                        const accordionTrigger = element.querySelector('[data-state="closed"]');
                        if (accordionTrigger && accordionTrigger instanceof HTMLElement) {
                            accordionTrigger.click();
                        }
                    } catch (error) {
                        console.warn('Failed to expand accordion:', error);
                    }

                    return true;
                }
                return false;
            } catch (error) {
                console.error('Failed to scroll to section:', error);
                return false;
            }
        };

        if (document.readyState === 'complete') {
            scrollToHash();
        } else {
            window.addEventListener('load', scrollToHash);
            return () => window.removeEventListener('load', scrollToHash);
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
