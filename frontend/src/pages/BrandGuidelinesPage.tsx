import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import type { BrandGuideline } from "../types/brandGuideline";

interface BrandGuidelinesPageProps {
  guidelines: BrandGuideline[];
  selectedGuidelineId: string;
  onSelectGuideline: (id: string) => void;
  onSave: (guideline: BrandGuideline) => Promise<BrandGuideline>;
}

interface GuidelineFormValues {
  brandName: string;
  preferredTone: string;
  targetAudience: string;
  preferredWords: string;
  restrictedWords: string;
  approvedFacts: string;
  additionalInstructions: string;
}

type GuidelineField = keyof GuidelineFormValues;

const emptyValues: GuidelineFormValues = {
  brandName: "",
  preferredTone: "",
  targetAudience: "",
  preferredWords: "",
  restrictedWords: "",
  approvedFacts: "",
  additionalInstructions: "",
};

const sampleProfile: GuidelineFormValues = {
  brandName: "BrandGuard Demo",
  preferredTone: "Friendly and professional",
  targetAudience: "Customers",
  preferredWords: "Customer\nhelpful\nreliable",
  restrictedWords: "Cheapest\nguaranteed",
  approvedFacts: "Serving customers since 2015",
  additionalInstructions: "",
};

const requiredFields: GuidelineField[] = [
  "brandName",
  "preferredTone",
  "targetAudience",
];

export function BrandGuidelinesPage({
  guidelines,
  selectedGuidelineId,
  onSelectGuideline,
  onSave,
}: BrandGuidelinesPageProps) {
  const [mode, setMode] = useState<"view" | "create" | "edit">(
    guidelines.length === 0 ? "create" : "view",
  );
  const [values, setValues] = useState<GuidelineFormValues>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<GuidelineField, string>>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">(
    "success",
  );
  const [saving, setSaving] = useState(false);

  const selectedGuideline = guidelines.find(
    (guideline) => guideline.id === selectedGuidelineId,
  );
  const isEditing = mode === "edit";
  const isFormOpen = mode === "create" || mode === "edit";

  function beginCreate() {
    setValues(emptyValues);
    setErrors({});
    setMessage("");
    setMode("create");
  }

  function beginEdit() {
    if (!selectedGuideline) {
      return;
    }

    setValues(toFormValues(selectedGuideline));
    setErrors({});
    setMessage("");
    setMode("edit");
  }

  function handleSelect(id: string) {
    onSelectGuideline(id);
    setMessage("");
    setMode("view");
  }

  function updateField(field: GuidelineField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  }

  function loadSampleProfile() {
    setValues(sampleProfile);
    setErrors({});
    setMessage(
      "Sample profile loaded into the form. Review it and save to add it to your profiles.",
    );
    setMessageKind("success");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<GuidelineField, string>> = {};
    for (const field of requiredFields) {
      if (!values[field].trim()) {
        nextErrors[field] = "This field is required.";
      }
    }
    setErrors(nextErrors);
    setMessage("");

    if (Object.keys(nextErrors).length > 0) {
      setMessageKind("error");
      setMessage("Complete the required fields before saving.");
      return;
    }

    const now = new Date().toISOString();
    const guideline: BrandGuideline = {
      id: isEditing && selectedGuideline ? selectedGuideline.id : createId(),
      brandName: values.brandName.trim(),
      preferredTone: values.preferredTone.trim(),
      targetAudience: values.targetAudience.trim(),
      preferredWords: parseList(values.preferredWords),
      restrictedWords: parseList(values.restrictedWords),
      approvedFacts: parseList(values.approvedFacts),
      additionalInstructions: values.additionalInstructions.trim(),
      createdAt: isEditing && selectedGuideline ? selectedGuideline.createdAt : now,
      updatedAt: now,
    };

    setSaving(true);
    try {
      await onSave(guideline);
      setMessageKind("success");
      setMessage(`${guideline.brandName} guidelines saved to the backend.`);
      setMode("view");
    } catch (error) {
      setMessageKind("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save this brand profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelForm() {
    setMessage("");
    setErrors({});
    setMode(selectedGuideline ? "view" : "create");
  }

  return (
    <>
      <PageHeader
        eyebrow="Brand setup"
        title="Brand Guidelines"
        description="Define each brand's voice, terminology, and approved facts. Profiles are saved by the FastAPI backend."
        action={
          <button
            className="button-primary"
            onClick={beginCreate}
            type="button"
          >
            <AppIcon name="plus" className="h-4 w-4" />
            Add brand profile
          </button>
        }
      />

      {message && <StatusMessage kind={messageKind}>{message}</StatusMessage>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-950">Saved profiles</h2>
              <p className="mt-1 text-sm text-slate-500">
                {guidelines.length === 1
                  ? "1 saved brand profile"
                  : `${guidelines.length} saved brand profiles`}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {guidelines.length}
            </span>
          </div>

          {guidelines.length > 0 ? (
            <div className="mt-5 space-y-2">
              {guidelines.map((guideline) => {
                const isSelected = guideline.id === selectedGuidelineId;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-indigo-200 bg-indigo-50/70"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    key={guideline.id}
                    onClick={() => handleSelect(guideline.id)}
                    type="button"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <AppIcon name="book" className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {guideline.brandName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {guideline.preferredTone}
                      </span>
                    </span>
                    {isSelected && (
                      <AppIcon
                        name="check"
                        className="h-4 w-4 shrink-0 text-indigo-700"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-800">
                No saved profiles yet
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Add a profile or load the clearly labeled sample to get started.
              </p>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <AppIcon name="sparkles" className="h-4 w-4" />
              SQLite persistence
            </p>
            <p className="mt-2 text-xs leading-5 text-indigo-900/70">
              Profiles are saved through FastAPI in the local SQLite database.
              If the backend is unavailable, the page reports an error instead
              of pretending the profile was saved.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70 sm:p-6">
          {isFormOpen ? (
            <GuidelineForm
              errors={errors}
              isEditing={isEditing}
              onCancel={cancelForm}
              onChange={updateField}
              onLoadSample={loadSampleProfile}
              onSubmit={handleSubmit}
              saving={saving}
              values={values}
            />
          ) : selectedGuideline ? (
            <GuidelineDetails
              guideline={selectedGuideline}
              onEdit={beginEdit}
            />
          ) : (
            <GuidelineForm
              errors={errors}
              isEditing={false}
              onCancel={cancelForm}
              onChange={updateField}
              onLoadSample={loadSampleProfile}
              onSubmit={handleSubmit}
              saving={saving}
              values={values}
            />
          )}
        </section>
      </div>
    </>
  );
}

interface GuidelineFormProps {
  values: GuidelineFormValues;
  errors: Partial<Record<GuidelineField, string>>;
  isEditing: boolean;
  saving: boolean;
  onChange: (field: GuidelineField, value: string) => void;
  onLoadSample: () => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function GuidelineForm({
  values,
  errors,
  isEditing,
  saving,
  onChange,
  onLoadSample,
  onCancel,
  onSubmit,
}: GuidelineFormProps) {
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">
            {isEditing ? "Edit guidelines" : "Create brand profile"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Required fields are marked with an asterisk.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          onClick={onLoadSample}
          type="button"
        >
          <AppIcon name="sparkles" className="h-3.5 w-3.5" />
          Load sample profile
        </button>
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold text-amber-900">Sample data option</p>
        <p className="mt-1 text-xs leading-5 text-amber-900/75">
          BrandGuard Demo is example content, not a real company profile. Load
          it to populate the form, then save it yourself.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={errors.brandName}
            id="brand-name"
            label="Brand name"
            onChange={(value) => onChange("brandName", value)}
            placeholder="e.g. Northstar Studio"
            required
            value={values.brandName}
          />
          <TextField
            error={errors.preferredTone}
            id="preferred-tone"
            label="Preferred tone"
            onChange={(value) => onChange("preferredTone", value)}
            placeholder="e.g. Warm and clear"
            required
            value={values.preferredTone}
          />
        </div>
        <TextField
          error={errors.targetAudience}
          id="target-audience"
          label="Target audience"
          onChange={(value) => onChange("targetAudience", value)}
          placeholder="e.g. Small business owners"
          required
          value={values.targetAudience}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextAreaField
            id="preferred-words"
            label="Preferred words"
            onChange={(value) => onChange("preferredWords", value)}
            placeholder={"One per line or separated by commas\ne.g. Customer"}
            value={values.preferredWords}
          />
          <TextAreaField
            id="restricted-words"
            label="Restricted words"
            onChange={(value) => onChange("restrictedWords", value)}
            placeholder={"One per line or separated by commas\ne.g. Cheapest"}
            value={values.restrictedWords}
          />
        </div>
        <TextAreaField
          id="approved-facts"
          label="Approved brand facts"
          onChange={(value) => onChange("approvedFacts", value)}
          placeholder={"Add facts the team has approved, one per line"}
          value={values.approvedFacts}
        />
        <TextAreaField
          id="additional-instructions"
          label="Additional instructions"
          onChange={(value) => onChange("additionalInstructions", value)}
          placeholder="Any other guidance the reviewer should keep in mind"
          value={values.additionalInstructions}
        />
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          {(isEditing || values.brandName || values.preferredTone) && (
            <button
              className="button-secondary"
              disabled={saving}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          )}
          <button className="button-primary" disabled={saving} type="submit">
            {saving ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <AppIcon name="check" className="h-4 w-4" />
                {isEditing ? "Save changes" : "Save guidelines"}
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}

function TextField({
  id,
  label,
  value,
  placeholder,
  required = false,
  error,
  onChange,
}: TextFieldProps) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={`form-control ${error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
      {error && (
        <p className="mt-1.5 text-xs text-rose-700" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function TextAreaField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="form-control min-h-[100px] resize-y"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <p className="mt-1.5 text-[11px] text-slate-400">
        Separate entries with commas or new lines.
      </p>
    </div>
  );
}

interface GuidelineDetailsProps {
  guideline: BrandGuideline;
  onEdit: () => void;
}

function GuidelineDetails({ guideline, onEdit }: GuidelineDetailsProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <AppIcon name="book" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected brand profile
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {guideline.brandName}
            </h2>
          </div>
        </div>
        <button
          className="button-secondary self-start"
          onClick={onEdit}
          type="button"
        >
          <AppIcon name="edit" className="h-4 w-4" />
          Edit profile
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <DetailItem
          icon="message"
          label="Preferred tone"
          value={guideline.preferredTone}
        />
        <DetailItem
          icon="users"
          label="Target audience"
          value={guideline.targetAudience}
        />
      </div>

      <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
        <WordList
          icon="check"
          label="Preferred words"
          tone="green"
          values={guideline.preferredWords}
        />
        <WordList
          icon="alert"
          label="Restricted words"
          tone="rose"
          values={guideline.restrictedWords}
        />
        <WordList
          icon="shield"
          label="Approved brand facts"
          tone="indigo"
          values={guideline.approvedFacts}
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Additional instructions
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {guideline.additionalInstructions || "No additional instructions."}
          </p>
        </div>
      </div>
      <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
        Last updated {new Date(guideline.updatedAt).toLocaleString()}
      </p>
    </>
  );
}

interface DetailItemProps {
  icon: "message" | "users";
  label: string;
  value: string;
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <AppIcon name={icon} className="h-4 w-4 text-slate-400" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

interface WordListProps {
  icon: "check" | "alert" | "shield";
  label: string;
  tone: "green" | "rose" | "indigo";
  values: string[];
}

function WordList({ icon, label, tone, values }: WordListProps) {
  const colors = {
    green: "bg-emerald-50 text-emerald-800",
    rose: "bg-rose-50 text-rose-800",
    indigo: "bg-indigo-50 text-indigo-800",
  };
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <AppIcon name={icon} className="h-4 w-4" />
        {label}
      </p>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${colors[tone]}`}
              key={value}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">None added.</p>
      )}
    </div>
  );
}

function toFormValues(guideline: BrandGuideline): GuidelineFormValues {
  return {
    brandName: guideline.brandName,
    preferredTone: guideline.preferredTone,
    targetAudience: guideline.targetAudience,
    preferredWords: guideline.preferredWords.join("\n"),
    restrictedWords: guideline.restrictedWords.join("\n"),
    approvedFacts: guideline.approvedFacts.join("\n"),
    additionalInstructions: guideline.additionalInstructions,
  };
}

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `brand-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
