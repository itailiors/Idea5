import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db, type Entry } from '../lib/db';
import { todayKey } from '../lib/dates';
import { computeStreaks, type Streaks } from '../lib/streak';

export interface Stats {
  loaded: boolean;
  entries: Entry[];
  streaks: Streaks;
  totalIdeas: number;
  totalSec: number;
  loggedToday: boolean;
}

/** Live stats derived from the entries table (re-computes whenever data changes). */
export function useStats(): Stats {
  const entries = useLiveQuery(() => db.entries.orderBy('date').toArray(), []);
  const today = todayKey();

  return useMemo(() => {
    const list = entries ?? [];
    return {
      loaded: entries !== undefined,
      entries: list,
      streaks: computeStreaks(
        list.map((e) => e.date),
        today,
      ),
      totalIdeas: list.length,
      totalSec: list.reduce((sum, e) => sum + e.durationSec, 0),
      loggedToday: list.some((e) => e.date === today),
    };
  }, [entries, today]);
}
