import { describe, expect, it } from 'vitest';
import {
  BASE_MS,
  createTimer,
  extendTimer,
  formatTimer,
  getElapsedMs,
  getRemainingMs,
  pauseTimer,
  startTimer,
} from './timer';

describe('timer', () => {
  it('counts elapsed time from timestamps, excluding pauses', () => {
    let t = createTimer();
    t = startTimer(t, 1000);
    expect(getElapsedMs(t, 4000)).toBe(3000);
    t = pauseTimer(t, 4000);
    // 10s paused — must not count
    expect(getElapsedMs(t, 14_000)).toBe(3000);
    t = startTimer(t, 14_000);
    expect(getElapsedMs(t, 16_000)).toBe(5000);
  });

  it('start and pause are idempotent', () => {
    let t = startTimer(createTimer(), 0);
    expect(startTimer(t, 500)).toBe(t);
    t = pauseTimer(t, 1000);
    expect(pauseTimer(t, 2000)).toBe(t);
  });

  it('enters overtime after 5 minutes and keeps counting', () => {
    const t = startTimer(createTimer(), 0);
    expect(formatTimer(getRemainingMs(t, 0)).label).toBe('05:00');
    expect(formatTimer(getRemainingMs(t, 299_001))).toEqual({ label: '00:01', overtime: false });
    expect(formatTimer(getRemainingMs(t, BASE_MS))).toEqual({ label: '+00:00', overtime: true });
    expect(formatTimer(getRemainingMs(t, BASE_MS + 72_000))).toEqual({ label: '+01:12', overtime: true });
  });

  it('+30s adds to the countdown', () => {
    let t = startTimer(createTimer(), 0);
    t = extendTimer(t, 60_000);
    expect(getRemainingMs(t, 60_000)).toBe(BASE_MS + 30_000 - 60_000);
  });

  it('+30s during overtime restarts a 30s countdown', () => {
    let t = startTimer(createTimer(), 0);
    t = extendTimer(t, BASE_MS + 100_000);
    expect(getRemainingMs(t, BASE_MS + 100_000)).toBe(30_000);
  });

  it('restores from a saved elapsed value in paused state', () => {
    const t = createTimer(90_000);
    expect(t.runningSince).toBeNull();
    expect(formatTimer(getRemainingMs(t, 123)).label).toBe('03:30');
  });
});
