import { AppIcon } from "../components/AppIcon";
import { PageHeader } from "../components/PageHeader";

interface ComingSoonPageProps {
  page: "checker" | "history";
}

const pageContent = {
  checker: {
    eyebrow: "Content review",
    title: "Content Checker",
    description:
      "Review marketing content against a selected brand profile with a human reviewer in control.",
    label: "Coming in Stage 3",
    detail:
      "The content submission and review workflow is not available yet. No analysis is being run in this stage.",
    icon: "checker" as const,
  },
  history: {
    eyebrow: "Review records",
    title: "Review History",
    description:
      "Open past content reviews and see the decisions made by your team.",
    label: "Coming in Stage 6",
    detail:
      "Review history will be available after the review workflow and persistence are implemented. No sample review records are shown.",
    icon: "history" as const,
  },
};

export function ComingSoonPage({ page }: ComingSoonPageProps) {
  const content = pageContent[page];

  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
      />
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center shadow-sm shadow-slate-100/70">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <AppIcon name={content.icon} className="h-7 w-7" />
        </span>
        <span className="mt-5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {content.label}
        </span>
        <h2 className="mt-3 text-lg font-semibold text-slate-950">
          This workspace is not available yet
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          {content.detail}
        </p>
      </section>
    </>
  );
}
