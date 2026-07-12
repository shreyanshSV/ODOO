"use client";

import { useState } from "react";
import { Sparkles, ArrowLeft, ArrowRight, Check, X, Plus, Loader2 } from "lucide-react";
import { createCompanyWorkspace } from "./actions";

type Data = {
  name: string;
  domain: string;
  website: string;
  logoUrl: string;
  industry: string;
  headquarters: string;
  description: string;
  departments: string[];
  csrCategories: string[];
  goals: string[];
  sources: string[];
  discovered: boolean;
};

const EMPTY: Data = {
  name: "", domain: "", website: "", logoUrl: "", industry: "", headquarters: "", description: "",
  departments: [], csrCategories: [], goals: [], sources: [], discovered: false,
};

const MANUAL_DEFAULTS = {
  departments: ["Operations", "Sales", "Marketing", "Human Resources", "Finance"],
  csrCategories: ["Environment", "Community", "Education"],
  goals: ["Achieve carbon neutrality by 2040", "Log 5,000 employee volunteer hours per year"],
};

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Data>(EMPTY);

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setData((d) => ({ ...d, [k]: v }));

  async function analyze() {
    if (!data.name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/social/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.name.trim(), domain: data.domain.trim() || undefined }),
      });
      if (res.status === 403) {
        setError("You don't have permission to create companies.");
        return;
      }
      const r = await res.json();
      if (r.error) {
        setError("Discovery failed — you can still enter the details manually.");
        return;
      }
      setData((d) => ({
        ...d,
        domain: r.domain ?? "",
        website: r.website ?? "",
        logoUrl: r.logoUrl ?? "",
        industry: r.industry ?? "",
        headquarters: r.headquarters ?? "",
        description: r.description ?? "",
        departments: r.departments ?? [],
        csrCategories: r.csrCategories ?? [],
        goals: r.goals ?? [],
        sources: r.sources ?? [],
        discovered: !!r.discovered,
      }));
      setStep(2);
    } catch {
      setError("Could not reach the enrichment service — enter the details manually.");
    } finally {
      setLoading(false);
    }
  }

  function manual() {
    setData((d) => ({ ...d, ...MANUAL_DEFAULTS, discovered: false }));
    setStep(2);
  }

  return (
    <div className="max-w-3xl">
      <Stepper step={step} />

      {step === 1 && (
        <div className="panel p-5">
          <h2 className="mb-1 font-display text-base font-semibold text-ink">Discover a company</h2>
          <p className="mb-4 text-xs text-faint">
            Enter a company name and we&apos;ll find its official site, logo, industry and public ESG/CSR pages.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Company name</label>
              <input
                className="input"
                value={data.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Unilever"
                onKeyDown={(e) => e.key === "Enter" && analyze()}
              />
            </div>
            <div>
              <label className="label">Domain (optional)</label>
              <input
                className="input"
                value={data.domain}
                onChange={(e) => set("domain", e.target.value)}
                placeholder="unilever.com"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
          <div className="mt-4 flex items-center gap-2">
            <button onClick={analyze} disabled={loading || !data.name.trim()} className="btn-primary">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? "Analyzing…" : "Analyze company"}
            </button>
            <button onClick={manual} className="btn-ghost">Enter manually</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="mb-4 flex items-center gap-3">
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} alt="" className="h-12 w-12 rounded-lg border border-border bg-white object-contain p-1" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-panel2 text-lg text-faint">
                  {data.name.slice(0, 1).toUpperCase() || "?"}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-ink">{data.name || "New company"}</div>
                <div className="text-xs text-faint">
                  {data.discovered ? "Auto-discovered — review & edit below" : "Manual entry"}
                  {data.sources.length > 0 && ` · read: ${data.sources.slice(0, 4).join(", ")}`}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company name" value={data.name} onChange={(v) => set("name", v)} />
              <Field label="Industry" value={data.industry} onChange={(v) => set("industry", v)} />
              <Field label="Domain" value={data.domain} onChange={(v) => set("domain", v)} />
              <Field label="Website" value={data.website} onChange={(v) => set("website", v)} />
              <Field label="Headquarters" value={data.headquarters} onChange={(v) => set("headquarters", v)} placeholder="City, Country" />
              <Field label="Logo URL" value={data.logoUrl} onChange={(v) => set("logoUrl", v)} />
            </div>
            <div className="mt-3">
              <label className="label">Description</label>
              <textarea className="input min-h-[70px]" value={data.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <EditableList label="Departments" items={data.departments} onChange={(v) => set("departments", v)} />
            <EditableList label="CSR categories" items={data.csrCategories} onChange={(v) => set("csrCategories", v)} />
            <EditableList label="Sustainability goals" items={data.goals} onChange={(v) => set("goals", v)} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setStep(1)} className="btn-ghost"><ArrowLeft size={15} /> Back</button>
            <button onClick={() => setStep(3)} disabled={!data.name.trim()} className="btn-primary">Review <ArrowRight size={15} /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Create workspace</h2>
          <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <Summary k="Company" v={data.name} />
            <Summary k="Industry" v={data.industry || "—"} />
            <Summary k="Website" v={data.website || "—"} />
            <Summary k="HQ" v={data.headquarters || "—"} />
            <Summary k="Departments" v={`${data.departments.length}`} />
            <Summary k="CSR categories" v={`${data.csrCategories.length}`} />
            <Summary k="Goals" v={`${data.goals.length}`} />
          </dl>
          <p className="mb-4 text-xs text-faint">
            This creates the company and its {data.departments.length} departments, and stores the CSR categories & goals for the workspace.
          </p>
          <form action={createCompanyWorkspace} className="flex items-center gap-2">
            <input type="hidden" name="name" value={data.name} />
            <input type="hidden" name="domain" value={data.domain} />
            <input type="hidden" name="website" value={data.website} />
            <input type="hidden" name="logoUrl" value={data.logoUrl} />
            <input type="hidden" name="industry" value={data.industry} />
            <input type="hidden" name="headquarters" value={data.headquarters} />
            <input type="hidden" name="description" value={data.description} />
            <input type="hidden" name="departments" value={JSON.stringify(data.departments)} />
            <input type="hidden" name="csrCategories" value={JSON.stringify(data.csrCategories)} />
            <input type="hidden" name="goals" value={JSON.stringify(data.goals)} />
            <button type="button" onClick={() => setStep(2)} className="btn-ghost"><ArrowLeft size={15} /> Back</button>
            <button className="btn-primary"><Check size={15} /> Create workspace</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Discover", "Review", "Create"];
  return (
    <div className="mb-4 flex items-center gap-2 text-xs">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${active ? "bg-social text-bg" : done ? "bg-env text-bg" : "bg-panel2 text-faint"}`}>
              {done ? "✓" : n}
            </span>
            <span className={active ? "text-ink" : "text-faint"}>{label}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-1">
      <dt className="text-faint">{k}</dt>
      <dd className="truncate text-ink">{v}</dd>
    </div>
  );
}

function EditableList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft("");
  };
  return (
    <div className="panel p-4">
      <div className="mb-2 text-sm font-semibold text-ink">{label}</div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className="flex items-center gap-1 rounded-md bg-panel2 px-2 py-0.5 text-xs text-muted">
            {it}
            <button onClick={() => onChange(items.filter((x) => x !== it))} className="text-faint hover:text-danger" aria-label={`Remove ${it}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-faint">None yet.</span>}
      </div>
      <div className="flex gap-1.5">
        <input
          className="input text-xs"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add…"
        />
        <button onClick={add} className="btn-ghost shrink-0 px-2"><Plus size={14} /></button>
      </div>
    </div>
  );
}
