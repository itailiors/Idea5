import { useEffect } from 'react';

const BURST = ['💡', '✨', '🔥', '⭐', '💡', '✨', '🚀', '💡'];

interface Props {
  streak: number;
  onDone: () => void;
}

/** Non-blocking celebratory overlay (pointer-events: none so it never steals focus). */
export function Celebration({ streak, onDone }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-live="polite">
      <div className="relative">
        {BURST.map((emoji, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 text-2xl motion-safe:animate-floatUp"
            style={{
              marginLeft: `${Math.cos((i / BURST.length) * Math.PI * 2) * 90 - 12}px`,
              marginTop: `${Math.sin((i / BURST.length) * Math.PI * 2) * 50 - 12}px`,
              animationDelay: `${i * 60}ms`,
            }}
            aria-hidden
          >
            {emoji}
          </span>
        ))}
        <div className="animate-pop rounded-3xl bg-white/95 px-8 py-6 text-center shadow-2xl ring-1 ring-amber-200 dark:bg-stone-900/95 dark:ring-amber-900">
          <div className="text-5xl" aria-hidden>
            🔥
          </div>
          <div className="mt-2 text-2xl font-bold">
            {streak} day{streak === 1 ? '' : 's'}
          </div>
          <div className="text-sm text-stone-500 dark:text-stone-400">Idea saved — keep the streak alive!</div>
        </div>
      </div>
    </div>
  );
}
