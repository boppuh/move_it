interface AnalysisSummaryProps {
  verdict: string;
  strengths: string[];
  weaknesses: string[];
}

export function AnalysisSummary({ verdict, strengths, weaknesses }: AnalysisSummaryProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Verdict */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          AI Verdict
        </h3>
        <p className="text-base leading-relaxed text-zinc-800 dark:text-zinc-200">{verdict}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="rounded-2xl border border-green-100 bg-green-50 p-5 dark:border-green-900/30 dark:bg-green-950/20">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
              <span>✓</span> Strengths
            </h3>
            <ul className="flex flex-col gap-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                  <span className="mt-0.5 shrink-0 text-green-500">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-950/20">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
              <span>✗</span> Watch Out For
            </h3>
            <ul className="flex flex-col gap-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                  <span className="mt-0.5 shrink-0 text-red-400">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
