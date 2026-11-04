import type {
  BrandGuideline,
  CheckerReview,
  ContentIssue,
} from "../types/brandGuideline";

const RISKY_CLAIM_PATTERNS = [
  /\b100\s*%/gi,
  /\b(?:guarantee|guaranteed)\b[^.!?;\n]*/gi,
  /\b(?:always|never|best|number\s+one|#1)\b/gi,
];

export function analyzeContentWithRules(
  guideline: BrandGuideline,
  title: string,
  content: string,
): CheckerReview {
  const issues: ContentIssue[] = [];

  for (const restrictedTerm of guideline.restrictedWords) {
    for (const match of findTermMatches(content, restrictedTerm)) {
      const riskyClaim = isRiskyClaim(match.text);
      issues.push({
        id: createId(),
        category: "Restricted term",
        exactText: match.text,
        explanation: `"${match.text}" matches the restricted term "${restrictedTerm}" in this brand profile.`,
        severity: "high",
        suggestedCorrection: `Replace "${match.text}" with wording that follows the brand's guidelines.`,
        requiresHumanVerification: riskyClaim,
        suggestionDecision: "pending",
        reviewed: false,
      });
    }
  }

  const missingPreferredWords = guideline.preferredWords.filter(
    (term) => findTermMatches(content, term).length === 0,
  );
  if (missingPreferredWords.length > 0) {
    issues.push({
      id: createId(),
      category: "Preferred language",
      exactText: `Not present: ${missingPreferredWords.join(", ")}`,
      explanation:
        "These preferred terms were not found. This is a reminder, not a requirement to force every preferred word into every message.",
      severity: "low",
      suggestedCorrection: `Consider using ${missingPreferredWords.join(", ")} where they fit naturally.`,
      requiresHumanVerification: false,
      suggestionDecision: "pending",
      reviewed: false,
    });
  }

  for (const match of findRiskyClaims(content)) {
    issues.push({
      id: createId(),
      category: "Absolute claim",
      exactText: match,
      explanation:
        "Absolute or guarantee-style language can imply a broad promise. This rule cannot verify the claim; a human should check its evidence and context.",
      severity: "high",
      suggestedCorrection:
        "Use a specific, supportable statement and retain it only after a human verifies the evidence.",
      requiresHumanVerification: true,
      suggestionDecision: "pending",
      reviewed: false,
    });
  }

  const matchedApprovedFacts = guideline.approvedFacts.filter((fact) =>
    containsNormalizedPhrase(content, fact),
  );
  const scorePenalty = issues.reduce((total, issue) => {
    if (issue.category === "Absolute claim") return total + 22;
    if (issue.severity === "high") return total + 18;
    if (issue.severity === "medium") return total + 10;
    return total + 4;
  }, 0);
  const complianceScore = Math.max(0, 100 - scorePenalty);
  const summary =
    issues.length === 0
      ? "No rule matches were detected. This preliminary check does not guarantee compliance."
      : `${issues.length} rule-based ${issues.length === 1 ? "finding needs" : "findings need"} human review.`;

  const now = new Date().toISOString();
  return {
    id: createId(),
    brandGuidelineId: guideline.id,
    brandName: guideline.brandName,
    title: title.trim(),
    content,
    complianceScore,
    summary,
    issues,
    matchedApprovedFacts,
    analysisMode: "rules",
    reviewState: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

function findTermMatches(
  content: string,
  term: string,
): { text: string; index: number }[] {
  const normalizedTerm = term.trim();
  if (!normalizedTerm) {
    return [];
  }
  const isGuaranteed = normalizedTerm.toLocaleLowerCase() === "guaranteed";
  const escapedTerm = escapeRegExp(isGuaranteed ? "guarantee" : normalizedTerm);
  const expression = new RegExp(
    `\\b${escapedTerm}${isGuaranteed ? "d?" : ""}\\b`,
    "gi",
  );
  return Array.from(content.matchAll(expression), (match) => ({
    text: match[0],
    index: match.index ?? 0,
  }));
}

function findRiskyClaims(content: string): string[] {
  const matches = new Set<string>();
  for (const pattern of RISKY_CLAIM_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      if (match[0]) {
        matches.add(match[0].trim());
      }
    }
  }
  return [...matches];
}

function isRiskyClaim(text: string): boolean {
  return RISKY_CLAIM_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

function containsNormalizedPhrase(content: string, phrase: string): boolean {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  return normalize(content).includes(normalize(phrase));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
