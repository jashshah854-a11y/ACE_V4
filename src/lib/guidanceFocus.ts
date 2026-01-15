export interface GuidanceFocusOptions {
  requireMatch?: boolean;
  onMissing?: () => void;
}

export interface EvidenceFocusOptions {
  evidenceId?: string;
}

export function focusGuidance(context: string, options: GuidanceFocusOptions = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const { requireMatch = false, onMissing } = options;

  if (requireMatch) {
    const selector = `[data-guidance-context="${context}"]`;
    const target = document.querySelector(selector);
    if (!target) {
      onMissing?.();
      return false;
    }
  }

  window.dispatchEvent(new CustomEvent("ace:focus-guidance", { detail: { context } }));
  return true;
}

export function focusEvidenceSection(section: string, options: EvidenceFocusOptions = {}) {
  if (typeof window === "undefined") return false;
  const detail = { section, ...options };
  window.dispatchEvent(new CustomEvent("ace:focus-evidence", { detail }));
  return true;
}
