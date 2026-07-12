"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Search, Download, ExternalLink } from "lucide-react";

type Result = { company: string; domain: string; source: string; confidence: string };

// 15 example companies to demo the tool.
const EXAMPLES = [
  "Maersk", "Microsoft", "Unilever", "Tata Steel", "Infosys",
  "Toyota", "Nestle", "Siemens", "Samsung Electronics", "Shell",
  "Pfizer", "Adidas", "Caterpillar", "Maruti Suzuki", "HDFC Bank",
];

const CONF_CLASS: Record<string, string> = {
  high: "bg-env/15 text-env",
  medium: "bg-warn/20 text-warn",
  low: "bg-faint/15 text-faint",
};

export function DomainTool() {
  const [input, setInput] = useState(EXAMPLES.join("\n"));
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const names = input.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  async function resolve() {
    if (!names.length) return;
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/social/resolve-domains", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names: names.slice(0, 100) }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError("Resolution failed — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInput(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function downloadCsv() {
    if (!results.length) return;
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [
      "company,domain,source,confidence",
      ...results.map((r) => [r.company, r.domain, r.source, r.confidence].map(esc).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "company-domains.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const found = results.filter((r) => r.domain).length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Input */}
      <div className="lg:col-span-1">
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Company names</h2>
            <span className="text-xs text-faint">{names.length} {names.length === 1 ? "name" : "names"}</span>
          </div>
          <p className="mb-2 text-[11px] text-faint">One company per line. Pre-filled with 15 examples — edit, paste your own, or upload a .txt.</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="input min-h-[280px] font-mono text-xs"
          />
          <input ref={fileRef} type="file" accept=".txt,text/plain" onChange={onFile} className="hidden" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={resolve} disabled={loading || !names.length} className="btn-primary">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? "Resolving…" : "Resolve domains"}
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload size={15} /> Upload .txt</button>
            <button onClick={() => setInput(EXAMPLES.join("\n"))} className="btn-ghost text-sm">Load examples</button>
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-2">
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">
              Results {results.length > 0 && <span className="text-sm font-normal text-faint">· {found}/{results.length} resolved</span>}
            </h2>
            <button onClick={downloadCsv} disabled={!results.length} className="btn-ghost text-sm disabled:opacity-40">
              <Download size={14} /> Export CSV
            </button>
          </div>

          {loading && results.length === 0 && (
            <div className="flex items-center gap-2 py-10 text-sm text-faint">
              <Loader2 size={16} className="animate-spin" /> Resolving {names.length} companies (Clearbit → DuckDuckGo → Bing)…
            </div>
          )}

          {!loading && results.length === 0 && (
            <p className="py-10 text-center text-sm text-faint">Enter company names and press “Resolve domains”.</p>
          )}

          {results.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] border-collapse">
                <thead className="bg-row">
                  <tr>
                    <th className="th">Company</th>
                    <th className="th">Domain</th>
                    <th className="th">Source</th>
                    <th className="th">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td className="td text-ink">{r.company}</td>
                      <td className="td">
                        {r.domain ? (
                          <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-social hover:underline">
                            {r.domain} <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-faint">not found</span>
                        )}
                      </td>
                      <td className="td">{r.source || "—"}</td>
                      <td className="td">
                        {r.confidence ? (
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${CONF_CLASS[r.confidence] ?? "bg-faint/15 text-faint"}`}>
                            {r.confidence}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
