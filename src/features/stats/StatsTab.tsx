import { Bell, Download, ShieldAlert, ShieldCheck, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStats } from '../../hooks/useStats';
import { formatDuration, todayKey } from '../../lib/dates';
import { backupFileName, exportBackup, readBackupFile, restoreBackup } from '../../lib/backup';
import { buildDailyReminderIcs } from '../../lib/ics';
import { downloadBlob, readPref, writePref } from '../../lib/browser';
import { Heatmap } from './Heatmap';

function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-stone-400">{sub}</div>}
    </div>
  );
}

export function StatsTab() {
  const { entries, streaks, totalIdeas, totalSec, loggedToday } = useStats();
  const today = todayKey();
  const avg = totalIdeas ? totalSec / totalIdeas : 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Stats</h1>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Current streak"
          value={<>🔥 {streaks.current}</>}
          sub={streaks.current > 0 && !loggedToday ? 'Log today to keep it!' : streaks.current === 1 ? 'day' : 'days'}
        />
        <Metric label="Longest streak" value={<>🏆 {streaks.longest}</>} sub={streaks.longest === 1 ? 'day' : 'days'} />
        <Metric label="Ideas logged" value={totalIdeas} sub="days with an idea" />
        <Metric label="Time brainstorming" value={formatDuration(totalSec)} sub={totalIdeas ? `avg ${formatDuration(avg)} / day` : undefined} />
      </div>

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold">Past year</h2>
        <Heatmap entries={entries} today={today} />
      </section>

      <BackupPanel />
      <ReminderPanel />
      <StorageStatus />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature B — Backup & restore
// ---------------------------------------------------------------------------

function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const onExport = async () => {
    setBusy('export');
    setMessage(null);
    try {
      const blob = await exportBackup();
      downloadBlob(blob, backupFileName());
      setMessage({ kind: 'ok', text: `Backup downloaded (${(blob.size / 1024 / 1024).toFixed(1)} MB).` });
    } catch (err) {
      console.error(err);
      setMessage({ kind: 'error', text: 'Export failed.' });
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy('import');
    setMessage(null);
    try {
      const data = await readBackupFile(file);
      const ok = window.confirm(
        `Restore "${file.name}"?\n\nIt contains ${data.entries.length} ideas and ${data.clips.length} voice clips.\n` +
          'This REPLACES all ideas currently on this device.',
      );
      if (!ok) return;
      await restoreBackup(data);
      setMessage({ kind: 'ok', text: 'Backup restored. Reloading…' });
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Import failed.' });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="card flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">Backup & restore</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Your ideas live only on this device. Export a .zip (notes + voice clips) to keep them safe or move to a new phone.
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onExport} disabled={busy !== null}>
          <Download className="h-4 w-4" /> {busy === 'export' ? 'Exporting…' : 'Export'}
        </button>
        <button type="button" className="btn-ghost flex-1" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
          <Upload className="h-4 w-4" /> {busy === 'import' ? 'Importing…' : 'Import'}
        </button>
        <input ref={fileRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {message && (
        <p className={`text-sm ${message.kind === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Feature E — Daily reminder (.ics)
// ---------------------------------------------------------------------------

const REMINDER_KEY = 'idea5.reminderTime';

function ReminderPanel() {
  const [time, setTime] = useState(() => readPref(REMINDER_KEY) ?? '08:00');

  const onDownload = () => {
    const [h, m] = time.split(':').map(Number);
    writePref(REMINDER_KEY, time);
    const ics = buildDailyReminderIcs({ hour: h, minute: m, url: window.location.origin });
    downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'idea5-daily-reminder.ics');
  };

  return (
    <section className="card flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">Daily reminder</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Adds a repeating 5-minute event with an alert to your phone's calendar.
        </p>
      </div>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Reminder time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800"
          />
        </label>
        <button type="button" className="btn-primary flex-1" onClick={onDownload} disabled={!time}>
          <Bell className="h-4 w-4" /> Add to calendar
        </button>
      </div>
    </section>
  );
}

function StorageStatus() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);
  if (persisted === null) return null;
  return (
    <p className="flex items-center gap-1.5 px-1 text-xs text-stone-400">
      {persisted ? <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> : <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
      {persisted
        ? 'Storage is persistent — the browser won’t clear it automatically.'
        : 'The browser may clear storage under pressure. Install the app and export backups regularly.'}
    </p>
  );
}
