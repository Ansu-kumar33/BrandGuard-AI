import { AppIcon, type IconName } from "../components/AppIcon";
import { PageHeader } from "../components/PageHeader";
import type {
  AppPage,
  BrandGuideline,
  CheckerReview,
} from "../types/brandGuideline";

interface DashboardPageProps {
  guidelines: BrandGuideline[];
  reviews: CheckerReview[];
  selectedGuidelineId: string;
  onSelectGuideline: (id: string) => void;
  onNavigate: (page: AppPage) => void;
  onOpenReview: (id: string) => void;
}

const metricCards: {
  label: string;
  icon: IconName;
  tone: string;
}[] = [
  {
    label: "Total reviews",
    icon: "checker",
    tone: "bg-indigo-50 text-indigo-700",
  },
  {
    label: "Issues detected",
    icon: "alert",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    label: "Approved content",
    icon: "check",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Pending reviews",
    icon: "clock",
    tone: "bg-sky-50 text-sky-700",
  },
];

export function DashboardPage({
  guidelines,
  reviews,
  selectedGuidelineId,
  onSelectGuideline,
  onNavigate,
  onOpenReview,
}: DashboardPageProps) {
  const metrics = {
    totalReviews: reviews.length,
    issues: reviews.reduce((total, review) => total + review.issues.length, 0),
    approved: reviews.filter((review) => review.reviewState === "approved").length,
    pending: reviews.filter((review) => review.reviewState === "pending").length,
  };
  const recentReviews = [...reviews]
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    )
    .slice(0, 5);
  const metricValues = [
    metrics.totalReviews,
    metrics.issues,
    metrics.approved,
    metrics.pending,
  ];
  const metricNotes = [
    metrics.totalReviews === 0
      ? "No content reviews yet"
      : "Saved checks",
    metrics.issues === 0
      ? "No configured rules matched"
      : "Findings across saved checks",
    "Approved by a human reviewer",
    metrics.pending === 0
      ? "No pending review checks"
      : "Waiting for a human review",
  ];
  const selectedGuideline = guidelines.find(
    (guideline) => guideline.id === selectedGuidelineId,
  );

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Good morning"
        description="A clear view of your brand review workspace. Your team always makes the final call."
      />

      <section
        aria-label="Review metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metricCards.map((metric, index) => (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70"
            key={metric.label}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <span className={`rounded-lg p-2 ${metric.tone}`}>
                <AppIcon name={metric.icon} className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              {metricValues[index]}
            </p>
            <p className="mt-1 text-xs text-slate-500">{metricNotes[index]}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-950">Recent activity</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest content reviews from your workspace
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </div>
          {recentReviews.length > 0 ? (
            <ul className="mt-5 divide-y divide-slate-100">
              {recentReviews.map((review) => (
                <li
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={review.id}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg text-left hover:text-indigo-700"
                    onClick={() => onOpenReview(review.id)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {review.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {review.brandName} · {review.issues.length}{" "}
                        {review.issues.length === 1 ? "finding" : "findings"} ·{" "}
                        {review.analysisMode === "ai" ? "AI" : "Rule-based"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
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
                  </button>
                </li>
              ))}
            </ul>
          ) : (
          <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <AppIcon name="history" className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-800">
              No review activity yet
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Once content is reviewed, the real review history will show up
              here. Nothing has been added as sample activity.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
              onClick={() => onNavigate("checker")}
              type="button"
            >
              Go to Content Checker <AppIcon name="arrow" className="h-4 w-4" />
            </button>
          </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Active brand profile
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Choose which brand guidelines to work with.
            </p>
          </div>
          {guidelines.length > 0 ? (
            <>
              <label className="sr-only" htmlFor="active-brand">
                Select active brand profile
              </label>
              <select
                className="form-control mt-5"
                id="active-brand"
                onChange={(event) => onSelectGuideline(event.target.value)}
                value={selectedGuidelineId}
              >
                {guidelines.map((guideline) => (
                  <option key={guideline.id} value={guideline.id}>
                    {guideline.brandName}
                  </option>
                ))}
              </select>
              {selectedGuideline && (
                <div className="mt-4 rounded-xl bg-indigo-50/70 p-4">
                  <p className="text-sm font-semibold text-indigo-950">
                    {selectedGuideline.brandName}
                  </p>
                  <p className="mt-1 text-sm text-indigo-900/70">
                    {selectedGuideline.preferredTone} tone
                  </p>
                  <p className="mt-3 text-xs leading-5 text-indigo-900/70">
                    Audience: {selectedGuideline.targetAudience}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">
                No brand profiles saved
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Add your first brand profile to set up its voice and approved
                facts.
              </p>
            </div>
          )}
          <button
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => onNavigate("guidelines")}
            type="button"
          >
            <AppIcon name="guidelines" className="h-4 w-4" />
            {guidelines.length > 0 ? "Manage guidelines" : "Create a brand profile"}
          </button>
        </section>
      </div>
    </>
  );
}
