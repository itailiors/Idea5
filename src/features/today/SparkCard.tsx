import { Shuffle, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SPARK_PROMPTS, promptIndexForDate, randomPromptIndex } from '../../lib/prompts';
import { readPref, writePref } from '../../lib/browser';

const HIDDEN_KEY = 'idea5.sparkHiddenOn';

/** Feature A — a creative nudge so the page is never blank. Dismissed for the rest of the day. */
export function SparkCard({ date }: { date: string }) {
  const [index, setIndex] = useState(() => promptIndexForDate(date));
  const [hidden, setHidden] = useState(() => readPref(HIDDEN_KEY) === date);

  useEffect(() => {
    setIndex(promptIndexForDate(date));
    setHidden(readPref(HIDDEN_KEY) === date);
  }, [date]);

  const hide = () => {
    writePref(HIDDEN_KEY, date);
    setHidden(true);
  };
  const show = () => {
    writePref(HIDDEN_KEY, null);
    setHidden(false);
  };

  if (hidden) {
    return (
      <button type="button" onClick={show} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-600 dark:text-stone-400">
        <Sparkles className="h-4 w-4" /> Show today's spark
      </button>
    );
  }

  return (
    <section className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 p-4 dark:from-amber-950/60 dark:to-stone-900">
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Spark</div>
        <p className="mt-0.5 text-[15px] font-medium leading-snug text-stone-800 dark:text-stone-100">{SPARK_PROMPTS[index]}</p>
      </div>
      <div className="-mr-2 -mt-2 flex shrink-0">
        <button type="button" onClick={() => setIndex((i) => randomPromptIndex(i))} className="icon-btn" aria-label="Shuffle prompt">
          <Shuffle className="h-4 w-4" />
        </button>
        <button type="button" onClick={hide} className="icon-btn" aria-label="Hide prompt for today">
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
