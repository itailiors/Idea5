import { useEffect, useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import { StreakBadge } from './components/StreakBadge';
import { TodayTab } from './features/today/TodayTab';
import { HistoryTab } from './features/history/HistoryTab';
import { StatsTab } from './features/stats/StatsTab';
import { useSession } from './context/SessionContext';
import { readPref, writePref } from './lib/browser';

const TAB_KEY = 'idea5.tab';
const isTab = (v: string | null): v is Tab => v === 'today' || v === 'history' || v === 'stats';

export default function App() {
  const { ready } = useSession();
  const [tab, setTab] = useState<Tab>(() => {
    const saved = readPref(TAB_KEY);
    return isTab(saved) ? saved : 'today';
  });

  useEffect(() => {
    writePref(TAB_KEY, tab);
    window.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-stone-50 sm:border-x sm:border-stone-200 dark:bg-stone-900 sm:dark:border-stone-800">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/70 bg-stone-50/90 px-4 py-3 backdrop-blur dark:border-stone-800/70 dark:bg-stone-900/90">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">Idea5</span>
        </div>
        <StreakBadge />
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        {!ready ? (
          <div className="flex h-64 items-center justify-center text-sm text-stone-400">Loading…</div>
        ) : tab === 'today' ? (
          <TodayTab />
        ) : tab === 'history' ? (
          <HistoryTab />
        ) : (
          <StatsTab />
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
