export interface BrandGuideline {
  id: string;
  brandName: string;
  preferredTone: string;
  targetAudience: string;
  preferredWords: string[];
  restrictedWords: string[];
  approvedFacts: string[];
  additionalInstructions: string;
  createdAt: string;
  updatedAt: string;
}

export type SuggestionDecision =
  | "pending"
  | "accepted"
  | "rejected"
  | "edited";
export type ReviewState = "pending" | "reviewed" | "approved" | "rejected";
export type IssueSeverity = "low" | "medium" | "high";
export type AnalysisMode = "rules" | "ai";

export interface ContentIssue {
  id: string;
  category: string;
  exactText: string;
  explanation: string;
  severity: IssueSeverity;
  suggestedCorrection: string;
  requiresHumanVerification: boolean;
  suggestionDecision: SuggestionDecision;
  finalText?: string | null;
  reviewed: boolean;
}

export interface CheckerReview {
  id: string;
  brandGuidelineId: string;
  brandName: string;
  title: string;
  content: string;
  complianceScore: number;
  summary: string;
  issues: ContentIssue[];
  matchedApprovedFacts: string[];
  analysisMode?: AnalysisMode;
  reviewState: ReviewState;
  createdAt: string;
  updatedAt: string;
}

export type AppPage = "dashboard" | "guidelines" | "checker" | "history";
