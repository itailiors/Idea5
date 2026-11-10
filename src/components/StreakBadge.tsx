import { Lightbulb } from 'lucide-react';
import { useStats } from '../hooks/useStats';

export function StreakBadge() {
  const { streaks, totalIdeas, loggedToday } = useStats();
  const day = streaks.current === 1 ? 'day' : 'days';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
          streaks.current > 0
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
        }`}
        title={loggedToday ? 'Logged today' : streaks.current > 0 ? 'Log an idea today to keep your streak!' : 'Start a streak today'}
      >
        <span className={streaks.current > 0 && !loggedToday ? 'opacity-60' : ''} aria-hidden>
          🔥
        </span>
        {streaks.current} {day}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2.5 py-1 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden />
        {totalIdeas}
        <span className="sr-only"> ideas</span>
      </span>
    </div>
  );
}
