import type {
  BrandGuideline,
  CheckerReview,
  ContentIssue,
  IssueSeverity,
  SuggestionDecision,
} from "../types/brandGuideline";

const GUIDELINES_STORAGE_KEY = "brandguard.brand-guidelines.v1";
const REVIEWS_STORAGE_KEY = "brandguard.checker-reviews.v1";

export const brandGuidelineStorage = {
  async load(): Promise<BrandGuideline[]> {
    const storedValue = window.localStorage.getItem(GUIDELINES_STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (
      !Array.isArray(parsedValue) ||
      !parsedValue.every(isBrandGuideline)
    ) {
      throw new Error(
        "Saved brand profiles could not be read. Clear the damaged BrandGuard data or try again.",
      );
    }

    return parsedValue;
  },

  async save(guidelines: BrandGuideline[]): Promise<void> {
    window.localStorage.setItem(
      GUIDELINES_STORAGE_KEY,
      JSON.stringify(guidelines),
    );
  },

  async loadReviews(): Promise<CheckerReview[]> {
    const storedValue = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue) || !parsedValue.every(isCheckerReview)) {
      throw new Error(
        "Saved content checks could not be read. Clear the damaged BrandGuard review data or try again.",
      );
    }
    return parsedValue;
  },

  async saveReviews(reviews: CheckerReview[]): Promise<void> {
    window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  },
};

function isBrandGuideline(value: unknown): value is BrandGuideline {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const guideline = value as Record<string, unknown>;
  return (
    typeof guideline.id === "string" &&
    typeof guideline.brandName === "string" &&
    typeof guideline.preferredTone === "string" &&
    typeof guideline.targetAudience === "string" &&
    Array.isArray(guideline.preferredWords) &&
    guideline.preferredWords.every((word) => typeof word === "string") &&
    Array.isArray(guideline.restrictedWords) &&
    guideline.restrictedWords.every((word) => typeof word === "string") &&
    Array.isArray(guideline.approvedFacts) &&
    guideline.approvedFacts.every((fact) => typeof fact === "string") &&
    typeof guideline.additionalInstructions === "string" &&
    typeof guideline.createdAt === "string" &&
    typeof guideline.updatedAt === "string"
  );
}

function isCheckerReview(value: unknown): value is CheckerReview {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const review = value as Record<string, unknown>;
  return (
    typeof review.id === "string" &&
    typeof review.brandGuidelineId === "string" &&
    typeof review.brandName === "string" &&
    typeof review.title === "string" &&
    typeof review.content === "string" &&
    typeof review.complianceScore === "number" &&
    typeof review.summary === "string" &&
    Array.isArray(review.issues) &&
    review.issues.every(isContentIssue) &&
    Array.isArray(review.matchedApprovedFacts) &&
    review.matchedApprovedFacts.every((fact) => typeof fact === "string") &&
    (review.analysisMode === undefined ||
      review.analysisMode === "rules" ||
      review.analysisMode === "ai") &&
    (review.reviewState === "pending" ||
      review.reviewState === "reviewed" ||
      review.reviewState === "approved" ||
      review.reviewState === "rejected") &&
    typeof review.createdAt === "string" &&
    typeof review.updatedAt === "string"
  );
}

function isContentIssue(value: unknown): value is ContentIssue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const issue = value as Record<string, unknown>;
  const severities: IssueSeverity[] = ["low", "medium", "high"];
  const decisions: SuggestionDecision[] = [
    "pending",
    "accepted",
    "rejected",
    "edited",
  ];
  return (
    typeof issue.id === "string" &&
    typeof issue.category === "string" &&
    typeof issue.exactText === "string" &&
    typeof issue.explanation === "string" &&
    severities.includes(issue.severity as IssueSeverity) &&
    typeof issue.suggestedCorrection === "string" &&
    typeof issue.requiresHumanVerification === "boolean" &&
    decisions.includes(issue.suggestionDecision as SuggestionDecision) &&
    (issue.finalText === undefined ||
      issue.finalText === null ||
      typeof issue.finalText === "string") &&
    typeof issue.reviewed === "boolean"
  );
}
