import { describe, expect, it } from 'vitest';
import { buildBackupZip, parseBackupZip, type BackupData } from './backup';
import { buildDailyReminderIcs, nextOccurrence } from './ics';
import { formatShareText, whatsappUrl } from './share';

const sample: BackupData = {
  entries: [
    {
      id: 1,
      date: '2026-11-09',
      createdAt: 1,
      updatedAt: 2,
      text: 'Idea #one',
      durationSec: 320,
      starred: true,
      tags: ['one'],
    },
  ],
  drafts: [{ date: '2026-11-10', text: 'wip', elapsedSec: 40 }],
  clips: [
    { id: 7, entryId: 1, date: '2026-11-09', mimeType: 'audio/webm;codecs=opus', durationSec: 12, createdAt: 3, bytes: new Uint8Array([1, 2, 3, 250]) },
    { id: 8, entryId: 1, date: '2026-11-09', mimeType: 'audio/mp4', durationSec: 5, createdAt: 4, bytes: new Uint8Array([9, 9]) },
  ],
};

describe('backup zip', () => {
  it('round-trips entries, drafts and raw audio bytes', () => {
    const zip = buildBackupZip(sample, 123);
    const parsed = parseBackupZip(zip);
    expect(parsed.entries).toEqual(sample.entries);
    expect(parsed.drafts).toEqual(sample.drafts);
    expect(parsed.clips).toHaveLength(2);
    expect(Array.from(parsed.clips[0].bytes)).toEqual([1, 2, 3, 250]);
    expect(parsed.clips[1].mimeType).toBe('audio/mp4');
  });

  it('rejects files that are not Idea5 backups', () => {
    expect(() => parseBackupZip(new Uint8Array([1, 2, 3]))).toThrow(/zip/);
  });
});

describe('ics reminder', () => {
  it('creates a daily recurring event at the chosen local time', () => {
    const now = new Date(2026, 10, 10, 8, 0);
    const ics = buildDailyReminderIcs({ hour: 9, minute: 5, url: 'https://idea5.app', now });
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('DTSTART:20261110T090500');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });

  it('schedules for tomorrow if the time already passed today', () => {
    const d = nextOccurrence(7, 0, new Date(2026, 10, 10, 8, 0));
    expect(d.getDate()).toBe(11);
  });
});

describe('share', () => {
  it('builds an encoded WhatsApp link', () => {
    const text = formatShareText('Coffee & code', '2026-11-10');
    expect(text).toContain('Coffee & code');
    expect(whatsappUrl(text)).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(whatsappUrl(text)).toContain('Coffee%20%26%20code');
  });
});
