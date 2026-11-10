import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Idea5DB,
  PENDING_ENTRY_ID,
  addPendingClip,
  deleteEntry,
  getEntryByDate,
  patchDraft,
  recoverStaleDrafts,
  saveDay,
  updateEntry,
} from './db';

let database: Idea5DB;
let n = 0;

beforeEach(async () => {
  database = new Idea5DB(`test-${n++}`);
  await database.open();
});

const blob = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

describe('saveDay', () => {
  it('does nothing when there is no text and no audio', async () => {
    expect(await saveDay({ date: '2026-11-10', text: '  ', addElapsedSec: 30 }, database)).toBeNull();
    expect(await database.entries.count()).toBe(0);
  });

  it('creates one entry per day and accumulates time across sessions', async () => {
    const id1 = await saveDay({ date: '2026-11-10', text: 'first #idea', addElapsedSec: 300 }, database);
    const id2 = await saveDay({ date: '2026-11-10', text: 'first #idea\nsecond', addElapsedSec: 45 }, database);
    expect(id1).toBe(id2);
    const e = await getEntryByDate('2026-11-10', database);
    expect(e?.durationSec).toBe(345);
    expect(e?.tags).toEqual(['idea']);
    expect(e?.text).toContain('second');
    expect((await database.drafts.get('2026-11-10'))?.elapsedSec).toBe(0);
  });

  it('attaches pending clips of that day on save, and saves audio-only entries', async () => {
    await addPendingClip('2026-11-10', blob(), 'audio/webm', 4, database);
    await addPendingClip('2026-11-09', blob(), 'audio/webm', 4, database);
    const id = await saveDay({ date: '2026-11-10', text: '', addElapsedSec: 10 }, database);
    expect(id).not.toBeNull();
    const clips = await database.clips.toArray();
    expect(clips.find((c) => c.date === '2026-11-10')?.entryId).toBe(id);
    expect(clips.find((c) => c.date === '2026-11-09')?.entryId).toBe(PENDING_ENTRY_ID);
  });
});

describe('recoverStaleDrafts', () => {
  it('archives unsaved work from previous days and clears old drafts', async () => {
    await patchDraft('2026-11-08', { text: 'forgot to save', elapsedSec: 120 }, database);
    await patchDraft('2026-11-09', { text: '', elapsedSec: 0 }, database);
    await patchDraft('2026-11-10', { text: 'today', elapsedSec: 5 }, database);

    expect(await recoverStaleDrafts('2026-11-10', database)).toBe(1);
    expect((await getEntryByDate('2026-11-08', database))?.durationSec).toBe(120);
    expect(await getEntryByDate('2026-11-09', database)).toBeUndefined();
    expect(await database.drafts.toCollection().primaryKeys()).toEqual(['2026-11-10']);
  });

  it('does not touch an already-saved day whose draft is unchanged', async () => {
    await saveDay({ date: '2026-11-09', text: 'done', addElapsedSec: 300 }, database);
    const before = await getEntryByDate('2026-11-09', database);
    expect(await recoverStaleDrafts('2026-11-10', database)).toBe(0);
    expect((await getEntryByDate('2026-11-09', database))?.updatedAt).toBe(before?.updatedAt);
  });
});

describe('updateEntry / deleteEntry', () => {
  it('re-extracts tags, syncs the draft and deletes clips with the entry', async () => {
    await addPendingClip('2026-11-10', blob(), 'audio/webm', 4, database);
    const id = (await saveDay({ date: '2026-11-10', text: 'a', addElapsedSec: 1 }, database))!;
    await updateEntry(id, { text: 'b #new', starred: true }, database);
    const e = await database.entries.get(id);
    expect(e).toMatchObject({ text: 'b #new', tags: ['new'], starred: true });
    expect((await database.drafts.get('2026-11-10'))?.text).toBe('b #new');

    await deleteEntry(id, database);
    expect(await database.entries.count()).toBe(0);
    expect(await database.clips.count()).toBe(0);
  });
});
