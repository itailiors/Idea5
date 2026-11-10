import { addDays } from './dates';

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * Streaks are always derived from saved entry dates — never stored — so they
 * can't drift out of sync. The current streak stays "alive" if the most recent
 * entry is today OR yesterday (you still have today to keep it going).
 */
export function computeStreaks(dates: Iterable<string>, today: string): Streaks {
  const set = new Set(dates);
  if (set.size === 0) return { current: 0, longest: 0 };

  const yesterday = addDays(today, -1);
  const anchor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;

  let current = 0;
  if (anchor) {
    let d = anchor;
    while (set.has(d)) {
      current++;
      d = addDays(d, -1);
    }
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...set].sort()) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }

  return { current, longest: Math.max(longest, current) };
}
