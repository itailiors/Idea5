import Dexie, { type Table } from 'dexie';
import { extractTags } from './tags';

export interface Entry {
  id?: number;
  /** Local calendar day, 'YYYY-MM-DD'. One entry per day. */
  date: string;
  createdAt: number;
  updatedAt: number;
  text: string;
  /** Total active brainstorming time across all sessions of the day. */
  durationSec: number;
  starred: boolean;
  tags: string[];
}

/** entryId === 0 means "pending": recorded today but not yet committed with Save. */
export const PENDING_ENTRY_ID = 0;

export interface Clip {
  id?: number;
  entryId: number;
  /** The day the clip belongs to (lets pending clips be attached on Save). */
  date: string;
  blob: Blob;
  mimeType: string;
  durationSec: number;
  createdAt: number;
}

export interface Draft {
  date: string;
  text: string;
  /** Active timer time not yet committed to the entry. */
  elapsedSec: number;
}

export class Idea5DB extends Dexie {
  entries!: Table<Entry, number>;
  clips!: Table<Clip, number>;
  drafts!: Table<Draft, string>;

  constructor(name = 'idea5') {
    super(name);
    this.version(1).stores({
      entries: '++id, &date, updatedAt',
      clips: '++id, entryId, date, createdAt',
      drafts: 'date',
    });
  }
}

export const db = new Idea5DB();

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export async function getDraft(date: string, database = db): Promise<Draft | undefined> {
  return database.drafts.get(date);
}

/**
 * Merge-update a draft (text and elapsed time are written by different parts of the app).
 * A brand-new draft starts from the day's saved entry text, so a timer-only patch can
 * never make an empty draft that later overwrites saved work.
 */
export async function patchDraft(date: string, patch: Partial<Omit<Draft, 'date'>>, database = db) {
  await database.transaction('rw', database.drafts, database.entries, async () => {
    let cur = await database.drafts.get(date);
    if (!cur) {
      const entry = await database.entries.where('date').equals(date).first();
      cur = { date, text: entry?.text ?? '', elapsedSec: 0 };
    }
    await database.drafts.put({ ...cur, ...patch, date });
  });
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export async function getEntryByDate(date: string, database = db) {
  return database.entries.where('date').equals(date).first();
}

export interface SaveDayInput {
  date: string;
  text: string;
  addElapsedSec: number;
}

/**
 * Commit a day's work: upsert the entry, add the session time, attach pending
 * clips and reset the draft's uncommitted timer. Returns the entry id, or null
 * if there was nothing to save.
 */
export async function saveDay({ date, text, addElapsedSec }: SaveDayInput, database = db): Promise<number | null> {
  return database.transaction('rw', database.entries, database.clips, database.drafts, async () => {
    const existing = await database.entries.where('date').equals(date).first();
    const pending = await database.clips
      .where('date')
      .equals(date)
      .filter((c) => c.entryId === PENDING_ENTRY_ID)
      .primaryKeys();

    if (!existing && !text.trim() && pending.length === 0) return null;

    const now = Date.now();
    const add = Math.max(0, Math.round(addElapsedSec));
    let id: number;
    if (existing) {
      id = existing.id!;
      await database.entries.update(id, {
        text,
        tags: extractTags(text),
        durationSec: existing.durationSec + add,
        updatedAt: now,
      });
    } else {
      id = await database.entries.add({
        date,
        text,
        tags: extractTags(text),
        durationSec: add,
        starred: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (pending.length) {
      await database.clips.where('id').anyOf(pending).modify({ entryId: id });
    }
    await database.drafts.put({ date, text, elapsedSec: 0 });
    return id;
  });
}

/** Edit an archived entry (History). Keeps today's draft in sync. */
export async function updateEntry(id: number, patch: { text?: string; starred?: boolean }, database = db) {
  await database.transaction('rw', database.entries, database.drafts, async () => {
    const entry = await database.entries.get(id);
    if (!entry) return;
    const next: Partial<Entry> = { updatedAt: Date.now() };
    if (patch.starred !== undefined) next.starred = patch.starred;
    if (patch.text !== undefined) {
      next.text = patch.text;
      next.tags = extractTags(patch.text);
      const draft = await database.drafts.get(entry.date);
      if (draft) await database.drafts.put({ ...draft, text: patch.text });
    }
    await database.entries.update(id, next);
  });
}

export async function deleteEntry(id: number, database = db) {
  await database.transaction('rw', database.entries, database.clips, database.drafts, async () => {
    const entry = await database.entries.get(id);
    await database.clips.where('entryId').equals(id).delete();
    await database.entries.delete(id);
    if (entry) await database.drafts.delete(entry.date);
  });
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------

export async function addPendingClip(
  date: string,
  blob: Blob,
  mimeType: string,
  durationSec: number,
  database = db,
): Promise<number> {
  return database.clips.add({
    entryId: PENDING_ENTRY_ID,
    date,
    blob,
    mimeType,
    durationSec: Math.round(durationSec),
    createdAt: Date.now(),
  });
}

export async function deleteClip(id: number, database = db) {
  await database.clips.delete(id);
}

// ---------------------------------------------------------------------------
// Recovery: nothing typed or recorded is ever lost
// ---------------------------------------------------------------------------

/**
 * Drafts from previous days (app closed without pressing Save, or used across
 * midnight) are archived into that day's entry if they contain unsaved work.
 */
export async function recoverStaleDrafts(today: string, database = db): Promise<number> {
  const stale = await database.drafts.where('date').below(today).toArray();
  let recovered = 0;
  for (const draft of stale) {
    const existing = await getEntryByDate(draft.date, database);
    const pendingCount = await database.clips
      .where('date')
      .equals(draft.date)
      .filter((c) => c.entryId === PENDING_ENTRY_ID)
      .count();
    const changed = existing
      ? draft.text !== existing.text || pendingCount > 0 || draft.elapsedSec > 0
      : draft.text.trim() !== '' || pendingCount > 0;
    if (changed) {
      const id = await saveDay({ date: draft.date, text: draft.text, addElapsedSec: draft.elapsedSec }, database);
      if (id !== null) recovered++;
    }
    await database.drafts.delete(draft.date);
  }
  return recovered;
}
