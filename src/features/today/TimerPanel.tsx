import { Pause, Play, RotateCcw } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { formatTimer, getElapsedMs, getRemainingMs } from '../../lib/timer';
import { formatDuration } from '../../lib/dates';

const SIZE = 220;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/**
 * The countdown ring. Hitting 00:00 only triggers a soft glow + vibration and
 * switches to a muted overtime counter — it never touches the editor or recorder.
 */
export function TimerPanel({ onStart }: { onStart?: () => void }) {
  const { timer, now, running, zeroPulse, start, pause, reset, extend } = useSession();

  const remaining = getRemainingMs(timer, now);
  const elapsedMs = getElapsedMs(timer, now);
  const { label, overtime } = formatTimer(remaining);
  const fraction = overtime ? 1 : Math.min(1, Math.max(0, remaining / timer.targetMs));
  const untouched = elapsedMs === 0 && !running;

  const handleToggle = () => {
    if (running) pause();
    else {
      start();
      onStart?.();
    }
  };

  const handleReset = () => {
    if (elapsedMs >= 60_000 && !window.confirm('Reset the timer? Unsaved session time will be discarded.')) return;
    reset();
  };

  return (
    <section className="card flex flex-col items-center gap-4 py-6" aria-label="5-minute timer">
      <div key={zeroPulse} className={`relative ${zeroPulse > 0 ? 'motion-safe:animate-glow' : ''}`}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-stone-200 dark:stroke-stone-800" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fraction)}
            className={`transition-[stroke-dashoffset] duration-300 ease-linear ${
              overtime ? 'stroke-stone-400/60 dark:stroke-stone-600' : 'stroke-accent'
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono text-5xl font-semibold tabular-nums tracking-tight ${
              overtime ? 'text-stone-400 dark:text-stone-500' : ''
            }`}
            role="timer"
            aria-live="off"
          >
            {label}
          </span>
          <span className="mt-1 text-xs uppercase tracking-widest text-stone-400">
            {overtime ? 'overtime' : running ? 'brainstorming' : untouched ? 'ready' : 'paused'}
          </span>
        </div>
      </div>

      <p className="h-5 text-sm text-stone-500 dark:text-stone-400" aria-live="polite">
        {overtime ? '✓ 5-minute milestone — keep going if you like' : elapsedMs > 0 ? `Session: ${formatDuration(elapsedMs / 1000)}` : ''}
      </p>

      <div className="flex items-center gap-5">
        <button type="button" onClick={handleReset} disabled={untouched} className="icon-btn h-12 w-12 disabled:opacity-30" aria-label="Reset timer">
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-stone-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-400 active:scale-95"
          aria-label={running ? 'Pause timer' : 'Start timer'}
        >
          {running ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="ml-1 h-7 w-7" fill="currentColor" />}
        </button>
        <button
          type="button"
          onClick={extend}
          className="h-12 w-12 rounded-full text-sm font-semibold text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          aria-label="Add 30 seconds"
        >
          +30s
        </button>
      </div>
    </section>
  );
}
