import { describe, expect, it } from 'vitest';
import { computeStreaks } from './streak';
import { addDays, formatClock, formatDuration } from './dates';
import { extractTags } from './tags';

describe('computeStreaks', () => {
  const today = '2026-11-10';

  it('is zero with no entries', () => {
    expect(computeStreaks([], today)).toEqual({ current: 0, longest: 0 });
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreaks(['2026-11-08', '2026-11-09', '2026-11-10'], today).current).toBe(3);
  });

  it('keeps the streak alive if the last entry was yesterday', () => {
    expect(computeStreaks(['2026-11-08', '2026-11-09'], today).current).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    expect(computeStreaks(['2026-11-07', '2026-11-08'], today).current).toBe(0);
  });

  it('finds the longest run anywhere in history', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-11-10'];
    expect(computeStreaks(dates, today)).toEqual({ current: 1, longest: 4 });
  });

  it('handles month and year boundaries', () => {
    expect(computeStreaks(['2025-12-31', '2026-01-01'], '2026-01-01').current).toBe(2);
    expect(computeStreaks(['2026-02-28', '2026-03-01'], '2026-03-01').current).toBe(2);
  });
});

describe('dates', () => {
  it('adds days across DST and month ends', () => {
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('formats clocks and durations', () => {
    expect(formatClock(312)).toBe('05:12');
    expect(formatClock(3725)).toBe('62:05');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(312)).toBe('5m 12s');
    expect(formatDuration(3900)).toBe('1h 5m');
  });
});

describe('extractTags', () => {
  it('extracts unique lowercase hashtags and ignores headings', () => {
    expect(extractTags('# Heading\nAn app for #Pets and #pets #b2b-saas, see #עברית')).toEqual([
      'pets',
      'b2b-saas',
      'עברית',
    ]);
  });
});
