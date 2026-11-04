import type {
  AnalysisMode,
  BrandGuideline,
  CheckerReview,
  ContentIssue,
} from "../types/brandGuideline";
import { apiUrl } from "./apiConfig";
import {
  getAuthToken,
  notifyAuthenticationExpired,
} from "./authToken";

interface ApiAnalysisIssue {
  category: string;
  exact_text: string;
  explanation: string;
  severity: ContentIssue["severity"];
  suggested_correction: string;
  requires_human_verification: boolean;
}

interface ApiAnalysisResponse {
  compliance_score: number;
  summary: string;
  issues: ApiAnalysisIssue[];
  matched_approved_facts: string[];
}

interface ApiErrorResponse {
  detail?: string;
}

export async function analyzeContentWithAi(
  guideline: BrandGuideline,
  title: string,
  content: string,
): Promise<CheckerReview> {
  let response: Response;
  try {
    const token = getAuthToken();
    response = await fetch(apiUrl("/api/analyze"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title,
        content,
        guidelines: {
          brand_name: guideline.brandName,
          preferred_tone: guideline.preferredTone,
          target_audience: guideline.targetAudience,
          preferred_words: guideline.preferredWords,
          restricted_words: guideline.restrictedWords,
          approved_facts: guideline.approvedFacts,
          additional_instructions: guideline.additionalInstructions,
        },
      }),
    });
  } catch {
    throw new Error(
      "Could not reach the FastAPI backend. Start it on port 8000 and try again.",
    );
  }

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      notifyAuthenticationExpired();
    }
    const apiError = isApiErrorResponse(responseBody)
      ? responseBody.detail
      : undefined;
    throw new Error(
      apiError ?? `AI analysis failed with HTTP ${response.status}. Please try again.`,
    );
  }

  if (!isApiAnalysisResponse(responseBody)) {
    throw new Error(
      "The backend returned an unexpected analysis response. Please retry.",
    );
  }

  const now = new Date().toISOString();
  return {
    id: createId(),
    brandGuidelineId: guideline.id,
    brandName: guideline.brandName,
    title: title.trim(),
    content,
    complianceScore: responseBody.compliance_score,
    summary: responseBody.summary,
    issues: responseBody.issues.map((issue) => ({
      id: createId(),
      category: issue.category,
      exactText: issue.exact_text,
      explanation: issue.explanation,
      severity: issue.severity,
      suggestedCorrection: issue.suggested_correction,
      requiresHumanVerification: issue.requires_human_verification,
      suggestionDecision: "pending",
      reviewed: false,
    })),
    matchedApprovedFacts: responseBody.matched_approved_facts,
    analysisMode: "ai" satisfies AnalysisMode,
    reviewState: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    (!("detail" in value) ||
      typeof (value as Record<string, unknown>).detail === "string")
  );
}

function isApiAnalysisResponse(value: unknown): value is ApiAnalysisResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const result = value as Record<string, unknown>;
  return (
    typeof result.compliance_score === "number" &&
    result.compliance_score >= 0 &&
    result.compliance_score <= 100 &&
    typeof result.summary === "string" &&
    Array.isArray(result.issues) &&
    result.issues.every(isApiAnalysisIssue) &&
    Array.isArray(result.matched_approved_facts) &&
    result.matched_approved_facts.every((fact) => typeof fact === "string")
  );
}

function isApiAnalysisIssue(value: unknown): value is ApiAnalysisIssue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const issue = value as Record<string, unknown>;
  return (
    typeof issue.category === "string" &&
    typeof issue.exact_text === "string" &&
    typeof issue.explanation === "string" &&
    (issue.severity === "low" ||
      issue.severity === "medium" ||
      issue.severity === "high") &&
    typeof issue.suggested_correction === "string" &&
    typeof issue.requires_human_verification === "boolean"
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
