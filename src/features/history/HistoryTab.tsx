import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Mic, Search, Star, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db, type Entry } from '../../lib/db';
import { formatDuration, formatMonth, formatShortDate } from '../../lib/dates';
import { stripMarkdown } from '../../lib/markdown';
import { EntryDetail } from './EntryDetail';

function matches(entry: Entry, q: string): boolean {
  if (!q) return true;
  if (q.startsWith('#')) {
    const tag = q.slice(1);
    return entry.tags.some((t) => t.startsWith(tag));
  }
  return entry.text.toLowerCase().includes(q) || entry.tags.some((t) => t.includes(q));
}

export function HistoryTab() {
  const [query, setQuery] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const entries = useLiveQuery(() => db.entries.orderBy('date').reverse().toArray(), []);
  // Index-only read: counts clips per entry without loading any audio blobs.
  const clipEntryIds = useLiveQuery(() => db.clips.orderBy('entryId').keys(), []);

  const clipCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const id of (clipEntryIds ?? []) as number[]) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [clipEntryIds]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { month: string; items: Entry[] }[] = [];
    for (const e of entries ?? []) {
      if (starredOnly && !e.starred) continue;
      if (!matches(e, q)) continue;
      const month = e.date.slice(0, 7);
      const last = out[out.length - 1];
      if (last?.month === month) last.items.push(e);
      else out.push({ month, items: [e] });
    }
    return out;
  }, [entries, query, starredOnly]);

  const total = entries?.length ?? 0;
  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">History</h1>

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search ideas</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text or #tag"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setStarredOnly((s) => !s)}
          aria-pressed={starredOnly}
          className={`btn px-3 ${starredOnly ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'btn-ghost'}`}
          title="Starred only"
        >
          <Star className="h-4 w-4" fill={starredOnly ? 'currentColor' : 'none'} />
          <span className="sr-only">Starred only</span>
        </button>
      </div>

      {entries === undefined ? null : total === 0 ? (
        <div className="card py-10 text-center text-sm text-stone-500">
          <div className="mb-2 text-3xl">🌱</div>
          No ideas yet. Your first 5-minute session will show up here.
        </div>
      ) : shown === 0 ? (
        <div className="py-10 text-center text-sm text-stone-500">No ideas match your filters.</div>
      ) : (
        groups.map((g) => (
          <section key={g.month} aria-label={formatMonth(g.month)}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">{formatMonth(g.month)}</h2>
            <ul className="card divide-y divide-stone-100 p-0 dark:divide-stone-800">
              {g.items.map((e) => {
                const preview = stripMarkdown(e.text);
                const clipsN = clipCounts.get(e.id!) ?? 0;
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => setOpenId(e.id!)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-stone-800/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                          <span className="font-semibold text-stone-700 dark:text-stone-200">{formatShortDate(e.date)}</span>
                          <span>· {formatDuration(e.durationSec)}</span>
                          {clipsN > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              · <Mic className="h-3 w-3" /> {clipsN}
                            </span>
                          )}
                          {e.starred && <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" aria-label="Starred" />}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-stone-800 dark:text-stone-200">
                          {preview || <span className="italic text-stone-400">Voice note only</span>}
                        </p>
                        {e.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {e.tags.map((t) => (
                              <span key={t} className="chip">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-stone-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {openId !== null && <EntryDetail entryId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
