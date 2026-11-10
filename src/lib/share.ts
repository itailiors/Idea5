import { formatShortDate } from './dates';

export function formatShareText(text: string, date: string): string {
  return `💡 My idea for ${formatShortDate(date)}\n\n${text.trim()}\n\n— via Idea5`;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(text: string, date: string) {
  window.open(whatsappUrl(formatShareText(text, date)), '_blank', 'noopener,noreferrer');
}

export type ShareResult = 'shared' | 'whatsapp' | 'cancelled';

/**
 * Native share sheet when available (mobile, and attaches audio files where the
 * platform supports it); otherwise falls back to a WhatsApp deep link.
 */
export async function shareIdea(text: string, date: string, files: File[] = []): Promise<ShareResult> {
  const body = formatShareText(text, date);
  if (typeof navigator.share === 'function') {
    const data: ShareData = { title: 'Idea5', text: body };
    if (files.length && navigator.canShare?.({ files })) data.files = files;
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // Any other failure (e.g. not allowed) → fall through to WhatsApp.
    }
  }
  window.open(whatsappUrl(body), '_blank', 'noopener,noreferrer');
  return 'whatsapp';
}
