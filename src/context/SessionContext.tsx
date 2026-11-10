import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getDraft, patchDraft, recoverStaleDrafts, requestPersistentStorage } from '../lib/db';
import { todayKey } from '../lib/dates';
import { vibrate } from '../lib/browser';
import {
  createTimer,
  extendTimer,
  getElapsedMs,
  getRemainingMs,
  pauseTimer,
  startTimer,
  type TimerState,
} from '../lib/timer';

/**
 * Owns the brainstorm session: which day it belongs to and the timer.
 * Lives above the tabs so switching to History/Stats never stops the timer.
 */

const TICK_MS = 250;
const PERSIST_EVERY_MS = 5000;

interface SessionValue {
  ready: boolean;
  sessionDate: string;
  timer: TimerState;
  /** performance.now() at the last tick — drives re-renders while running. */
  now: number;
  running: boolean;
  /** Increments each time the countdown crosses 00:00 (used to replay the pulse). */
  zeroPulse: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  extend: () => void;
  getElapsedSec: () => number;
  /** Called after a successful Save: clears the session timer and rolls to the new day if needed. */
  commitSession: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayKey);
  const [timer, setTimerState] = useState<TimerState>(() => createTimer());
  const [now, setNow] = useState(() => performance.now());
  const [zeroPulse, setZeroPulse] = useState(0);

  const timerRef = useRef(timer);
  const dateRef = useRef(sessionDate);
  const lastRemainingRef = useRef(Infinity);

  const setTimer = useCallback((t: TimerState) => {
    const n = performance.now();
    timerRef.current = t;
    lastRemainingRef.current = getRemainingMs(t, n);
    setTimerState(t);
    setNow(n);
  }, []);

  const getElapsedSec = useCallback(
    () => Math.round(getElapsedMs(timerRef.current, performance.now()) / 1000),
    [],
  );

  const persistElapsed = useCallback(async () => {
    try {
      await patchDraft(dateRef.current, { elapsedSec: getElapsedSec() });
    } catch (err) {
      console.error('Failed to persist timer', err);
    }
  }, [getElapsedSec]);

  const loadDay = useCallback(
    async (date: string) => {
      await recoverStaleDrafts(date);
      const draft = await getDraft(date);
      dateRef.current = date;
      setSessionDate(date);
      setTimer(createTimer((draft?.elapsedSec ?? 0) * 1000));
    },
    [setTimer],
  );

  // Initial load: archive any forgotten drafts from earlier days, restore today's timer.
  useEffect(() => {
    loadDay(todayKey())
      .catch((err) => console.error('Failed to load session', err))
      .finally(() => setReady(true));
    void requestPersistentStorage();
  }, [loadDay]);

  const running = timer.runningSince !== null;

  // Ticking only re-renders; the actual time always comes from timestamps.
  useEffect(() => {
    if (!running) return;
    let lastPersist = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      const remaining = getRemainingMs(timerRef.current, t);
      if (lastRemainingRef.current > 0 && remaining <= 0) {
        // 5-minute milestone: soft signal only. Never blocks input or submits anything.
        setZeroPulse((p) => p + 1);
        vibrate([120, 80, 120]);
      }
      lastRemainingRef.current = remaining;
      if (t - lastPersist >= PERSIST_EVERY_MS) {
        lastPersist = t;
        void persistElapsed();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, persistElapsed]);

  // Persist when backgrounded; roll over to a new day when returning after midnight.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void persistElapsed();
        return;
      }
      setNow(performance.now());
      const t = todayKey();
      if (t !== dateRef.current && timerRef.current.runningSince === null) {
        void loadDay(t);
      }
    };
    const onPageHide = () => void persistElapsed();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [persistElapsed, loadDay]);

  const start = useCallback(() => setTimer(startTimer(timerRef.current, performance.now())), [setTimer]);

  const pause = useCallback(() => {
    setTimer(pauseTimer(timerRef.current, performance.now()));
    void persistElapsed();
  }, [setTimer, persistElapsed]);

  const reset = useCallback(() => {
    setTimer(createTimer());
    void persistElapsed();
  }, [setTimer, persistElapsed]);

  const extend = useCallback(() => setTimer(extendTimer(timerRef.current, performance.now())), [setTimer]);

  const commitSession = useCallback(async () => {
    setTimer(createTimer());
    const t = todayKey();
    if (t !== dateRef.current) await loadDay(t);
  }, [setTimer, loadDay]);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      sessionDate,
      timer,
      now,
      running,
      zeroPulse,
      start,
      pause,
      reset,
      extend,
      getElapsedSec,
      commitSession,
    }),
    [ready, sessionDate, timer, now, running, zeroPulse, start, pause, reset, extend, getElapsedSec, commitSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
