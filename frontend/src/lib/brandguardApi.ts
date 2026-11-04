import type {
  BrandGuideline,
  CheckerReview,
  ContentIssue,
} from "../types/brandGuideline";
import { apiUrl } from "./apiConfig";
import {
  getAuthToken,
  notifyAuthenticationExpired,
} from "./authToken";

interface ApiBrand {
  id: string;
  brand_name: string;
  tone: string;
  target_audience: string;
  preferred_words: string[];
  restricted_words: string[];
  approved_facts: string[];
  additional_instructions: string;
  created_at: string;
  updated_at: string;
}

interface ApiIssue {
  id: string;
  category: string;
  exact_text: string;
  explanation: string;
  severity: ContentIssue["severity"];
  suggested_correction: string;
  requires_human_verification: boolean;
  suggestion_decision: ContentIssue["suggestionDecision"];
  final_text: string | null;
  reviewed: boolean;
}

interface ApiReview {
  id: string;
  brand_profile_id: string;
  brand_name: string;
  content_title: string;
  original_content: string;
  analysis_mode: "rule-based" | "AI";
  compliance_score: number;
  analysis_summary: string;
  issues: ApiIssue[];
  matched_approved_facts: string[];
  review_status: "pending" | "reviewed" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

interface ApiError {
  detail?: string | Array<{ msg?: string }>;
}

export class BackendApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
  }
}

export const brandguardApi = {
  async listBrands(): Promise<BrandGuideline[]> {
    const brands = await request<ApiBrand[]>("/api/brands");
    return brands.map(fromApiBrand);
  },

  async createBrand(brand: BrandGuideline): Promise<BrandGuideline> {
    const created = await request<ApiBrand>("/api/brands", {
      method: "POST",
      body: JSON.stringify(toApiBrand(brand)),
    });
    return fromApiBrand(created);
  },

  async updateBrand(brand: BrandGuideline): Promise<BrandGuideline> {
    const updated = await request<ApiBrand>(`/api/brands/${brand.id}`, {
      method: "PUT",
      body: JSON.stringify(toApiBrand(brand)),
    });
    return fromApiBrand(updated);
  },

  async deleteBrand(id: string): Promise<void> {
    await request<void>(`/api/brands/${id}`, { method: "DELETE" });
  },

  async listReviews(): Promise<CheckerReview[]> {
    const reviews = await request<ApiReview[]>("/api/reviews");
    return reviews.map(fromApiReview);
  },

  async createReview(review: CheckerReview): Promise<CheckerReview> {
    const created = await request<ApiReview>("/api/reviews", {
      method: "POST",
      body: JSON.stringify(toApiReview(review)),
    });
    return fromApiReview(created);
  },

  async updateReview(review: CheckerReview): Promise<CheckerReview> {
    const updated = await request<ApiReview>(`/api/reviews/${review.id}`, {
      method: "PUT",
      body: JSON.stringify({
        review_status: review.reviewState,
        issues: review.issues.map(toApiIssue),
      }),
    });
    return fromApiReview(updated);
  },

  async getReview(id: string): Promise<CheckerReview> {
    const review = await request<ApiReview>(`/api/reviews/${id}`);
    return fromApiReview(review);
  },

  async saveSuggestionDecision(
    reviewId: string,
    issueId: string,
    issue: ContentIssue,
  ): Promise<CheckerReview> {
    const updated = await request<ApiReview>(
      `/api/reviews/${reviewId}/suggestions/${encodeURIComponent(issueId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          issue_id: issueId,
          decision: issue.suggestionDecision,
          final_text: issue.finalText ?? null,
        }),
      },
    );
    return fromApiReview(updated);
  },
};

function requestOptions(
  options: RequestInit,
): RequestInit {
  const token = getAuthToken();
  return {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), requestOptions(options));
  } catch {
    throw new BackendApiError(
      "The FastAPI backend is unavailable. Start it on port 8000; no data was saved.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      notifyAuthenticationExpired();
    }
    throw new BackendApiError(
      errorMessage(body, response.status),
      response.status,
    );
  }
  return body as T;
}

function errorMessage(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "detail" in body
  ) {
    const detail = (body as ApiError).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg ?? "Invalid request.").join(" ");
    }
  }
  return `Backend request failed (HTTP ${status}). No data was saved.`;
}

function fromApiBrand(brand: ApiBrand): BrandGuideline {
  return {
    id: brand.id,
    brandName: brand.brand_name,
    preferredTone: brand.tone,
    targetAudience: brand.target_audience,
    preferredWords: brand.preferred_words,
    restrictedWords: brand.restricted_words,
    approvedFacts: brand.approved_facts,
    additionalInstructions: brand.additional_instructions,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at,
  };
}

function toApiBrand(brand: BrandGuideline) {
  return {
    brand_name: brand.brandName,
    tone: brand.preferredTone,
    target_audience: brand.targetAudience,
    preferred_words: brand.preferredWords,
    restricted_words: brand.restrictedWords,
    approved_facts: brand.approvedFacts,
    additional_instructions: brand.additionalInstructions,
  };
}

function toApiReview(review: CheckerReview) {
  return {
    ...(isUuid(review.id) ? { id: review.id } : {}),
    brand_profile_id: review.brandGuidelineId,
    content_title: review.title,
    original_content: review.content,
    analysis_mode: review.analysisMode === "ai" ? "AI" : "rule-based",
    compliance_score: review.complianceScore,
    analysis_summary: review.summary,
    issues: review.issues.map(toApiIssue),
    matched_approved_facts: review.matchedApprovedFacts,
    review_status: review.reviewState,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toApiIssue(issue: ContentIssue) {
  return {
    id: issue.id,
    category: issue.category,
    exact_text: issue.exactText,
    explanation: issue.explanation,
    severity: issue.severity,
    suggested_correction: issue.suggestedCorrection,
    requires_human_verification: issue.requiresHumanVerification,
    suggestion_decision: issue.suggestionDecision,
    final_text: issue.finalText ?? null,
    reviewed: issue.reviewed,
  };
}

function fromApiReview(review: ApiReview): CheckerReview {
  return {
    id: review.id,
    brandGuidelineId: review.brand_profile_id,
    brandName: review.brand_name,
    title: review.content_title,
    content: review.original_content,
    analysisMode: review.analysis_mode === "AI" ? "ai" : "rules",
    complianceScore: review.compliance_score,
    summary: review.analysis_summary,
    issues: review.issues.map((issue) => ({
      id: issue.id,
      category: issue.category,
      exactText: issue.exact_text,
      explanation: issue.explanation,
      severity: issue.severity,
      suggestedCorrection: issue.suggested_correction,
      requiresHumanVerification: issue.requires_human_verification,
      suggestionDecision: issue.suggestion_decision,
      finalText: issue.final_text,
      reviewed: issue.reviewed,
    })),
    matchedApprovedFacts: review.matched_approved_facts,
    reviewState: review.review_status,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };
}
