import { useState } from "react";
import { AppIcon } from "./AppIcon";
import type { ContentIssue } from "../types/brandGuideline";

interface ContentIssueCardProps {
  issue: ContentIssue;
  onChange: (issue: ContentIssue) => void;
}

const severityStyles = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function ContentIssueCard({
  issue,
  onChange,
}: ContentIssueCardProps) {
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(
    issue.finalText ?? issue.suggestedCorrection,
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          {issue.category}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${severityStyles[issue.severity]}`}
        >
          {issue.severity} severity
        </span>
        {issue.requiresHumanVerification && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            <AppIcon name="alert" className="h-3.5 w-3.5" />
            Verify with a human
          </span>
        )}
        {issue.reviewed && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <AppIcon name="check" className="h-3.5 w-3.5" />
            Reviewed
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Matching text
        </p>
        <blockquote className="mt-1 border-l-2 border-rose-300 pl-3 text-sm font-medium leading-6 text-slate-800">
          “{issue.exactText}”
        </blockquote>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {issue.explanation}
      </p>

      <div className="mt-4 rounded-lg bg-indigo-50/70 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
          {issue.suggestionDecision === "edited"
            ? "Reviewer-edited correction"
            : "Suggested correction"}
        </p>
        <p className="mt-1 text-sm leading-6 text-indigo-950">
          {issue.finalText ?? issue.suggestedCorrection}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          aria-expanded={editing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          onClick={() => {
            setEditedText(issue.finalText ?? issue.suggestedCorrection);
            setEditing((current) => !current);
          }}
          type="button"
        >
          <AppIcon name="edit" className="h-3.5 w-3.5" />
          {editing ? "Cancel edit" : "Edit suggestion"}
        </button>
        <button
          aria-pressed={issue.suggestionDecision === "accepted"}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            issue.suggestionDecision === "accepted"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          onClick={() =>
            onChange({
              ...issue,
              suggestionDecision:
                issue.suggestionDecision === "accepted" ? "pending" : "accepted",
            })
          }
          type="button"
        >
          <AppIcon name="check" className="h-3.5 w-3.5" />
          {issue.suggestionDecision === "accepted"
            ? "Suggestion accepted"
            : "Accept suggestion"}
        </button>
        <button
          aria-pressed={issue.suggestionDecision === "rejected"}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            issue.suggestionDecision === "rejected"
              ? "border-slate-300 bg-slate-100 text-slate-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          onClick={() =>
            onChange({
              ...issue,
              suggestionDecision:
                issue.suggestionDecision === "rejected" ? "pending" : "rejected",
            })
          }
          type="button"
        >
          {issue.suggestionDecision === "rejected"
            ? "Suggestion rejected"
            : "Reject suggestion"}
        </button>
        <button
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          onClick={() => onChange({ ...issue, reviewed: !issue.reviewed })}
          type="button"
        >
          {issue.reviewed ? "Undo reviewed" : "Mark as reviewed"}
        </button>
      </div>
      {editing && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label
            className="form-label"
            htmlFor={`suggestion-${issue.id}`}
          >
            Your suggested correction
          </label>
          <textarea
            className="form-control min-h-20"
            id={`suggestion-${issue.id}`}
            onChange={(event) => setEditedText(event.target.value)}
            value={editedText}
          />
          <button
            className="button-primary mt-3"
            disabled={!editedText.trim()}
            onClick={() => {
              onChange({
                ...issue,
                suggestionDecision: "edited",
                finalText: editedText.trim(),
              });
              setEditing(false);
            }}
            type="button"
          >
            Save edited suggestion
          </button>
        </div>
      )}
    </article>
  );
}
