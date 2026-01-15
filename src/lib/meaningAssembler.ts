import type { HeroInsight } from "@/lib/insightExtractors";
import type { ReportSection } from "@/lib/reportParser";

export interface NarrativeModule {
  id: string;
  title: string;
  importance: number;
  excerpt: string;
  scqa: {
    situation: string;
    complication: string;
    question: string;
    answer: string;
  };
}

export interface NarrativeAssembly {
  governingThought: string;
  primary: NarrativeModule[];
  appendix: NarrativeModule[];
}

interface AssembleOptions {
  heroInsight?: HeroInsight;
  primaryQuestion?: string;
  successCriteria?: string;
}

const COMPLICATION_KEYWORDS = [
  "risk",
  "decrease",
  "decline",
  "drop",
  "spike",
  "surge",
  "gap",
  "issue",
  "warning",
  "delay",
  "missing",
  "shortfall",
  "inflation",
  "bottleneck",
  "volatile",
  "churn",
  "attrition",
  "overrun",
  "underperform"
];

const QUESTION_TEMPLATES = [
  (title: string) => `How should we respond to ${title}?`,
  (title: string) => `What does ${title} mean for our decision?`,
];

const MIN_IMPORTANCE = 0.05;

export function assembleNarrative(
  sections: Array<ReportSection & { importance?: number }>,
  options: AssembleOptions = {}
): NarrativeAssembly {
  const meaningful = sections.filter((section) => section?.content?.trim().length);
  const modules = meaningful.map((section, index) => buildModule(section, options, index));
  const sorted = [...modules].sort((a, b) => (b.importance ?? MIN_IMPORTANCE) - (a.importance ?? MIN_IMPORTANCE));
  const primary = sorted.filter((module) => module.importance >= 0.45).slice(0, 4);
  const appendixPool = sorted.filter((module) => !primary.includes(module));
  const appendix = appendixPool.length ? appendixPool : sorted.slice(4);
  const finalPrimary = primary.length ? primary : sorted.slice(0, 2);
  const governingThought = deriveGoverningThought(options.heroInsight, finalPrimary, options);

  return {
    governingThought,
    primary: finalPrimary,
    appendix,
  };
}

function buildModule(section: ReportSection & { importance?: number }, options: AssembleOptions, index: number): NarrativeModule {
  const rawSentences = tokenizeSentences(section.content);
  const fallback = sanitizeTitle(section.title || `Section ${index + 1}`);
  const situation = rawSentences[0] || fallback;
  const complication = findComplication(rawSentences) || rawSentences[1] || options.heroInsight?.context || fallback;
  const question = deriveQuestion(section.title, options, index);
  const answer = deriveAnswer(rawSentences, options.heroInsight) || options.heroInsight?.keyInsight || fallback;
  const excerpt = rawSentences.slice(0, 2).join(" ") || section.content.slice(0, 140);

  return {
    id: section.id || `section-${index}`,
    title: fallback,
    importance: section.importance ?? MIN_IMPORTANCE,
    excerpt,
    scqa: {
      situation,
      complication,
      question,
      answer,
    },
  };
}

function deriveGoverningThought(
  heroInsight: HeroInsight | undefined,
  modules: NarrativeModule[],
  options: AssembleOptions
) {
  if (heroInsight?.keyInsight) return heroInsight.keyInsight;
  if (modules[0]?.scqa.answer) return modules[0].scqa.answer;
  if (modules[0]?.scqa.situation) return modules[0].scqa.situation;
  if (options.primaryQuestion) return `Analysis anchored on ${options.primaryQuestion}`;
  return "Analysis complete";
}

function deriveQuestion(title: string | undefined, options: AssembleOptions, index: number) {
  const normalizedTitle = sanitizeTitle(title || `Insight ${index + 1}`);
  if (options.primaryQuestion) {
    return `How does ${normalizedTitle} influence ${options.primaryQuestion.toLowerCase()}?`;
  }
  if (options.successCriteria) {
    return `Does ${normalizedTitle} move us toward ${options.successCriteria.toLowerCase()}?`;
  }
  const template = QUESTION_TEMPLATES[index % QUESTION_TEMPLATES.length];
  return template(normalizedTitle);
}

function deriveAnswer(sentences: string[], heroInsight?: HeroInsight) {
  const quantitative = sentences.find((sentence) => /\d/.test(sentence));
  if (quantitative) return quantitative;
  if (sentences.length) return sentences[sentences.length - 1];
  if (heroInsight?.recommendation) return heroInsight.recommendation;
  return undefined;
}

function findComplication(sentences: string[]) {
  return sentences.find((sentence) => {
    const lower = sentence.toLowerCase();
    return COMPLICATION_KEYWORDS.some((keyword) => lower.includes(keyword));
  });
}

function tokenizeSentences(markdown: string): string[] {
  if (!markdown) return [];
  const normalized = markdown
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sanitizeTitle(title: string) {
  return title.replace(/^[\d#*\s.-]+/, "").trim();
}
