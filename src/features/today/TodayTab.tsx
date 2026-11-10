import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import {
  PENDING_ENTRY_ID,
  addPendingClip,
  db,
  deleteClip,
  getDraft,
  getEntryByDate,
  patchDraft,
  saveDay,
} from '../../lib/db';
import { formatDuration, formatLongDate, todayKey } from '../../lib/dates';
import { computeStreaks } from '../../lib/streak';
import { extForMime } from '../../lib/audio';
import { getElapsedMs } from '../../lib/timer';
import { ClipPlayer } from '../../components/ClipPlayer';
import { Celebration } from '../../components/Celebration';
import { ShareButtons } from '../../components/ShareButtons';
import { SparkCard } from './SparkCard';
import { TimerPanel } from './TimerPanel';
import { NoteEditor, type NoteEditorHandle } from './NoteEditor';
import { AudioRecorder } from './AudioRecorder';

const AUTOSAVE_MS = 400;

export function TodayTab() {
  const session = useSession();
  const { sessionDate, getElapsedSec, commitSession } = session;

  const [text, setText] = useState('');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saving, setSaving] = useState(false);
  const [celebration, setCelebration] = useState<{ streak: number; key: number } | null>(null);

  const editorRef = useRef<NoteEditorHandle>(null);
  const pendingRef = useRef<{ date: string; text: string } | null>(null);
  const timeoutRef = useRef<number>();
  const dateRef = useRef(sessionDate);
  dateRef.current = sessionDate;

  // null = no entry yet; undefined = still loading.
  const entry = useLiveQuery(async () => (await getEntryByDate(sessionDate)) ?? null, [sessionDate]);
  const clips = useLiveQuery(() => db.clips.where('date').equals(sessionDate).sortBy('createdAt'), [sessionDate]) ?? [];
  const pendingClips = clips.filter((c) => c.entryId === PENDING_ENTRY_ID).length;

  // Load the day's text: unsaved draft first, otherwise the saved entry.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [draft, saved] = await Promise.all([getDraft(sessionDate), getEntryByDate(sessionDate)]);
      if (cancelled) return;
      setText(draft?.text ?? saved?.text ?? '');
      setLoadedFor(sessionDate);
      setDraftStatus('idle');
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionDate]);

  // --- Draft autosave (debounced, flushed on hide/unmount) ---------------------------
  const flush = useCallback(async () => {
    window.clearTimeout(timeoutRef.current);
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    await patchDraft(p.date, { text: p.text });
    setDraftStatus('saved');
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  const onTextChange = (v: string) => {
    setText(v);
    if (loadedFor !== sessionDate) return;
    pendingRef.current = { date: sessionDate, text: v };
    setDraftStatus('saving');
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
  };

  // --- Save -------------------------------------------------------------------------
  const elapsedSec = Math.round(getElapsedMs(session.timer, session.now) / 1000);
  const loaded = loadedFor === sessionDate && entry !== undefined;
  const dirty = loaded && (entry ? text !== entry.text || pendingClips > 0 : text.trim() !== '' || pendingClips > 0);
  const canSave = !saving && (dirty || (!!entry && elapsedSec >= 5));

  const onSave = async () => {
    setSaving(true);
    try {
      await flush();
      const id = await saveDay({ date: sessionDate, text, addElapsedSec: getElapsedSec() });
      if (id === null) return;
      const dates = (await db.entries.orderBy('date').keys()) as string[];
      const { current } = computeStreaks(dates, todayKey());
      await commitSession();
      setCelebration({ streak: current, key: Date.now() });
    } catch (err) {
      console.error(err);
      window.alert('Saving failed. Your draft is still stored on this device.');
    } finally {
      setSaving(false);
    }
  };

  const onClipReady = useCallback(async (blob: Blob, mime: string, durationSec: number) => {
    try {
      await addPendingClip(dateRef.current, blob, mime, durationSec);
    } catch (err) {
      console.error(err);
      window.alert('Could not store the recording (device storage may be full).');
    }
  }, []);

  const onDeleteClip = async (id: number) => {
    if (window.confirm('Delete this voice clip? This cannot be undone.')) await deleteClip(id);
  };

  const getShareFiles = () =>
    clips.map((c, i) => new File([c.blob], `idea5-${sessionDate}-${i + 1}.${extForMime(c.mimeType)}`, { type: c.mimeType }));

  const focusEditorOnStart = () => {
    // Pop the keyboard only on pointer devices; on phones the user may want to record instead.
    if (window.matchMedia('(pointer: fine)').matches) editorRef.current?.focus();
  };

  const endCelebration = useCallback(() => setCelebration(null), []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{formatLongDate(sessionDate)}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {entry
            ? `Logged today · ${formatDuration(entry.durationSec)} total`
            : 'Five minutes. No filter. Every idea counts.'}
        </p>
      </div>

      <SparkCard date={sessionDate} />
      <TimerPanel onStart={focusEditorOnStart} />

      <NoteEditor
        ref={editorRef}
        value={text}
        onChange={onTextChange}
        status={draftStatus}
        placeholder={'Dump every idea — quantity over quality.\n\n- Use **Markdown** for lists and emphasis\n- Add #tags to group ideas'}
      />

      <AudioRecorder onClipReady={onClipReady} />

      {clips.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Voice notes">
          {clips.map((c, i) => (
            <ClipPlayer key={c.id} clip={c} index={i} pending={c.entryId === PENDING_ENTRY_ID} onDelete={() => onDeleteClip(c.id!)} />
          ))}
        </section>
      )}

      <div className="sticky bottom-20 z-10 -mx-1 flex gap-2 rounded-2xl bg-stone-50/90 p-1 backdrop-blur dark:bg-stone-900/90">
        <ShareButtons text={text} date={sessionDate} getFiles={getShareFiles} compact />
        <button type="button" onClick={onSave} disabled={!canSave} className="btn-primary flex-1">
          {!canSave && entry && !saving ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : entry ? 'Update idea' : 'Save idea'}
            </>
          )}
        </button>
      </div>

      {celebration && <Celebration key={celebration.key} streak={celebration.streak} onDone={endCelebration} />}
    </div>
  );
}
