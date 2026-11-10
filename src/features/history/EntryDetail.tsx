import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { MarkdownView } from '../../components/MarkdownView';
import { ClipPlayer } from '../../components/ClipPlayer';
import { ShareButtons } from '../../components/ShareButtons';
import { db, deleteClip, deleteEntry, updateEntry } from '../../lib/db';
import { formatDuration, formatLongDate } from '../../lib/dates';
import { extForMime } from '../../lib/audio';

export function EntryDetail({ entryId, onClose }: { entryId: number; onClose: () => void }) {
  const entry = useLiveQuery(async () => (await db.entries.get(entryId)) ?? null, [entryId]);
  const clips = useLiveQuery(() => db.clips.where('entryId').equals(entryId).sortBy('createdAt'), [entryId]) ?? [];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (entry === null) onClose(); // deleted
  }, [entry, onClose]);

  const close = useCallback(() => {
    if (editing && entry && draft !== entry.text && !window.confirm('Discard your unsaved edits?')) return;
    onClose();
  }, [editing, entry, draft, onClose]);

  if (!entry) return null;

  const startEdit = () => {
    setDraft(entry.text);
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateEntry(entryId, { text: draft });
    setEditing(false);
  };

  const remove = async () => {
    if (window.confirm(`Delete the idea from ${formatLongDate(entry.date)} and its voice clips? This cannot be undone.`)) {
      await deleteEntry(entryId);
      onClose();
    }
  };

  const getFiles = () =>
    clips.map((c, i) => new File([c.blob], `idea5-${entry.date}-${i + 1}.${extForMime(c.mimeType)}`, { type: c.mimeType }));

  return (
    <Sheet
      open
      onClose={close}
      title={formatLongDate(entry.date)}
      actions={
        <button
          type="button"
          onClick={() => updateEntry(entryId, { starred: !entry.starred })}
          className={`icon-btn ${entry.starred ? 'text-amber-500 dark:text-amber-400' : ''}`}
          aria-pressed={entry.starred}
          aria-label={entry.starred ? 'Unstar idea' : 'Star idea'}
        >
          <Star className="h-5 w-5" fill={entry.starred ? 'currentColor' : 'none'} />
        </button>
      }
      footer={
        editing ? (
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary flex-1" onClick={saveEdit}>
              Save changes
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn-danger px-3" onClick={remove} aria-label="Delete idea">
              <Trash2 className="h-4 w-4" />
            </button>
            <button type="button" className="btn-ghost" onClick={startEdit}>
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <div className="ml-auto flex gap-2">
              <ShareButtons text={entry.text} date={entry.date} getFiles={getFiles} compact />
            </div>
          </div>
        )
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span>⏱ {formatDuration(entry.durationSec)}</span>
        {entry.tags.map((t) => (
          <span key={t} className="chip">
            #{t}
          </span>
        ))}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          autoFocus
          className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-[15px] leading-relaxed focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800"
          aria-label="Edit idea notes"
        />
      ) : (
        <MarkdownView text={entry.text} />
      )}

      {clips.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Voice notes</h3>
          {clips.map((c, i) => (
            <ClipPlayer
              key={c.id}
              clip={c}
              index={i}
              onDelete={async () => {
                if (window.confirm('Delete this voice clip? This cannot be undone.')) await deleteClip(c.id!);
              }}
            />
          ))}
        </div>
      )}
    </Sheet>
  );
}
