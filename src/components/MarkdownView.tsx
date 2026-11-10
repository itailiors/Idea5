import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown';

export function MarkdownView({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  if (!text.trim()) {
    return <p className={`text-sm italic text-stone-400 ${className}`}>Nothing written yet.</p>;
  }
  // Safe: renderMarkdown sanitizes with DOMPurify.
  return <div className={`md-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
