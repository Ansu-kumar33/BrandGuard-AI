import { AppIcon } from "../components/AppIcon";
import { PageHeader } from "../components/PageHeader";
import type { CheckerReview } from "../types/brandGuideline";

interface ReviewHistoryPageProps {
  reviews: CheckerReview[];
  onOpenReview: (id: string) => void;
}

export function ReviewHistoryPage({
  reviews,
  onOpenReview,
}: ReviewHistoryPageProps) {
  const sortedReviews = [...reviews].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );

  return (
    <>
      <PageHeader
        eyebrow="Review records"
        title="Review History"
        description="Saved content checks and reviewer activity from the backend database."
      />
      {sortedReviews.length === 0 ? (
        <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <AppIcon name="history" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            No saved reviews yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Reviews will appear here after you run a rule-based check or AI
            analysis and the backend saves the result.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/70">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_140px_130px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid">
            <span>Content title</span>
            <span>Brand / mode</span>
            <span>Score</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {sortedReviews.map((review) => (
              <li key={review.id}>
                <button
                  className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_140px_130px] md:items-center md:gap-4"
                  onClick={() => onOpenReview(review.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <AppIcon
                        name={review.analysisMode === "ai" ? "sparkles" : "checker"}
                        className="h-4 w-4"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {review.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500 md:hidden">
                        {review.brandName} · Score {review.complianceScore}
                      </span>
                    </span>
                  </span>
                  <span className="hidden truncate text-sm text-slate-600 md:block">
                    {review.brandName} ·{" "}
                    {review.analysisMode === "ai" ? "AI" : "Rule-based"}
                  </span>
                  <span className="hidden text-sm font-semibold text-slate-800 md:block">
                    {review.complianceScore}/100
                  </span>
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
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
                          ? "Reviewed"
                          : "Pending review"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(review.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
