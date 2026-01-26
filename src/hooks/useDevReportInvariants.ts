import { useEffect } from "react";

type ViewPolicy = {
  allowed_sections?: string[];
};

type TocItem = {
  id: string;
};

type DevInvariantOptions = {
  rootSelector?: string;
  tocItems?: TocItem[];
  renderedSectionIds?: string[];
  viewPolicy?: ViewPolicy | null;
  maxPrimarySections?: number;
};

const BANNED_PHRASES = ["CERTIFIED", "AI CONFIDENCE", "Overall confidence", "HIGH CONFIDENCE"];

export function useDevReportInvariants(options: DevInvariantOptions) {
  useEffect(() => {
    if (import.meta.env.MODE === "production" || import.meta.env.MODE === "test") return;

    const root = options.rootSelector
      ? document.querySelector(options.rootSelector)
      : document.body;

    if (!root) return;

    const bodyText = root.textContent || "";
    BANNED_PHRASES.forEach((phrase) => {
      if (bodyText.includes(phrase)) {
        throw new Error(`Invariant violation: banned phrase "${phrase}" found in DOM.`);
      }
    });

    const tocItems = options.tocItems || [];
    tocItems.forEach((item) => {
      if (!document.getElementById(item.id)) {
        throw new Error(`Invariant violation: TOC entry ${item.id} missing rendered section.`);
      }
    });

    const renderedSectionIds = options.renderedSectionIds || [];
    const allowed = new Set(options.viewPolicy?.allowed_sections || []);
    if (allowed.size && renderedSectionIds.length) {
      renderedSectionIds.forEach((sectionId) => {
        if (!allowed.has(sectionId)) {
          throw new Error(`Invariant violation: section ${sectionId} not allowed by view policy.`);
        }
      });
    }

    const disabledButtons = Array.from(
      root.querySelectorAll("button:disabled, button[aria-disabled='true']"),
    ).filter((button) => !button.hasAttribute("data-allow-disabled"));

    if (disabledButtons.length) {
      throw new Error("Invariant violation: disabled buttons detected on report surface.");
    }

    const maxSections = options.maxPrimarySections;
    if (typeof maxSections === "number" && renderedSectionIds.length > maxSections) {
      throw new Error(`Invariant violation: primary section count exceeds ${maxSections}.`);
    }
  }, [options.rootSelector, options.tocItems, options.renderedSectionIds, options.viewPolicy]);
}
