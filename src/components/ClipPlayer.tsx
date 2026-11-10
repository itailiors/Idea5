import { Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import type { Clip } from '../lib/db';
import { formatClock } from '../lib/dates';

interface Props {
  clip: Clip;
  index: number;
  pending?: boolean;
  onDelete?: () => void;
}

/** Inline audio preview. Object URLs are revoked on unmount to avoid leaking blobs. */
export function ClipPlayer({ clip, index, pending, onDelete }: Props) {
  const url = useMemo(() => URL.createObjectURL(clip.blob), [clip.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-stone-100 p-2 dark:bg-stone-800">
      <div className="w-14 shrink-0 text-center text-xs text-stone-500 dark:text-stone-400">
        <div className="font-medium text-stone-700 dark:text-stone-200">#{index + 1}</div>
        <div className="font-mono">{formatClock(clip.durationSec)}</div>
      </div>
      <audio controls preload="metadata" src={url} className="h-10 min-w-0 flex-1" />
      {pending && <span className="chip shrink-0">unsaved</span>}
      {onDelete && (
        <button type="button" onClick={onDelete} className="icon-btn shrink-0" aria-label={`Delete voice clip ${index + 1}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
