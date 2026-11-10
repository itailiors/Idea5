import { Eye, Pencil } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MarkdownView } from '../../components/MarkdownView';

export interface NoteEditorHandle {
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  status?: 'idle' | 'saving' | 'saved';
  placeholder?: string;
  minRows?: number;
}

/** Markdown textarea with Write/Preview toggle. Auto-grows; never loses focus on timer events. */
export const NoteEditor = forwardRef<NoteEditorHandle, Props>(function NoteEditor(
  { value, onChange, status = 'idle', placeholder, minRows = 7 },
  ref,
) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setMode('write');
      requestAnimationFrame(() => areaRef.current?.focus({ preventScroll: true }));
    },
  }));

  // Auto-grow to fit content.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, mode]);

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <section className="card p-0">
      <div className="flex items-center justify-between border-b border-stone-100 px-2 py-1.5 dark:border-stone-800">
        <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-medium dark:bg-stone-800" role="tablist">
          {(['write', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 capitalize transition ${
                mode === m ? 'bg-white shadow-sm dark:bg-stone-700' : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {m === 'write' ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {m}
            </button>
          ))}
        </div>
        <div className="px-2 text-xs text-stone-400" aria-live="polite">
          {words} word{words === 1 ? '' : 's'}
          {status === 'saving' && ' · saving…'}
          {status === 'saved' && ' · draft saved'}
        </div>
      </div>
      {mode === 'write' ? (
        <textarea
          ref={areaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={minRows}
          placeholder={placeholder}
          spellCheck
          className="block w-full resize-none rounded-b-2xl bg-transparent px-4 py-3 text-[15px] leading-relaxed placeholder:text-stone-400 focus:outline-none"
          aria-label="Idea notes (Markdown supported)"
        />
      ) : (
        <div className="min-h-[10rem] px-4 py-3">
          <MarkdownView text={value} />
        </div>
      )}
    </section>
  );
});
