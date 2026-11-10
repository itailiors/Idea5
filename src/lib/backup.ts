import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { db, type Clip, type Draft, type Entry } from './db';
import { extForMime } from './audio';

/**
 * Backup format (.zip):
 *   manifest.json        – entries, drafts and clip metadata
 *   audio/<clipId>.<ext> – raw audio bytes (stored uncompressed: already compressed codecs)
 */

export const BACKUP_VERSION = 1;

export interface BackupClipMeta {
  id: number;
  entryId: number;
  date: string;
  mimeType: string;
  durationSec: number;
  createdAt: number;
  file: string;
}

export interface BackupManifest {
  app: 'idea5';
  version: number;
  exportedAt: number;
  entries: Entry[];
  drafts: Draft[];
  clips: BackupClipMeta[];
}

export interface BackupClip extends Omit<BackupClipMeta, 'file'> {
  bytes: Uint8Array;
}

export interface BackupData {
  entries: Entry[];
  drafts: Draft[];
  clips: BackupClip[];
}

export function buildBackupZip(data: BackupData, exportedAt = Date.now()): Uint8Array {
  const files: Zippable = {};
  const clips: BackupClipMeta[] = data.clips.map(({ bytes, ...meta }) => {
    const file = `audio/${meta.id}.${extForMime(meta.mimeType)}`;
    files[file] = [bytes, { level: 0 }];
    return { ...meta, file };
  });
  const manifest: BackupManifest = {
    app: 'idea5',
    version: BACKUP_VERSION,
    exportedAt,
    entries: data.entries,
    drafts: data.drafts,
    clips,
  };
  files['manifest.json'] = [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }];
  return zipSync(files);
}

export function parseBackupZip(bytes: Uint8Array): BackupData {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('This file is not a valid .zip archive.');
  }
  const raw = files['manifest.json'];
  if (!raw) throw new Error('Not an Idea5 backup (manifest.json missing).');

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(strFromU8(raw));
  } catch {
    throw new Error('Backup manifest is corrupted.');
  }
  if (manifest.app !== 'idea5' || !Array.isArray(manifest.entries) || !Array.isArray(manifest.clips)) {
    throw new Error('Not an Idea5 backup.');
  }
  if (manifest.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of Idea5.');
  }

  const clips: BackupClip[] = manifest.clips.map(({ file, ...meta }) => {
    const data = files[file];
    if (!data) throw new Error(`Backup is missing audio file ${file}.`);
    return { ...meta, bytes: data };
  });

  return { entries: manifest.entries, drafts: manifest.drafts ?? [], clips };
}

// ---------------------------------------------------------------------------
// DB glue
// ---------------------------------------------------------------------------

export async function exportBackup(database = db): Promise<Blob> {
  const [entries, drafts, clipRows] = await Promise.all([
    database.entries.toArray(),
    database.drafts.toArray(),
    database.clips.toArray(),
  ]);
  const clips: BackupClip[] = await Promise.all(
    clipRows.map(async (c) => ({
      id: c.id!,
      entryId: c.entryId,
      date: c.date,
      mimeType: c.mimeType,
      durationSec: c.durationSec,
      createdAt: c.createdAt,
      bytes: new Uint8Array(await c.blob.arrayBuffer()),
    })),
  );
  const zip = buildBackupZip({ entries, drafts, clips });
  return new Blob([zip], { type: 'application/zip' });
}

export async function readBackupFile(file: Blob): Promise<BackupData> {
  return parseBackupZip(new Uint8Array(await file.arrayBuffer()));
}

/** Replaces ALL local data with the backup contents (ids preserved, so links stay intact). */
export async function restoreBackup(data: BackupData, database = db): Promise<void> {
  const clips: Clip[] = data.clips.map(({ bytes, ...meta }) => ({
    ...meta,
    blob: new Blob([bytes], { type: meta.mimeType }),
  }));
  await database.transaction('rw', database.entries, database.clips, database.drafts, async () => {
    await Promise.all([database.entries.clear(), database.clips.clear(), database.drafts.clear()]);
    await database.entries.bulkAdd(data.entries);
    await database.clips.bulkAdd(clips);
    await database.drafts.bulkAdd(data.drafts);
  });
}

export function backupFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `idea5-backup-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.zip`;
}
