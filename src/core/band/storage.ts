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
  /** Длина исходного потока с устройства: из неё считается длительность. */
  bytes: number;
  /** Размер файла на диске: он больше на служебные данные Ogg. */
  fileBytes: number;
  seconds: number;
  /** Выгружена ли на сервер. */
  uploaded: boolean;
};

function folder(): Directory {
  const directory = new Directory(Paths.document, FOLDER);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/**
 * Имя несёт длину исходного потока, а не только номер сессии.
 *
 * Длительность считается из сырых байт с устройства: ровно две тысячи в
 * секунду. Размер файла на диске для этого не годится — упаковка в Ogg
 * добавляет служебные страницы и по несколько десятков байт на каждую секунду
 * звука, и посчитанная из него длительность завышена на несколько процентов.
 * Восстановить исходную длину из файла нельзя, поэтому она в имени.
 *
 * Выгруженные помечаются переименованием: отдельный индекс рассинхронизируется.
 */
function nameOf(session: number, rawBytes: number, uploaded: boolean): string {
  return `${session}.${rawBytes}${uploaded ? '.sent' : ''}.ogg`;
}

function parseName(name: string): { session: number; rawBytes: number; uploaded: boolean } | null {
  const match = /^(\d+)\.(\d+)(\.sent)?\.ogg$/.exec(name);
  if (!match?.[1] || !match[2]) return null;
  return {
    session: Number(match[1]),
    rawBytes: Number(match[2]),
    uploaded: Boolean(match[3]),
  };
}

/**
 * Сохранить запись. Принимает сырой поток пакетов с устройства и упаковывает
 * его в Ogg — так файл сразу играется и принимается сервисами распознавания.
 */
export function saveRecording(session: number, raw: Uint8Array): SavedRecording {
  const file = new File(folder(), nameOf(session, raw.length, false));
  if (!file.exists) file.create();
  file.write(toOgg(raw));

  return {
    session,
    startedAt: new Date(session * 1000),
    uri: file.uri,
    bytes: raw.length,
    fileBytes: file.size ?? 0,
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

    items.push({
      session: parsed.session,
      startedAt: new Date(parsed.session * 1000),
      uri: entry.uri,
      bytes: parsed.rawBytes,
      fileBytes: entry.size ?? 0,
      seconds: durationSeconds(parsed.rawBytes),
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

/**
 * Найти файл сессии. Перебором, а не сборкой имени: в имени лежит ещё и длина
 * исходного потока, и вызывающий её не знает.
 */
function fileOf(session: number): File | null {
  for (const entry of folder().list()) {
    if (!(entry instanceof File)) continue;
    if (parseName(entry.name)?.session === session) return entry;
  }
  return null;
}

/** Отметить выгруженной. Файл остаётся: его ещё можно послушать. */
export function markUploaded(session: number): void {
  const source = fileOf(session);
  const parsed = source ? parseName(source.name) : null;
  if (!source || !parsed || parsed.uploaded) return;

  source.move(new File(folder(), nameOf(session, parsed.rawBytes, true)));
}

export function removeSaved(session: number): void {
  fileOf(session)?.delete();
}

/** Сколько места записи занимают на диске. */
export function usedBytes(): number {
  return savedRecordings().reduce((total, item) => total + item.fileBytes, 0);
}

/**
 * Прочитать файл для отправки. Возвращает undefined, если файла нет: запись
 * могли удалить между составлением очереди и отправкой.
 */
export async function readRecording(session: number): Promise<Uint8Array | undefined> {
  const file = fileOf(session);
  if (file) {
    try {
      return new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      logger.warn('band: не удалось прочитать запись', { session, reason: String(error) });
    }
  }

  return undefined;
}
