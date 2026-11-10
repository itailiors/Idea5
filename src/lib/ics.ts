/**
 * Builds a recurring daily calendar event (.ics). Importing it into the phone's
 * calendar gives a reliable daily alarm without needing a push server.
 * DTSTART uses "floating" local time so it rings at the same wall-clock time everywhere.
 */

const pad = (n: number) => String(n).padStart(2, '0');

const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export interface ReminderOptions {
  hour: number;
  minute: number;
  url?: string;
  now?: Date;
}

/** Next occurrence of hh:mm in local time (today if still ahead, else tomorrow). */
export function nextOccurrence(hour: number, minute: number, now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

export function buildDailyReminderIcs({ hour, minute, url, now = new Date() }: ReminderOptions): string {
  const start = nextOccurrence(hour, minute, now);
  const dtStart = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(hour)}${pad(minute)}00`;
  const description = escapeText(
    `Take 5 minutes to brainstorm brand-new ideas.${url ? `\nOpen Idea5: ${url}` : ''}`,
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Idea5//Daily Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:idea5-daily-${now.getTime()}@idea5.app`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${dtStart}`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText('💡 Idea5 — 5 minutes of ideas')}`,
    `DESCRIPTION:${description}`,
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time for your 5-minute idea session',
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
