'use client';

export type IsoTocSection = {
  clauseNumber?: string | null;
  heading: string;
  content: string;
  bullets?: string[];
  summary?: string | null;
  importantNotes?: string[] | null;
};

export function IsoStandardTocView({
  sections,
  expandedIdx,
  onToggle,
}: {
  sections: IsoTocSection[];
  expandedIdx: number | null;
  onToggle: (idx: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
          Table of contents
        </p>
        <p className="mb-2 text-xs leading-snug text-[var(--muted)]">
          Click a row to read the extracted clause text, requirements, and notes.
        </p>
        {sections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">
            No clauses were extracted for this standard.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {sections.map((sec, idx) => {
              const open = expandedIdx === idx;
              return (
                <div
                  key={`${String(sec.clauseNumber ?? '')}-${idx}-${sec.heading?.slice(0, 24) ?? ''}`}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(idx)}
                    className="flex w-full items-end gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--brand-primary)]/[0.05]"
                  >
                    <span className="shrink-0 self-center rounded-md bg-[#1565c0]/12 px-2 py-0.5 font-mono text-xs font-semibold text-[#1565c0]">
                      {sec.clauseNumber?.trim() || '-'}
                    </span>
                    <span className="min-w-0 shrink-0 pb-px text-sm font-semibold leading-snug text-[var(--text-primary)]">
                      {sec.heading}
                    </span>
                    <span
                      className="mb-1.5 min-h-[1px] flex-1 border-b border-dotted border-[var(--muted)]/45"
                      aria-hidden
                    />
                    <span className="shrink-0 self-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {open ? 'Hide' : 'View'}
                    </span>
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-[var(--border)] bg-[var(--page-bg)]/85 px-3 py-3 dark:bg-slate-950/35">
                      {sec.summary && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 dark:border-blue-800 dark:bg-blue-950/30">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
                            Summary
                          </p>
                          <p className="text-sm text-blue-900 dark:text-blue-100">{sec.summary}</p>
                        </div>
                      )}
                      {sec.content ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                          {sec.content}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No body text was extracted for this clause.</p>
                      )}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                            Requirements &amp; lists
                          </p>
                          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-primary)]">
                            {sec.bullets.map((b, j) => (
                              <li key={j}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {sec.importantNotes && sec.importantNotes.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                            Compliance &amp; audit notes
                          </p>
                          <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
                            {sec.importantNotes.map((note, j) => (
                              <li key={j} className="flex gap-2">
                                <span className="mt-1 shrink-0">●</span>
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
