import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { ContentIssueCard } from "../components/ContentIssueCard";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import { analyzeContentWithAi } from "../lib/aiAnalysisApi";
import { analyzeContentWithRules } from "../lib/ruleBasedAnalysis";
import type {
  AnalysisMode,
  AppPage,
  BrandGuideline,
  CheckerReview,
  ContentIssue,
} from "../types/brandGuideline";

interface ContentCheckerPageProps {
  guidelines: BrandGuideline[];
  selectedGuidelineId: string;
  selectedReviewId: string;
  reviews: CheckerReview[];
  onSelectGuideline: (id: string) => void;
  onNavigate: (page: AppPage) => void;
  onSaveReview: (review: CheckerReview) => Promise<CheckerReview>;
  onSaveSuggestion: (
    reviewId: string,
    issue: ContentIssue,
  ) => Promise<CheckerReview>;
  onSelectReview: (id: string) => void;
}

export function ContentCheckerPage({
  guidelines,
  selectedGuidelineId,
  selectedReviewId,
  reviews,
  onSelectGuideline,
  onNavigate,
  onSaveReview,
  onSaveSuggestion,
  onSelectReview,
}: ContentCheckerPageProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("rules");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">(
    "success",
  );

  const sortedReviews = [...reviews].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
  const latestReview =
    sortedReviews.find((review) => review.id === selectedReviewId) ??
    sortedReviews[0];
  const selectedGuideline = guidelines.find(
    (guideline) => guideline.id === selectedGuidelineId,
  );
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!selectedGuideline) {
      nextErrors.brand = "Select a saved brand profile before checking content.";
    }
    if (!title.trim()) {
      nextErrors.title = "Enter a title for this content.";
    }
    if (!content.trim()) {
      nextErrors.content = "Paste the marketing content you want to check.";
    }
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length > 0 || !selectedGuideline) {
      setMessageKind("error");
      setMessage(
        `Complete the required fields to run the ${analysisMode === "ai" ? "AI" : "rule-based"} check.`,
      );
      return;
    }

    setProcessing(true);
    try {
      const review =
        analysisMode === "ai"
          ? await analyzeContentWithAi(selectedGuideline, title, content)
          : analyzeContentWithRules(selectedGuideline, title, content);
      const savedReview = await onSaveReview(review);
      onSelectReview(savedReview.id);
      setMessageKind("success");
      setMessage(
        analysisMode === "ai"
          ? "AI analysis completed. Review every finding; the model does not approve or publish content."
          : "Rule-based check complete. Review every finding before deciding what to do.",
      );
    } catch (error) {
      setMessageKind("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save this content check in this browser.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function updateIssue(review: CheckerReview, changedIssue: ContentIssue) {
    const currentIssue = review.issues.find(
      (issue) => issue.id === changedIssue.id,
    );
    if (
      currentIssue &&
      (currentIssue.suggestionDecision !== changedIssue.suggestionDecision ||
        currentIssue.finalText !== changedIssue.finalText)
    ) {
      try {
        await onSaveSuggestion(review.id, changedIssue);
        setMessage("");
      } catch (error) {
        setMessageKind("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not save this suggestion decision.",
        );
      }
      return;
    }

    const updatedReview = {
      ...review,
      issues: review.issues.map((issue) =>
        issue.id === changedIssue.id ? changedIssue : issue,
      ),
      updatedAt: new Date().toISOString(),
    };
    await persistReview(updatedReview);
  }

  async function markReviewAsReviewed(review: CheckerReview) {
    await persistReview({
      ...review,
      reviewState: review.reviewState === "reviewed" ? "pending" : "reviewed",
      updatedAt: new Date().toISOString(),
    });
  }

  async function setContentDecision(
    review: CheckerReview,
    reviewState: CheckerReview["reviewState"],
  ) {
    await persistReview({
      ...review,
      reviewState,
      updatedAt: new Date().toISOString(),
    });
  }

  async function persistReview(review: CheckerReview) {
    try {
      await onSaveReview(review);
      setMessage("");
    } catch (error) {
      setMessageKind("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save your review decision.",
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Content review"
        title="Content Checker"
        description="Check marketing content against saved brand guidelines. A human reviewer remains responsible for every decision."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <AppIcon
          name="alert"
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
        />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {analysisMode === "ai"
              ? "AI analysis — human review still required"
              : "Preliminary rule-based analysis — not AI analysis"}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-900/80">
            {analysisMode === "ai"
              ? "The backend sends the content and selected guidelines to the configured AI provider. AI can miss context and does not establish that a claim is true. Human review is required."
              : "Checks compare text with the selected profile and a small set of absolute-claim patterns. They can miss context and do not verify whether any claim is true. Human review is required."}
          </p>
        </div>
      </div>

      {message && <StatusMessage kind={messageKind}>{message}</StatusMessage>}

      {guidelines.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <AppIcon name="guidelines" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-950">
            Add a brand profile first
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            The checker uses saved brand guidelines from this browser. Create
            your own profile or load the labeled demo profile.
          </p>
          <button
            className="button-primary mx-auto mt-5"
            onClick={() => onNavigate("guidelines")}
            type="button"
          >
            <AppIcon name="plus" className="h-4 w-4" />
            Open Brand Guidelines
          </button>
        </section>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-950">Content to check</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose guidelines and add the content exactly as it will be reviewed.
              </p>
            </div>

            <form className="space-y-4" noValidate onSubmit={handleSubmit}>
              <fieldset>
                <legend className="form-label">Analysis mode</legend>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    aria-pressed={analysisMode === "rules"}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      analysisMode === "rules"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setAnalysisMode("rules")}
                    type="button"
                  >
                    Rule-based
                  </button>
                  <button
                    aria-pressed={analysisMode === "ai"}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      analysisMode === "ai"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setAnalysisMode("ai")}
                    type="button"
                  >
                    AI Analysis
                  </button>
                </div>
              </fieldset>

              <div>
                <label className="form-label" htmlFor="checker-brand">
                  Brand profile <span className="text-rose-600">*</span>
                </label>
                <select
                  aria-describedby={errors.brand ? "checker-brand-error" : undefined}
                  aria-invalid={Boolean(errors.brand)}
                  className={`form-control ${errors.brand ? "border-rose-400" : ""}`}
                  id="checker-brand"
                  onChange={(event) => {
                    onSelectGuideline(event.target.value);
                    setErrors((current) => ({ ...current, brand: "" }));
                  }}
                  value={selectedGuidelineId}
                >
                  <option value="">Select a saved profile</option>
                  {guidelines.map((guideline) => (
                    <option key={guideline.id} value={guideline.id}>
                      {guideline.brandName}
                    </option>
                  ))}
                </select>
                {errors.brand && (
                  <p className="mt-1.5 text-xs text-rose-700" id="checker-brand-error">
                    {errors.brand}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label" htmlFor="checker-title">
                  Content title <span className="text-rose-600">*</span>
                </label>
                <input
                  aria-describedby={errors.title ? "checker-title-error" : undefined}
                  aria-invalid={Boolean(errors.title)}
                  className={`form-control ${errors.title ? "border-rose-400" : ""}`}
                  id="checker-title"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setErrors((current) => ({ ...current, title: "" }));
                  }}
                  placeholder="e.g. Homepage headline"
                  value={title}
                />
                {errors.title && (
                  <p className="mt-1.5 text-xs text-rose-700" id="checker-title-error">
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="form-label mb-0" htmlFor="checker-content">
                    Marketing content <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-xs text-slate-400" aria-live="polite">
                    {wordCount} {wordCount === 1 ? "word" : "words"}
                  </span>
                </div>
                <textarea
                  aria-describedby={
                    errors.content ? "checker-content-error" : "checker-content-help"
                  }
                  aria-invalid={Boolean(errors.content)}
                  className={`form-control min-h-[220px] resize-y leading-6 ${errors.content ? "border-rose-400" : ""}`}
                  id="checker-content"
                  onChange={(event) => {
                    setContent(event.target.value);
                    setErrors((current) => ({ ...current, content: "" }));
                  }}
                  placeholder="Paste your marketing copy here…"
                  value={content}
                />
                <p
                  className="mt-1.5 text-xs leading-5 text-slate-400"
                  id="checker-content-help"
                >
                  Your original text is kept unchanged and shown with the results.
                </p>
                {errors.content && (
                  <p className="mt-1.5 text-xs text-rose-700" id="checker-content-error">
                    {errors.content}
                  </p>
                )}
              </div>

              <button
                className="button-primary w-full"
                disabled={processing || guidelines.length === 0}
                type="submit"
              >
                {processing ? (
                  <>
                    <span className="loading-spinner" aria-hidden="true" />
                    {analysisMode === "ai" ? "Waiting for AI…" : "Checking content…"}
                  </>
                ) : (
                  <>
                    <AppIcon
                      name={analysisMode === "ai" ? "sparkles" : "checker"}
                      className="h-4 w-4"
                    />
                    {analysisMode === "ai"
                      ? "Run AI Analysis"
                      : "Check Content"}
                  </>
                )}
              </button>
              <p className="text-center text-[11px] leading-5 text-slate-400">
                {analysisMode === "ai"
                          ? "AI runs through FastAPI. Results and review actions are saved in SQLite."
                          : "Rule-based results and reviewer actions are saved in SQLite through FastAPI."}
              </p>
            </form>
          </section>

          <div className="space-y-6">
            {latestReview ? (
              <ReviewResult
                onIssueChange={(issue) => void updateIssue(latestReview, issue)}
                onMarkReviewed={() => void markReviewAsReviewed(latestReview)}
                onSetContentDecision={(reviewState) =>
                  void setContentDecision(latestReview, reviewState)
                }
                review={latestReview}
              />
            ) : (
              <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center shadow-sm shadow-slate-100/70">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <AppIcon name="checker" className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-slate-900">
                  Your results will appear here
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Submit content to see restricted terms, preferred-word reminders,
                  approved facts, and possible absolute claims.
                </p>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface ReviewResultProps {
  review: CheckerReview;
  onIssueChange: (issue: ContentIssue) => void;
  onMarkReviewed: () => void;
  onSetContentDecision: (reviewState: CheckerReview["reviewState"]) => void;
}

function ReviewResult({
  review,
  onIssueChange,
  onMarkReviewed,
  onSetContentDecision,
}: ReviewResultProps) {
  const analysisMode = review.analysisMode ?? "rules";
  const isAiAnalysis = analysisMode === "ai";
  const acceptedCount = review.issues.filter(
    (issue) => issue.suggestionDecision === "accepted",
  ).length;
  const rejectedCount = review.issues.filter(
    (issue) => issue.suggestionDecision === "rejected",
  ).length;
  const unresolvedCount = review.issues.filter(
    (issue) => !issue.reviewed,
  ).length;

  return (
    <section
      aria-label={isAiAnalysis ? "AI analysis results" : "Rule-based analysis results"}
      className="space-y-5"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {isAiAnalysis ? "Latest AI analysis" : "Latest rule-based check"}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">
              {review.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Profile: {review.brandName}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              review.reviewState === "approved"
                ? "bg-emerald-50 text-emerald-700"
                : review.reviewState === "rejected"
                  ? "bg-rose-50 text-rose-700"
                  : review.reviewState === "reviewed"
                    ? "bg-sky-50 text-sky-700"
                    : "bg-amber-50 text-amber-800"
            }`}
          >
            {review.reviewState === "approved"
              ? "Approved"
              : review.reviewState === "rejected"
                ? "Rejected"
                : review.reviewState === "reviewed"
                  ? "Marked reviewed"
                  : "Needs human review"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div
            aria-label={`${isAiAnalysis ? "AI analysis" : "Rule-based"} compliance score ${review.complianceScore} out of 100`}
            className={`flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full border-[5px] ${
              review.complianceScore >= 80
                ? "border-emerald-200 text-emerald-700"
                : review.complianceScore >= 50
                  ? "border-amber-200 text-amber-700"
                  : "border-rose-200 text-rose-700"
            }`}
          >
            <span className="text-xl font-bold leading-none">
              {review.complianceScore}
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase">Score</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {review.summary}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isAiAnalysis
                ? "AI-generated estimate, not a guarantee or approval decision. Verify every claim and recommendation before use."
                : "Rule-based estimate from configured checks, not a guarantee or approval decision. Verify every claim before use."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            {review.issues.length} {review.issues.length === 1 ? "finding" : "findings"}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            {acceptedCount} accepted
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            {rejectedCount} rejected
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
            {unresolvedCount} unreviewed
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-950">Original content</h3>
            <p className="mt-1 text-xs text-slate-500">
              Kept exactly as submitted for reference
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {review.content.trim().split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
        <blockquote className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          {review.content}
        </blockquote>
      </div>

      {review.matchedApprovedFacts.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <AppIcon name="check" className="h-4 w-4" />
            Approved facts found in content
          </p>
          <ul className="mt-3 space-y-1.5">
            {review.matchedApprovedFacts.map((fact) => (
              <li className="text-sm text-emerald-900/80" key={fact}>
                “{fact}”
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-emerald-900/70">
            This indicates a text match with the saved profile; it does not
            independently verify the fact.
          </p>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-950">Detected issues</h3>
          <span className="text-xs text-slate-500">
            {review.issues.length} {review.issues.length === 1 ? "item" : "items"}
          </span>
        </div>
        {review.issues.length > 0 ? (
          <div className="space-y-3">
            {review.issues.map((issue) => (
              <ContentIssueCard
                issue={issue}
                key={issue.id}
                onChange={onIssueChange}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No configured rules matched. This is not a guarantee of compliance;
            a human should still review the content.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/70 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="space-y-3">
          <p className="text-xs leading-5 text-slate-500">
            {review.reviewState === "approved"
              ? "You approved this content. It has not been published."
              : review.reviewState === "rejected"
                ? "You rejected this content. It has not been published."
                : review.reviewState === "reviewed"
                  ? "You marked this check as reviewed; that is not an approval."
                  : "Marking reviewed records your review step only; it does not approve or publish content."}
          </p>
          <div className="flex flex-wrap gap-2">
            {review.reviewState !== "approved" && (
              <button
                className="button-primary shrink-0"
                onClick={() => onSetContentDecision("approved")}
                type="button"
              >
                <AppIcon name="check" className="h-4 w-4" />
                Approve content
              </button>
            )}
            {review.reviewState !== "rejected" && (
              <button
                className="button-secondary shrink-0"
                onClick={() => onSetContentDecision("rejected")}
                type="button"
              >
                Reject content
              </button>
            )}
            {review.reviewState === "approved" ||
            review.reviewState === "rejected" ? (
              <button
                className="button-secondary shrink-0"
                onClick={() => onSetContentDecision("pending")}
                type="button"
              >
                Reopen as pending
              </button>
            ) : (
              <button
                className="button-secondary shrink-0"
                onClick={onMarkReviewed}
                type="button"
              >
                <AppIcon
                  name={review.reviewState === "reviewed" ? "clock" : "check"}
                  className="h-4 w-4"
                />
                {review.reviewState === "reviewed"
                  ? "Undo reviewed"
                  : "Mark as reviewed"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
