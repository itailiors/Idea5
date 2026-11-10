import { MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { openWhatsApp, shareIdea } from '../lib/share';

interface Props {
  text: string;
  date: string;
  /** Lazily built (only when sharing) — e.g. voice clips as Files. */
  getFiles?: () => File[];
  compact?: boolean;
}

/** Native share sheet (with WhatsApp fallback) + a direct "WhatsApp" shortcut. */
export function ShareButtons({ text, date, getFiles, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const disabled = !text.trim() || busy;
  const supportsNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const onShare = async () => {
    setBusy(true);
    try {
      await shareIdea(text, date, getFiles?.() ?? []);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {supportsNative && (
        <button type="button" className="btn-ghost" onClick={onShare} disabled={disabled} title="Share">
          <Share2 className="h-4 w-4" />
          {!compact && 'Share'}
        </button>
      )}
      <button
        type="button"
        className="btn-ghost"
        onClick={() => openWhatsApp(text, date)}
        disabled={disabled}
        title="Share to WhatsApp"
      >
        <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
        {(!compact || !supportsNative) && 'WhatsApp'}
      </button>
    </>
  );
}
