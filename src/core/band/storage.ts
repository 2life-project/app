import { Directory, File, Paths } from 'expo-file-system';

import { logger } from '@/core/log/logger';

import { toOgg, durationSeconds } from './audio';

/**
 * Записи с браслета на телефоне.
 *
 * Файл хранится в том виде, в каком пришёл — Opus в контейнере Ogg. Час записи
 * занимает семь мегабайт, поэтому чистить хранилище по расписанию не нужно:
 * место освобождается, когда запись выгружена и подтверждена сервером.
 *
 * Имя файла — время начала записи, оно же её идентификатор на устройстве. Так
 * список на телефоне и список на браслете сходятся без отдельной таблицы.
 */

const FOLDER = 'band-recordings';

export type SavedRecording = {
  session: number;
  startedAt: Date;
  uri: string;
  bytes: number;
  seconds: number;
  /** Выгружена ли на сервер. */
  uploaded: boolean;
};

function folder(): Directory {
  const directory = new Directory(Paths.document, FOLDER);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/** Выгруженные помечаются переименованием: отдельный индекс рассинхронизируется. */
function nameOf(session: number, uploaded: boolean): string {
  return `${session}${uploaded ? '.sent' : ''}.ogg`;
}

function parseName(name: string): { session: number; uploaded: boolean } | null {
  const match = /^(\d+)(\.sent)?\.ogg$/.exec(name);
  if (!match?.[1]) return null;
  return { session: Number(match[1]), uploaded: Boolean(match[2]) };
}

/**
 * Сохранить запись. Принимает сырой поток пакетов с устройства и упаковывает
 * его в Ogg — так файл сразу играется и принимается сервисами распознавания.
 */
export function saveRecording(session: number, raw: Uint8Array): SavedRecording {
  const file = new File(folder(), nameOf(session, false));
  if (!file.exists) file.create();
  file.write(toOgg(raw));

  return {
    session,
    startedAt: new Date(session * 1000),
    uri: file.uri,
    bytes: raw.length,
    seconds: durationSeconds(raw.length),
    uploaded: false,
  };
}

/** Что уже лежит на телефоне. */
export function savedRecordings(): SavedRecording[] {
  const items: SavedRecording[] = [];

  for (const entry of folder().list()) {
    if (!(entry instanceof File)) continue;
    const parsed = parseName(entry.name);
    if (!parsed) continue;

    const bytes = entry.size ?? 0;
    items.push({
      session: parsed.session,
      startedAt: new Date(parsed.session * 1000),
      uri: entry.uri,
      bytes,
      seconds: durationSeconds(bytes),
      uploaded: parsed.uploaded,
    });
  }

  return items.sort((a, b) => b.session - a.session);
}

/** Уже сохранённые сессии — чтобы не качать с браслета то, что есть. */
export function savedSessions(): Set<number> {
  return new Set(savedRecordings().map((item) => item.session));
}

export function pendingUploads(): SavedRecording[] {
  return savedRecordings().filter((item) => !item.uploaded);
}

/** Отметить выгруженной. Файл остаётся: его ещё можно послушать. */
export function markUploaded(session: number): void {
  const source = new File(folder(), nameOf(session, false));
  if (!source.exists) return;
  source.move(new File(folder(), nameOf(session, true)));
}

export function removeSaved(session: number): void {
  for (const uploaded of [false, true]) {
    const file = new File(folder(), nameOf(session, uploaded));
    if (file.exists) file.delete();
  }
}

/** Сколько места занято записями. */
export function usedBytes(): number {
  return savedRecordings().reduce((total, item) => total + item.bytes, 0);
}

/**
 * Прочитать файл для отправки. Возвращает undefined, если файла нет: запись
 * могли удалить между составлением очереди и отправкой.
 */
export async function readRecording(session: number): Promise<Uint8Array | undefined> {
  for (const uploaded of [false, true]) {
    const file = new File(folder(), nameOf(session, uploaded));
    if (!file.exists) continue;

    try {
      return new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      logger.warn('band: не удалось прочитать запись', { session, reason: String(error) });
    }
  }

  return undefined;
}
