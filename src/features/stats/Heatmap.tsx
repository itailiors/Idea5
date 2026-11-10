import { useEffect, useMemo, useRef } from 'react';
import type { Entry } from '../../lib/db';
import { addDays, formatDuration, formatShortDate, fromDateKey } from '../../lib/dates';

const WEEKS = 53;
const LEVELS = [
  'bg-stone-200 dark:bg-stone-800',
  'bg-amber-200 dark:bg-amber-900',
  'bg-amber-300 dark:bg-amber-700',
  'bg-amber-500 dark:bg-amber-500',
  'bg-amber-700 dark:bg-amber-300',
];

/** Intensity by minutes spent (an audio-only entry with 0s still counts as level 1). */
function level(sec: number): number {
  const min = sec / 60;
  if (min < 3) return 1;
  if (min < 5) return 2;
  if (min < 10) return 3;
  return 4;
}

/** Feature D — GitHub-style year grid, using local calendar dates. */
export function Heatmap({ entries, today }: { entries: Entry[]; today: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { weeks, months } = useMemo(() => {
    const byDate = new Map(entries.map((e) => [e.date, e]));
    const todayDate = fromDateKey(today);
    // Start on the Sunday WEEKS-1 weeks before this week's Sunday.
    const start = addDays(today, -todayDate.getDay() - (WEEKS - 1) * 7);
    const weeks: { key: string; entry?: Entry; future: boolean }[][] = [];
    const months: { col: number; label: string }[] = [];
    let d = start;
    for (let w = 0; w < WEEKS; w++) {
      const col: { key: string; entry?: Entry; future: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        col.push({ key: d, entry: byDate.get(d), future: d > today });
        d = addDays(d, 1);
      }
      const first = fromDateKey(col[0].key);
      const prevMonth = w > 0 ? fromDateKey(weeks[w - 1][0].key).getMonth() : -1;
      if (first.getMonth() !== prevMonth) {
        months.push({ col: w, label: first.toLocaleDateString(undefined, { month: 'short' }) });
      }
      weeks.push(col);
    }
    return { weeks, months };
  }, [entries, today]);

  // Show the most recent weeks first on narrow screens.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="relative mb-1 ml-7 h-4 text-[10px] text-stone-400">
            {months.map((m) => (
              <span key={`${m.col}-${m.label}`} className="absolute" style={{ left: m.col * 14 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="mr-1 flex w-6 flex-col gap-[3px] text-[10px] leading-[11px] text-stone-400">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
                <span key={i} className="h-[11px]">
                  {l}
                </span>
              ))}
            </div>
            {weeks.map((col) => (
              <div key={col[0].key} className="flex flex-col gap-[3px]">
                {col.map((c) => (
                  <div
                    key={c.key}
                    className={`h-[11px] w-[11px] rounded-[3px] ${
                      c.future ? 'opacity-0' : LEVELS[c.entry ? level(c.entry.durationSec) : 0]
                    } ${c.key === today ? 'ring-1 ring-stone-500 dark:ring-stone-300' : ''}`}
                    title={
                      c.future
                        ? undefined
                        : `${formatShortDate(c.key)}: ${c.entry ? `idea logged · ${formatDuration(c.entry.durationSec)}` : 'no idea'}`
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-stone-400">
        Less
        {LEVELS.map((cls, i) => (
          <span key={i} className={`h-[10px] w-[10px] rounded-[2px] ${cls}`} />
        ))}
        More
      </div>
    </div>
  );
}
