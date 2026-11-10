import { Activity, History, Lightbulb, type LucideIcon } from 'lucide-react';
import { useSession } from '../context/SessionContext';

export type Tab = 'today' | 'history' | 'stats';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: Lightbulb },
  { id: 'history', label: 'History', icon: History },
  { id: 'stats', label: 'Stats', icon: Activity },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { running } = useSession();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-stone-200 bg-white/95 backdrop-blur sm:border-x dark:border-stone-800 dark:bg-stone-900/95">
      <ul className="grid grid-cols-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                  active ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {label}
                {id === 'today' && running && !active && (
                  <span className="absolute right-[34%] top-2 h-2 w-2 animate-pulse rounded-full bg-accent" aria-label="Timer running" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
