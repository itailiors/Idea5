/**
 * Pure, timestamp-driven timer model.
 *
 * Instead of decrementing a counter on every tick (which drifts and stalls when
 * browsers throttle background tabs), we store:
 *   - accumulatedMs: active time banked from previous run segments
 *   - runningSince:  performance.now() at the start of the current segment (null = paused)
 *   - targetMs:      the countdown length (5:00 + any "+30s" extensions)
 * Elapsed time is always recomputed from timestamps, so it is exact whenever we look.
 */

export const BASE_MS = 5 * 60 * 1000;
export const EXTEND_MS = 30 * 1000;

export interface TimerState {
  targetMs: number;
  accumulatedMs: number;
  runningSince: number | null;
}

export function createTimer(accumulatedMs = 0, targetMs = BASE_MS): TimerState {
  return { targetMs, accumulatedMs, runningSince: null };
}

export const isRunning = (s: TimerState) => s.runningSince !== null;

export function getElapsedMs(s: TimerState, now: number): number {
  return s.accumulatedMs + (s.runningSince !== null ? Math.max(0, now - s.runningSince) : 0);
}

/** Positive while counting down; negative once in overtime. */
export function getRemainingMs(s: TimerState, now: number): number {
  return s.targetMs - getElapsedMs(s, now);
}

export function startTimer(s: TimerState, now: number): TimerState {
  if (s.runningSince !== null) return s;
  return { ...s, runningSince: now };
}

export function pauseTimer(s: TimerState, now: number): TimerState {
  if (s.runningSince === null) return s;
  return { ...s, accumulatedMs: getElapsedMs(s, now), runningSince: null };
}

/**
 * "+30s": adds time to the countdown. If we're already in overtime, the
 * countdown restarts from 30s (rather than just shaving the overtime).
 */
export function extendTimer(s: TimerState, now: number, ms = EXTEND_MS): TimerState {
  const elapsed = getElapsedMs(s, now);
  return { ...s, targetMs: Math.max(s.targetMs, elapsed) + ms };
}

export interface TimerDisplay {
  label: string;
  overtime: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const mmss = (sec: number) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;

/** Countdown shows ceil seconds (so "00:01" until truly zero); overtime shows "+mm:ss". */
export function formatTimer(remainingMs: number): TimerDisplay {
  if (remainingMs > 0) {
    return { label: mmss(Math.ceil(remainingMs / 1000)), overtime: false };
  }
  return { label: `+${mmss(Math.floor(-remainingMs / 1000))}`, overtime: true };
}
